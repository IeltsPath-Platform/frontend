import { useEffect, useRef, useState } from 'react'
import { Image, Video, X, UploadCloud, Link as LinkIcon, Plus, Loader2 } from 'lucide-react'
import { communityApi, getMediaUploadErrorMessage } from '../api/communityApi'
import { safeVideoEmbed } from '../utils/communityFormat'

export interface ComposerMediaPanelProps {
  imageUrls: string[]
  onUpdateImageUrls: (urls: string[]) => void
  videoUrl: string
  onUpdateVideoUrl: (url: string) => void
  onClose: () => void
  defaultMediaType?: 'IMAGE' | 'VIDEO'
  defaultSourceTab?: 'upload' | 'url'
  onUploadingChange?: (uploading: boolean) => void
}

const ALLOWED_IMAGE_HOSTS = ['images.unsplash.com', 'i.imgur.com', 'supabase.co']
const ALLOWED_VIDEO_HOSTS = ['youtube.com', 'youtu.be', 'www.youtube.com', 'loom.com', 'www.loom.com', 'drive.google.com']
const IMAGE_ACCEPT = 'image/jpeg,image/png,image/webp,image/gif'

type UploadItem = {
  id: number
  file: File
  type: 'IMAGE'
  status: 'pending' | 'uploading' | 'done' | 'error' | 'cancelled'
  progress: number
  url?: string
  error?: string
  fallback?: boolean
}

function isAbort(error: unknown) {
  return error instanceof DOMException && error.name === 'AbortError'
}

export function ComposerMediaPanel({
  imageUrls,
  onUpdateImageUrls,
  videoUrl,
  onUpdateVideoUrl,
  onClose,
  defaultMediaType = 'IMAGE',
  defaultSourceTab = 'url',
  onUploadingChange,
}: ComposerMediaPanelProps) {
  const [sourceTab, setSourceTab] = useState<'upload' | 'url'>(defaultSourceTab)
  const [mediaType, setMediaType] = useState<'IMAGE' | 'VIDEO'>(defaultMediaType)
  // Videos are never uploaded: they can only be attached as an HTTPS link.
  const activeSource = mediaType === 'VIDEO' ? 'url' : sourceTab
  const [urlInput, setUrlInput] = useState('')
  const [error, setError] = useState('')
  const [items, setItems] = useState<UploadItem[]>([])
  const [isDragging, setIsDragging] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const controllers = useRef(new Map<number, AbortController>())
  const cancelledIds = useRef(new Set<number>())
  const nextId = useRef(0)
  const activeBatch = useRef(false)
  const imageUrlsRef = useRef(imageUrls)
  useEffect(() => { imageUrlsRef.current = imageUrls }, [imageUrls])

  const uploading = items.some((item) => item.status === 'pending' || item.status === 'uploading')
  useEffect(() => onUploadingChange?.(uploading), [onUploadingChange, uploading])
  useEffect(() => () => controllers.current.forEach((controller) => controller.abort()), [])

  const handleAddUrl = (e?: React.FormEvent) => {
    e?.preventDefault()
    setError('')
    const trimmed = urlInput.trim()
    if (!trimmed) return
    if (trimmed.length > 500) {
      setError('Đường dẫn media tối đa 500 ký tự.')
      return
    }
    let parsed: URL
    try {
      parsed = new URL(trimmed)
      if (parsed.protocol !== 'https:') {
        setError('Đường dẫn phải bắt đầu bằng https://')
        return
      }
    } catch {
      setError('Đường dẫn URL không hợp lệ.')
      return
    }
    if (mediaType === 'IMAGE') {
      if (imageUrls.length >= 4) return setError('Bạn chỉ được đính kèm tối đa 4 hình ảnh.')
      const hostAllowed = ALLOWED_IMAGE_HOSTS.some((host) => parsed.hostname === host || parsed.hostname.endsWith(`.${host}`))
      if (!hostAllowed) return setError('Chỉ chấp nhận ảnh từ images.unsplash.com, i.imgur.com hoặc kho media đã tải lên.')
      if (imageUrls.includes(trimmed)) return setError('Ảnh này đã được thêm vào danh sách.')
      onUpdateImageUrls([...imageUrls, trimmed])
    } else {
      const hostAllowed = ALLOWED_VIDEO_HOSTS.some((host) => parsed.hostname === host || parsed.hostname.endsWith(`.${host}`))
      if (!hostAllowed) return setError('Chỉ chấp nhận video từ YouTube, Loom hoặc Google Drive.')
      onUpdateVideoUrl(trimmed)
    }
    setUrlInput('')
  }

  const runUploads = async (files: File[]) => {
    if (activeBatch.current || !files.length) {
      if (activeBatch.current) setError('Vui lòng chờ lượt tải hiện tại hoàn tất trước khi chọn thêm tệp.')
      return
    }
    setError('')
    const type = 'IMAGE' as const
    const capacity = 4 - imageUrlsRef.current.length
    if (capacity <= 0) {
      setError('Bạn chỉ được đính kèm tối đa 4 hình ảnh.')
      return
    }
    const candidates = files.slice(0, capacity)
    const created = candidates.map((file) => ({
      id: ++nextId.current,
      file,
      type,
      status: 'pending' as const,
      progress: 0,
    }))
    setItems((current) => [...current, ...created])
    if (files.length > capacity) setError('Bạn chỉ được đính kèm tối đa 4 hình ảnh.')
    activeBatch.current = true
    let index = 0
    const worker = async () => {
      while (index < created.length) {
        const item = created[index++]
        if (cancelledIds.current.has(item.id)) {
          setItems((current) => current.map((entry) => entry.id === item.id ? { ...entry, status: 'cancelled' } : entry))
          continue
        }
        const controller = new AbortController()
        controllers.current.set(item.id, controller)
        setItems((current) => current.map((entry) => entry.id === item.id ? { ...entry, status: 'uploading' } : entry))
        try {
          const result = await communityApi.uploadImage(item.file, controller.signal)
          if (controller.signal.aborted) {
            setItems((current) => current.map((entry) => entry.id === item.id ? { ...entry, status: 'cancelled' } : entry))
            continue
          }
          setItems((current) => current.map((entry) => entry.id === item.id ? { ...entry, status: 'done', progress: 100, url: result.url } : entry))
          const nextUrls = imageUrlsRef.current.includes(result.url) ? imageUrlsRef.current : [...imageUrlsRef.current, result.url]
          imageUrlsRef.current = nextUrls
          onUpdateImageUrls(nextUrls)
        } catch (cause) {
          if (isAbort(cause)) {
            setItems((current) => current.map((entry) => entry.id === item.id ? { ...entry, status: 'cancelled' } : entry))
          } else {
            const message = getMediaUploadErrorMessage(cause)
            const fallback = message.startsWith('Tải tệp từ máy tạm thời chưa khả dụng')
            setItems((current) => current.map((entry) => entry.id === item.id ? { ...entry, status: 'error', error: message, fallback } : entry))
          }
        } finally {
          controllers.current.delete(item.id)
        }
      }
    }
    await Promise.all(Array.from({ length: Math.min(2, created.length) }, worker))
    activeBatch.current = false
  }

  const handleFiles = (fileList: FileList | null) => {
    if (!fileList) return
    void runUploads(Array.from(fileList))
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const handleRemoveImage = (indexToRemove: number) => onUpdateImageUrls(imageUrls.filter((_, index) => index !== indexToRemove))
  const handleRemoveVideo = () => onUpdateVideoUrl('')
  const cancelUpload = (id: number) => {
    cancelledIds.current.add(id)
    controllers.current.get(id)?.abort()
  }
  const removeUploadedItem = (item: UploadItem) => {
    if (item.url) onUpdateImageUrls(imageUrls.filter((url) => url !== item.url))
    setItems((current) => current.filter((entry) => entry.id !== item.id))
  }

  const renderAttachedMedia = () => (
    <>
      {mediaType === 'IMAGE' && imageUrls.length > 0 && (
        <div className="composer-image-previews">
          {imageUrls.map((url, index) => (
            <div key={url} className="composer-preview-item">
              <img src={url} alt={`Ảnh đính kèm ${index + 1}`} loading="lazy" />
              <button type="button" onClick={() => handleRemoveImage(index)} className="composer-remove-preview-btn" aria-label={`Xóa ảnh ${index + 1}`}><X size={14} /></button>
            </div>
          ))}
        </div>
      )}
      {mediaType === 'VIDEO' && videoUrl && (
        <div className="composer-video-preview">
          {safeVideoEmbed(videoUrl) ? <iframe src={safeVideoEmbed(videoUrl) ?? undefined} title="Video đính kèm" loading="lazy" sandbox="allow-scripts allow-same-origin allow-presentation" /> : <video src={videoUrl} controls preload="metadata" aria-label="Video đính kèm" />}
          <button type="button" onClick={handleRemoveVideo} className="composer-remove-preview-btn composer-remove-video" aria-label="Xóa video"><X size={14} /></button>
        </div>
      )}
    </>
  )

  return (
    <section className="composer-media-panel" aria-label="Đính kèm ảnh và video">
      <div className="composer-media-header">
        <div className="composer-media-type-tabs" role="tablist" aria-label="Loại tệp">
          <button type="button" role="tab" aria-selected={mediaType === 'IMAGE'} className={`composer-media-tab ${mediaType === 'IMAGE' ? 'is-active' : ''}`} onClick={() => { setMediaType('IMAGE'); setError('') }}><Image size={16} /><span>Ảnh ({imageUrls.length}/4)</span></button>
          <button type="button" role="tab" aria-selected={mediaType === 'VIDEO'} className={`composer-media-tab ${mediaType === 'VIDEO' ? 'is-active' : ''}`} onClick={() => { setMediaType('VIDEO'); setError('') }}><Video size={16} /><span>Video {videoUrl ? '(1/1)' : '(0/1)'}</span></button>
        </div>
        <button type="button" className="composer-media-close" onClick={onClose} aria-label="Đóng bảng đính kèm media"><X size={16} /></button>
      </div>

      {mediaType === 'IMAGE' && <div className="composer-media-source-tabs" role="tablist" aria-label="Nguồn tệp">
        <button type="button" role="tab" aria-selected={sourceTab === 'upload'} className={`composer-source-tab ${sourceTab === 'upload' ? 'is-active' : ''}`} onClick={() => setSourceTab('upload')}><UploadCloud size={15} /><span>Từ máy tính</span></button>
        <button type="button" role="tab" aria-selected={sourceTab === 'url'} className={`composer-source-tab ${sourceTab === 'url' ? 'is-active' : ''}`} onClick={() => setSourceTab('url')}><LinkIcon size={15} /><span>Nhập URL</span></button>
      </div>}

      {activeSource === 'upload' && (
        <div className="composer-upload-area">
          <input ref={fileInputRef} id="composer-media-file" className="composer-file-input" type="file" accept={IMAGE_ACCEPT} multiple disabled={uploading} aria-label="Chọn ảnh từ máy tính" onChange={(event) => handleFiles(event.currentTarget.files)} />
          <label htmlFor="composer-media-file" className={`composer-dropzone ${isDragging ? 'is-dragging' : ''}`} tabIndex={uploading ? -1 : 0} aria-disabled={uploading} onKeyDown={(event) => { if (!uploading && (event.key === 'Enter' || event.key === ' ')) { event.preventDefault(); fileInputRef.current?.click() } }} onDragOver={(event) => { event.preventDefault(); if (!uploading) setIsDragging(true) }} onDragLeave={() => setIsDragging(false)} onDrop={(event) => { event.preventDefault(); setIsDragging(false); handleFiles(event.dataTransfer.files) }}>
            <UploadCloud size={32} className="composer-upload-icon" />
            <span className="composer-upload-title">Kéo thả ảnh vào đây hoặc chọn từ máy</span>
            <span className="composer-upload-desc">JPG, PNG, WebP, GIF · tối đa 5 MB mỗi ảnh · tối đa 4 ảnh</span>
            <span className="composer-upload-btn">Chọn ảnh</span>
          </label>
          {error && <p className="composer-media-error" role="alert">{error}</p>}
          {items.filter((item) => item.type === mediaType).map((item) => (
            <div key={item.id} className="composer-upload-item">
              <span className="composer-upload-file-name">{item.file.name}</span>
              {item.status === 'uploading' || item.status === 'pending' ? <><span role="status">{item.status === 'pending' ? 'Đang chờ' : <><Loader2 size={14} className="composer-upload-spinner" /> Đang tải…</>}</span><progress aria-label={`Tiến trình tải ${item.file.name}`} max="100" /><button type="button" onClick={() => cancelUpload(item.id)} aria-label={`Hủy tải ${item.file.name}`}>Hủy</button></> : null}
              {item.status === 'done' && <><span role="status">Đã tải xong</span><button type="button" onClick={() => removeUploadedItem(item)} aria-label={`Xóa ${item.file.name}`}><X size={15} /></button></>}
              {item.status === 'cancelled' && <span role="status">Đã hủy</span>}
              {item.status === 'error' && <div role="alert" className="composer-upload-error">{item.error}{item.fallback && <> <button type="button" onClick={() => setSourceTab('url')}>Chuyển sang tab Nhập URL</button></>}</div>}
            </div>
          ))}
          {renderAttachedMedia()}
        </div>
      )}

      {activeSource === 'url' && (
        <div className="composer-url-area">
          <div className="composer-url-form">
            <input type="url" value={urlInput} aria-label="Đường dẫn media" onChange={(event) => { setUrlInput(event.target.value); if (error) setError('') }} onKeyDown={(event) => { if (event.key === 'Enter') { event.preventDefault(); handleAddUrl() } }} placeholder={mediaType === 'IMAGE' ? 'Dán URL ảnh HTTPS (images.unsplash.com, i.imgur.com)' : 'Dán URL video HTTPS (YouTube, Loom, Google Drive)'} maxLength={500} className="composer-url-input" />
            <button type="button" onClick={() => handleAddUrl()} className="composer-url-add-btn" disabled={!urlInput.trim() || (mediaType === 'IMAGE' && imageUrls.length >= 4) || (mediaType === 'VIDEO' && Boolean(videoUrl))}><Plus size={16} /><span>Thêm</span></button>
          </div>
          {error && <p className="composer-media-error" role="alert">{error}</p>}
          {renderAttachedMedia()}
        </div>
      )}
      {uploading && <span className="sr-only" role="status"><Loader2 size={1} />Đang tải tệp lên</span>}
    </section>
  )
}
