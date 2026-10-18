import { useState } from 'react'
import { Image, Video, X, UploadCloud, Link as LinkIcon, Plus } from 'lucide-react'
import { safeVideoEmbed } from '../utils/communityFormat'

export interface ComposerMediaPanelProps {
  imageUrls: string[]
  onUpdateImageUrls: (urls: string[]) => void
  videoUrl: string
  onUpdateVideoUrl: (url: string) => void
  onClose: () => void
  defaultMediaType?: 'IMAGE' | 'VIDEO'
}

const ALLOWED_IMAGE_HOSTS = ['images.unsplash.com', 'i.imgur.com']
const ALLOWED_VIDEO_HOSTS = ['youtube.com', 'youtu.be', 'www.youtube.com', 'loom.com', 'www.loom.com', 'drive.google.com']

export function ComposerMediaPanel({
  imageUrls,
  onUpdateImageUrls,
  videoUrl,
  onUpdateVideoUrl,
  onClose,
  defaultMediaType = 'IMAGE',
}: ComposerMediaPanelProps) {
  const [sourceTab, setSourceTab] = useState<'upload' | 'url'>('url')
  const [mediaType, setMediaType] = useState<'IMAGE' | 'VIDEO'>(defaultMediaType)
  const [urlInput, setUrlInput] = useState('')
  const [error, setError] = useState('')

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
      if (imageUrls.length >= 4) {
        setError('Bạn chỉ được đính kèm tối đa 4 hình ảnh.')
        return
      }
      const hostAllowed = ALLOWED_IMAGE_HOSTS.some(
        (h) => parsed.hostname === h || parsed.hostname.endsWith(`.${h}`),
      )
      if (!hostAllowed) {
        setError('Chỉ chấp nhận ảnh từ images.unsplash.com hoặc i.imgur.com.')
        return
      }
      if (imageUrls.includes(trimmed)) {
        setError('Ảnh này đã được thêm vào danh sách.')
        return
      }
      onUpdateImageUrls([...imageUrls, trimmed])
      setUrlInput('')
    } else {
      const hostAllowed = ALLOWED_VIDEO_HOSTS.some(
        (h) => parsed.hostname === h || parsed.hostname.endsWith(`.${h}`),
      )
      if (!hostAllowed) {
        setError('Chỉ chấp nhận video từ YouTube, Loom hoặc Google Drive.')
        return
      }
      onUpdateVideoUrl(trimmed)
      setUrlInput('')
    }
  }

  const handleRemoveImage = (indexToRemove: number) => {
    onUpdateImageUrls(imageUrls.filter((_, idx) => idx !== indexToRemove))
  }

  const handleRemoveVideo = () => {
    onUpdateVideoUrl('')
  }

  return (
    <section className="composer-media-panel" aria-label="Đính kèm ảnh và video">
      <div className="composer-media-header">
        <div className="composer-media-type-tabs" role="tablist">
          <button
            type="button"
            role="tab"
            aria-selected={mediaType === 'IMAGE'}
            className={`composer-media-tab ${mediaType === 'IMAGE' ? 'is-active' : ''}`}
            onClick={() => {
              setMediaType('IMAGE')
              setError('')
            }}
          >
            <Image size={16} />
            <span>Ảnh ({imageUrls.length}/4)</span>
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={mediaType === 'VIDEO'}
            className={`composer-media-tab ${mediaType === 'VIDEO' ? 'is-active' : ''}`}
            onClick={() => {
              setMediaType('VIDEO')
              setError('')
            }}
          >
            <Video size={16} />
            <span>Video {videoUrl ? '(1/1)' : '(0/1)'}</span>
          </button>
        </div>

        <button
          type="button"
          className="composer-media-close"
          onClick={onClose}
          aria-label="Đóng bảng đính kèm media"
        >
          <X size={16} />
        </button>
      </div>

      {/* Tabs nguồn: Máy tính vs Nhập URL */}
      <div className="composer-media-source-tabs">
        <button
          type="button"
          className={`composer-source-tab ${sourceTab === 'upload' ? 'is-active' : ''}`}
          onClick={() => setSourceTab('upload')}
          aria-label="Từ máy tính (Sắp có)"
        >
          <UploadCloud size={15} />
          <span>Từ máy tính</span>
          <span className="composer-badge-coming-soon">Sắp có</span>
        </button>
        <button
          type="button"
          className={`composer-source-tab ${sourceTab === 'url' ? 'is-active' : ''}`}
          onClick={() => setSourceTab('url')}
        >
          <LinkIcon size={15} />
          <span>Nhập URL</span>
        </button>
      </div>

      {/* Tab: Tải lên từ máy tính (Vô hiệu hóa) */}
      {sourceTab === 'upload' && (
        <div className="composer-upload-disabled-area" aria-disabled="true">
          <UploadCloud size={36} className="composer-upload-icon" />
          <p className="composer-upload-title">Tính năng tải tệp trực tiếp đang được hoàn thiện</p>
          <p className="composer-upload-desc">
            Vui lòng sử dụng tab <strong>&quot;Nhập URL&quot;</strong> để đính kèm hình ảnh (Imgur, Unsplash) hoặc video (YouTube, Loom, Google Drive).
          </p>
          <button
            type="button"
            className="composer-upload-btn-disabled"
            disabled
            aria-disabled="true"
          >
            Chọn tệp từ máy tính (Sắp có)
          </button>
        </div>
      )}

      {/* Tab: Nhập URL */}
      {sourceTab === 'url' && (
        <div className="composer-url-area">
          <div className="composer-url-form">
            <input
              type="url"
              value={urlInput}
              onChange={(e) => {
                setUrlInput(e.target.value)
                if (error) setError('')
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  handleAddUrl()
                }
              }}
              placeholder={
                mediaType === 'IMAGE'
                  ? 'Dán URL ảnh HTTPS (images.unsplash.com, i.imgur.com)'
                  : 'Dán URL video HTTPS (YouTube, Loom, Google Drive)'
              }
              maxLength={500}
              className="composer-url-input"
            />
            <button
              type="button"
              onClick={() => handleAddUrl()}
              className="composer-url-add-btn"
              disabled={
                !urlInput.trim() ||
                (mediaType === 'IMAGE' && imageUrls.length >= 4) ||
                (mediaType === 'VIDEO' && Boolean(videoUrl))
              }
            >
              <Plus size={16} />
              <span>Thêm</span>
            </button>
          </div>

          {error && (
            <p className="composer-media-error" role="alert">
              {error}
            </p>
          )}

          {/* Danh sách ảnh đã đính kèm */}
          {mediaType === 'IMAGE' && imageUrls.length > 0 && (
            <div className="composer-image-previews">
              {imageUrls.map((url, idx) => (
                <div key={url} className="composer-preview-item">
                  <img src={url} alt={`Ảnh đính kèm ${idx + 1}`} loading="lazy" />
                  <button
                    type="button"
                    onClick={() => handleRemoveImage(idx)}
                    className="composer-remove-preview-btn"
                    aria-label={`Xóa ảnh ${idx + 1}`}
                  >
                    <X size={14} />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Video đã đính kèm */}
          {mediaType === 'VIDEO' && videoUrl && (
            <div className="composer-video-preview">
              {safeVideoEmbed(videoUrl) ? (
                <iframe
                  src={safeVideoEmbed(videoUrl) ?? undefined}
                  title="Video đính kèm"
                  loading="lazy"
                  sandbox="allow-scripts allow-same-origin allow-presentation"
                />
              ) : (
                <div className="composer-video-link-preview">
                  <Video size={24} />
                  <span className="composer-video-url-text">{videoUrl}</span>
                </div>
              )}
              <button
                type="button"
                onClick={handleRemoveVideo}
                className="composer-remove-preview-btn composer-remove-video"
                aria-label="Xóa video"
              >
                <X size={14} />
              </button>
            </div>
          )}
        </div>
      )}
    </section>
  )
}
