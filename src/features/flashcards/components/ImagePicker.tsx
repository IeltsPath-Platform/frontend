import { useEffect, useRef, useState } from 'react'
import { ImagePlus, Loader2, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { HttpError } from '@/lib/httpClient'
import { flashcardApi, flashcardErrorMessage, validateImage } from '../api/flashcardApi'

export interface PickedImage { key: string | null; url: string | null }

interface ImagePickerProps {
  value: PickedImage
  onChange: (value: PickedImage) => void
  onBusyChange: (busy: boolean) => void
  label: string
  /** Square "Hình ảnh" tile used beside each row of the deck editor. */
  compact?: boolean
}

/** Uploads to library-service right after selection; the parent saves only the returned object key. */
export function ImagePicker({ value, onChange, onBusyChange, label, compact = false }: ImagePickerProps) {
  const input = useRef<HTMLInputElement>(null)
  const pending = useRef<AbortController | null>(null)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => () => pending.current?.abort(), [])

  async function upload(file: File | undefined) {
    if (!file) return
    const invalid = validateImage(file)
    if (invalid) { setError(invalid); return }
    pending.current?.abort()
    const controller = new AbortController()
    pending.current = controller
    setUploading(true); onBusyChange(true); setError('')
    try {
      const uploaded = await flashcardApi.uploadImage(file, controller.signal)
      if (!controller.signal.aborted) onChange({ key: uploaded.key, url: uploaded.url })
    } catch (reason) {
      if (!controller.signal.aborted) {
        // Upload rejections come back in English from the shared storage policy, so 400 gets a local message.
        const badFile = reason instanceof HttpError && reason.status === 400
        setError(badFile ? 'Tệp không phải ảnh PNG, JPG hoặc WebP hợp lệ.' : flashcardErrorMessage(reason, 'Không tải được ảnh lên.'))
      }
    } finally {
      if (pending.current === controller) { setUploading(false); onBusyChange(false); pending.current = null }
      if (input.current) input.current.value = ''
    }
  }

  const fileInput = <input ref={input} type="file" hidden accept="image/png,image/jpeg,image/webp" onChange={(event) => void upload(event.target.files?.[0])} />

  if (compact) {
    return (
      <div className="flashcard-image-tile">
        {value.url ? (
          <div className="flashcard-image-tile-filled">
            <button type="button" aria-label={`Đổi ${label.toLowerCase()}`} disabled={uploading} onClick={() => input.current?.click()}>
              <img src={value.url} alt="" />
            </button>
            <button type="button" className="flashcard-image-tile-remove" aria-label={`Bỏ ${label.toLowerCase()}`} onClick={() => onChange({ key: null, url: null })}><Trash2 /></button>
          </div>
        ) : (
          <button type="button" className="flashcard-image-tile-empty" disabled={uploading} aria-label={`Thêm ${label.toLowerCase()}`}
            onClick={() => input.current?.click()} onDragOver={(event) => event.preventDefault()}
            onDrop={(event) => { event.preventDefault(); void upload(event.dataTransfer.files[0]) }}>
            {uploading ? <Loader2 className="animate-spin" aria-hidden="true" /> : <ImagePlus aria-hidden="true" />}
            <span>{uploading ? 'Đang tải' : 'Hình ảnh'}</span>
          </button>
        )}
        {fileInput}
        {error && <p role="alert" className="flashcard-image-tile-error">{error}</p>}
      </div>
    )
  }

  return (
    <div className="flashcard-image-picker">
      <span className="flashcard-field-label">{label}</span>
      {value.url ? (
        <div className="flashcard-image-preview">
          <img src={value.url} alt="Ảnh minh họa đã chọn" />
          <div>
            <Button type="button" variant="outline" size="sm" disabled={uploading} onClick={() => input.current?.click()}><ImagePlus />Đổi ảnh</Button>
            <Button type="button" variant="destructive" size="sm" disabled={uploading} onClick={() => onChange({ key: null, url: null })}><Trash2 />Bỏ ảnh</Button>
          </div>
        </div>
      ) : (
        <button type="button" className="flashcard-image-drop" disabled={uploading} onClick={() => input.current?.click()}
          onDragOver={(event) => event.preventDefault()}
          onDrop={(event) => { event.preventDefault(); void upload(event.dataTransfer.files[0]) }}>
          {uploading ? <Loader2 className="animate-spin" aria-hidden="true" /> : <ImagePlus aria-hidden="true" />}
          <strong>{uploading ? 'Đang tải ảnh…' : 'Chọn hoặc kéo thả ảnh'}</strong>
          <small>PNG, JPG, WebP · tối đa 2 MB</small>
        </button>
      )}
      {fileInput}
      {error && <p role="alert" className="flashcard-error">{error}</p>}
    </div>
  )
}
