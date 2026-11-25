import { useRef, useState, type DragEvent } from 'react'
import { useToast } from '@/components/toast/toastContext'
import { Eye, ImageOff, ImagePlus, Loader2, Trash2 } from 'lucide-react'
import { Image } from 'primereact/image'
import { AdminError, AdminLoading } from '../../components/AdminState'
import { useAdminConfirm } from '../../lib/useAdminConfirm'
import { useAdminError } from '../../lib/useAdminError'
import { useAdminResource } from '../../lib/useAdminResource'
import { IMAGE_CONTENT_TYPES, IMAGE_MAX_BYTES, uploadAdminImage } from '../../media/api/mediaUploadApi'
import { clearVersionImage, listVersionPassages, setVersionImage } from '../api/questionApi'
import { questionErrorText } from '../lib/labels'

const IMAGE_ENDPOINT = '/api/content/admin/media/image'

function fileProblem(file: File): string | undefined {
  if (file.size === 0) return 'Tệp ảnh không có nội dung. Chọn tệp khác.'
  if (!(IMAGE_CONTENT_TYPES as readonly string[]).includes(file.type)) return 'Chỉ nhận ảnh JPG, PNG hoặc WebP.'
  if (file.size > IMAGE_MAX_BYTES) return 'Ảnh lớn hơn 2 MB. Chọn ảnh nhỏ hơn.'
  return undefined
}

/** The chart or picture a learner writes about in a Writing question version. */
export function QuestionImageEditor({ questionId, versionId, editable }: { questionId: string; versionId: string; editable: boolean }) {
  const resource = useAdminResource(`question-image|${versionId}`, async (signal) => {
    const found = await listVersionPassages(versionId, signal)
    return found.find((item) => item.type === 'IMAGE' && item.source === 'DIRECT') ?? null
  })
  const { confirm, confirmDialog } = useAdminConfirm()
  const { toast } = useToast()
  const [, setError] = useAdminError()
  const fileInput = useRef<HTMLInputElement>(null)
  const [pending, setPending] = useState(false)
  const [validationError, setValidationError] = useState<string | null>(null)
  const [failedPreview, setFailedPreview] = useState<string | null>(null)
  const [dragging, setDragging] = useState(false)

  const image = resource.status === 'success' ? resource.data : null

  async function run(action: () => Promise<unknown>, message: string) {
    setPending(true)
    setError(null)
    try {
      await action()
      toast({ title: 'Thành công', description: message, tone: 'success' })
      resource.reload()
    } catch (reason) {
      setError(questionErrorText(reason))
    } finally {
      setPending(false)
    }
  }

  async function upload(file: File) {
    const problem = fileProblem(file)
    if (problem) {
      setValidationError(problem)
      return
    }
    setValidationError(null)
    setFailedPreview(null)
    await run(async () => {
      const stored = await uploadAdminImage(IMAGE_ENDPOINT, file)
      await setVersionImage(questionId, versionId, {
        mediaReference: stored.mediaReference,
        altText: image?.text || null,
      })
    }, 'Đã lưu ảnh đề.')
  }

  async function remove() {
    if (pending) return
    if (!(await confirm({ title: 'Gỡ ảnh đề?', message: 'Ảnh gốc được giữ lại trong kho; chỉ phiên bản này không còn dùng nó.', confirmLabel: 'Gỡ ảnh', tone: 'danger' }))) return
    await run(() => clearVersionImage(questionId, versionId), 'Đã gỡ ảnh đề.')
  }

  function choose(file?: File) {
    if (file && !pending) void upload(file)
  }

  function drop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault()
    setDragging(false)
    choose(event.dataTransfer.files[0])
  }

  if (resource.status === 'loading') return <AdminLoading label="Đang tải ảnh đề…" />
  if (resource.status === 'error') return <AdminError message={resource.error ?? 'Không tải được ảnh đề.'} onRetry={resource.reload} />
  if (!editable && !image) return null

  const preview = image?.mediaUrl?.trim() ?? ''
  const canShow = preview !== '' && failedPreview !== preview

  return (
    <section aria-label="Ảnh đề" aria-busy={pending} className="qb-image">
      {confirmDialog}
      <h4 className="qb-image__title">Ảnh đề</h4>
      {editable ? <input
        accept={IMAGE_CONTENT_TYPES.join(',')}
        aria-label="Chọn ảnh đề"
        className="adm-sr-only"
        onChange={(event) => {
          const selected = event.currentTarget.files?.[0]
          event.currentTarget.value = ''
          choose(selected)
        }}
        ref={fileInput}
        tabIndex={-1}
        type="file"
      /> : null}
      {image ? (
        <div className="qb-image__frame">
          {canShow
            ? <Image alt={image.text || 'Ảnh đề'} className="qb-image__picture" imageClassName="qb-image__img" indicatorIcon={<Eye aria-hidden="true" size={22} />} preview pt={{ image: { onError: () => setFailedPreview(preview) } }} src={preview} />
            : <span className="qb-image__missing"><ImageOff aria-hidden="true" size={20} />Không xem được ảnh</span>}
          {editable ? <>
            {pending ? <span className="qb-image__busy"><Loader2 aria-hidden="true" className="adm-spin" size={18} />Đang tải ảnh…</span> : null}
            <button aria-label="Gỡ ảnh đề" className="qb-image__remove" disabled={pending} onClick={() => void remove()} title="Gỡ ảnh đề" type="button"><Trash2 aria-hidden="true" size={16} /></button>
          </> : null}
        </div>
      ) : (
        <div
          className={`qb-image__drop${dragging ? ' is-dragging' : ''}`}
          onDragLeave={() => setDragging(false)}
          onDragOver={(event) => { event.preventDefault(); setDragging(true) }}
          onDrop={drop}
          role="presentation"
        >
          {pending
            ? <span className="qb-image__drop-content"><Loader2 aria-hidden="true" className="adm-spin" size={20} /><strong>Đang tải ảnh…</strong></span>
            : <button aria-label="Chọn ảnh đề" className="qb-image__pick" onClick={() => fileInput.current?.click()} type="button"><ImagePlus aria-hidden="true" size={22} /><strong>Chọn ảnh</strong><span>hoặc kéo thả vào đây</span></button>}
        </div>
      )}
      {editable && image ? <button className="adm-btn adm-btn--small qb-image__replace" disabled={pending} onClick={() => fileInput.current?.click()} type="button"><ImagePlus aria-hidden="true" size={16} />Thay ảnh</button> : null}
      {validationError ? <p className="adm-field__error" role="alert">{validationError}</p> : null}
    </section>
  )
}
