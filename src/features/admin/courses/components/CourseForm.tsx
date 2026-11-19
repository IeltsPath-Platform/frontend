import { useRef, useState, type DragEvent, type FormEvent } from 'react'
import { ImageOff, ImagePlus, Loader2, RefreshCw, Trash2 } from 'lucide-react'
import { createCourse, deleteCourse, updateCourse } from '../api/courseApi'
import { useAdminConfirm } from '../../lib/useAdminConfirm'
import { AdminSwitch } from '../../components/AdminSwitch'
import { courseErrorMessage } from '../lib/courseErrorMessage'
import { validBand, type Course } from '../types'
import { adminErrorMessage } from '../../lib/adminErrors'
import { useAdminError } from '../../lib/useAdminError'
import { TOPIC_SKILLS, SKILL_LABEL } from '../types'
import type { TopicSkill } from '../types'
import { uploadAdminImage } from '../../media/api/mediaUploadApi'

/** An uploaded image: the reference that is saved, and the address the preview shows. */
interface CourseImage { reference: string; preview: string }
type ImageSlot = 'cover' | 'banner'

/**
 * `existing` is every course the author already sees: a code or a band one of them holds is refused before the request,
 * naming that course. A new course starts inactive, so it can be filled in before learners can see it.
 */
export function CourseForm({ course, existing = [], onSaved, onDeleted, onCancel }: {
  course?: Course
  existing?: Course[]
  onSaved: (saved: Course) => void
  /** Offered only when editing: a course that holds nothing can be deleted, the server refuses one that does. */
  onDeleted?: () => void
  onCancel?: () => void
}) {
  const [code, setCode] = useState(course?.code ?? '')
  const [name, setName] = useState(course?.name ?? '')
  const [band, setBand] = useState(course?.bandLevel.toString() ?? '')
  const [status, setStatus] = useState<Course['status']>(course?.status ?? 'INACTIVE')
  const [cover, setCover] = useState<CourseImage>({ reference: course?.coverImageUrl ?? '', preview: course?.coverImageUrl ?? '' })
  const [banner, setBanner] = useState<CourseImage>({ reference: course?.bannerImageUrl ?? '', preview: course?.bannerImageUrl ?? '' })
  const [description, setDescription] = useState(course?.description ?? '')
  const [skillPrices, setSkillPrices] = useState<Partial<Record<TopicSkill, string>>>(() => Object.fromEntries(
    Object.entries(course?.skillUnlockPoints ?? {}).map(([skill, points]) => [skill, String(points)]),
  ))
  const [comboPrice, setComboPrice] = useState(course?.comboUnlockPoints?.toString() ?? '')
  const [free, setFree] = useState(course?.free ?? false)
  const [saving, setSaving] = useState(false)
  /** The picture being uploaded, if any: its own picker shows the progress, and the form waits for it. */
  const [uploading, setUploading] = useState<ImageSlot | null>(null)
  const [, setError] = useAdminError()
  const { confirm, confirmDialog } = useAdminConfirm()

  async function remove() {
    if (!course || saving) return
    if (!(await confirm({
      title: 'Xóa khóa học?',
      message: `Khóa “${course.name}” sẽ bị xóa vĩnh viễn và không khôi phục được. Chỉ xóa được khi khóa chưa có chủ đề hay đề cuối khóa.`,
      confirmLabel: 'Xóa khóa học',
      tone: 'danger',
    }))) return
    setSaving(true)
    setError(null)
    try {
      await deleteCourse(course.id)
      onDeleted?.()
    } catch (reason) { setError(courseErrorMessage(reason)) } finally { setSaving(false) }
  }

  async function upload(slot: ImageSlot, file: File) {
    setUploading(slot)
    setError(null)
    try {
      const result = await uploadAdminImage('/api/content/admin/media/image', file)
      const image = { reference: result.mediaReference, preview: result.mediaUrl ?? '' }
      if (slot === 'cover') setCover(image); else setBanner(image)
    } catch (reason) { setError(adminErrorMessage(reason)) } finally { setUploading(null) }
  }

  async function submit(event: FormEvent) {
    event.preventDefault()
    if (saving) return
    if (!code.trim() || !name.trim() || !validBand(band)) { setError('Nhập mã, tên khóa học và band từ 0 đến 9 theo bước 0,5.'); return }
    const others = existing.filter((item) => item.id !== course?.id)
    const sameCode = course ? undefined : others.find((item) => item.code === code.trim())
    if (sameCode) { setError(`Mã khóa học "${sameCode.code}" đã được dùng. Hãy chọn mã khác.`); return }
    const sameBand = others.find((item) => item.bandLevel === Number(band))
    if (sameBand) { setError(`Band ${Number(band).toFixed(1)} đã có khóa học "${sameBand.name}". Mỗi band chỉ có một khóa học.`); return }
    const parsedPrices: Partial<Record<TopicSkill, number>> = {}
    // A free course sells nothing, so whatever was typed into the price fields is not sent.
    for (const skill of free ? [] : TOPIC_SKILLS) {
      const value = skillPrices[skill]?.trim() ?? ''
      if (!value) continue
      if (!/^\d+$/.test(value) || Number(value) <= 0) { setError(`Giá mở khóa ${SKILL_LABEL[skill]} phải là số nguyên dương.`); return }
      parsedPrices[skill] = Number(value)
    }
    const combo = free || comboPrice.trim() === '' ? null : Number(comboPrice)
    if (combo !== null && (!/^\d+$/.test(comboPrice.trim()) || combo <= 0)) { setError('Giá gói kết hợp phải là số nguyên dương.'); return }
    const prices = Object.values(parsedPrices)
    if (combo !== null && prices.length && combo < Math.max(...prices)) { setError('Giá gói kết hợp không được thấp hơn giá kỹ năng cao nhất.'); return }
    if (combo !== null && prices.length >= 2 && combo > prices.reduce((sum, price) => sum + price, 0)) { setError('Giá gói kết hợp không được cao hơn tổng giá các kỹ năng.'); return }
    setSaving(true)
    setError(null)
    try {
      const content = {
        coverImageUrl: cover.reference.trim() || null,
        bannerImageUrl: banner.reference.trim() || null,
        description: description.trim() || null,
      }
      const saved = course
        ? await updateCourse(course.id, { name: name.trim(), bandLevel: Number(band), status, ...content, skillUnlockPoints: parsedPrices, comboUnlockPoints: combo, free })
        : await createCourse({ code: code.trim(), name: name.trim(), bandLevel: Number(band), status, ...content, skillUnlockPoints: parsedPrices, comboUnlockPoints: combo, free })
      onSaved(saved)
    } catch (reason) { setError(courseErrorMessage(reason)) } finally { setSaving(false) }
  }

  return <form aria-label={course ? 'Sửa khóa học' : 'Tạo khóa học'} className="adm-course-form" noValidate onSubmit={(event) => void submit(event)}>
    <fieldset className="adm-author-fields" disabled={saving || uploading !== null}>
      <div className="adm-course-form__basics">
        <label className="adm-field"><span>Mã khóa học</span><input className="adm-input" maxLength={100} required disabled={!!course} value={code} onChange={(event) => setCode(event.target.value)} /></label>
        <label className="adm-field"><span>Tên khóa học</span><input className="adm-input" maxLength={255} required value={name} onChange={(event) => setName(event.target.value)} /></label>
        <label className="adm-field"><span>Band khóa học</span><input className="adm-input" type="number" min={0} max={9} step={0.5} required value={band} onChange={(event) => setBand(event.target.value)} /></label>
        <label className="adm-field"><span>Trạng thái khóa học</span><select className="adm-select" value={status} onChange={(event) => setStatus(event.target.value as Course['status'])}><option value="ACTIVE">Đang dùng</option><option value="INACTIVE">{course ? 'Ngừng dùng' : 'Chưa kích hoạt'}</option></select></label>
      </div>
      <div className="adm-course-form__images">
        <CourseImageField
          label="Ảnh bìa khóa học"
          noun="ảnh bìa"
          spec="16:9 · 800×450 px"
          shape="cover"
          previewAlt="Xem trước ảnh bìa khóa học"
          image={cover}
          busy={uploading === 'cover'}
          onUpload={(file) => void upload('cover', file)}
          onRemove={() => setCover({ reference: '', preview: '' })}
        />
        <CourseImageField
          label="Banner khóa học"
          noun="banner"
          spec="16:5 · 1600×500 px"
          shape="banner"
          previewAlt="Xem trước banner khóa học"
          image={banner}
          busy={uploading === 'banner'}
          onUpload={(file) => void upload('banner', file)}
          onRemove={() => setBanner({ reference: '', preview: '' })}
        />
      </div>
      <label className="adm-field"><span>Mô tả khóa học</span><textarea className="adm-textarea adm-course-form__description" maxLength={2000} value={description} onChange={(event) => setDescription(event.target.value)} /></label>
      <div className="adm-course-form__sale">
        <AdminSwitch checked={free} onChange={setFree}>Khóa học miễn phí cho mọi người</AdminSwitch>
        {free ? <p className="adm-muted">Khóa miễn phí không có giá mở khóa: học viên học được mọi bài mà không cần mua hay Premium.</p> : null}
        {!free ? <fieldset className="adm-author-fields adm-course-form__prices">
          <legend>Giá mở khóa kỹ năng (Points)</legend>
          {TOPIC_SKILLS.map((skill) => <label className="adm-field" key={skill}><span>{SKILL_LABEL[skill]}</span><input className="adm-input" type="number" min={1} step={1} inputMode="numeric" value={skillPrices[skill] ?? ''} onChange={(event) => setSkillPrices((current) => ({ ...current, [skill]: event.target.value }))} /></label>)}
          <label className="adm-field"><span>Gói kết hợp</span><input className="adm-input" type="number" min={1} step={1} inputMode="numeric" value={comboPrice} onChange={(event) => setComboPrice(event.target.value)} /></label>
          <p className="adm-muted adm-course-form__prices-note">Để trống thì kỹ năng đó không bán riêng. Gói kết hợp không thấp hơn giá cao nhất và không cao hơn tổng các giá.</p>
        </fieldset> : null}
      </div>
      <div className="adm-form-footer">
        {onCancel ? <button className="adm-btn" onClick={onCancel} type="button">Hủy</button> : null}
        <button className="adm-btn adm-btn--primary" type="submit">{saving ? 'Đang lưu…' : course ? 'Lưu khóa học' : 'Tạo khóa học'}</button>
        {course && onDeleted ? <button className="adm-btn adm-btn--danger adm-btn--noicon adm-course-form__delete" onClick={() => void remove()} type="button"><Trash2 aria-hidden="true" size={16} /> Xóa khóa học</button> : null}
      </div>
    </fieldset>
    {confirmDialog}
  </form>
}

/**
 * One image of the course. Without an image it is a box to pick or drop a file into, in the shape the image will have;
 * with one it shows that shape filled and offers to replace or remove it, so the layout does not jump between the two.
 */
function CourseImageField({ label, noun, spec, shape, previewAlt, image, busy, onUpload, onRemove }: {
  label: string
  /** What the image is called in a button: "ảnh bìa", "banner". */
  noun: string
  /** The shape and size to aim for, in a few characters. */
  spec: string
  shape: 'cover' | 'banner'
  previewAlt: string
  image: CourseImage
  busy: boolean
  onUpload: (file: File) => void
  onRemove: () => void
}) {
  const input = useRef<HTMLInputElement>(null)
  const [failedPreview, setFailedPreview] = useState<string | null>(null)
  const [dragging, setDragging] = useState(false)
  const preview = image.preview.trim()

  function drop(event: DragEvent) {
    event.preventDefault()
    setDragging(false)
    const file = event.dataTransfer.files[0]
    if (file && !busy) onUpload(file)
  }

  return <div aria-busy={busy} className={`adm-course-image adm-course-image--${shape}`}>
    <div className="adm-course-image__head">
      <span className="adm-course-image__title">{label}</span>
      <span className="adm-course-image__spec">{spec}</span>
    </div>
    <input
      accept="image/png,image/jpeg,image/webp"
      aria-label={label}
      className="adm-sr-only"
      onChange={(event) => { const file = event.currentTarget.files?.[0]; event.currentTarget.value = ''; if (file) onUpload(file) }}
      ref={input}
      tabIndex={-1}
      type="file"
    />
    {image.reference
      ? <>
        <div className={`adm-course-image__frame adm-course-image__frame--${shape}`}>
          {preview && failedPreview !== preview
            ? <img alt={previewAlt} onError={() => setFailedPreview(preview)} src={preview} />
            : <span className="adm-course-image__missing"><ImageOff aria-hidden="true" size={20} />Không xem được ảnh</span>}
          {busy ? <span className="adm-course-image__busy"><Loader2 aria-hidden="true" className="adm-spin" size={18} />Đang tải ảnh…</span> : null}
        </div>
        <div className="adm-course-image__actions">
          <button aria-label={`Thay ${noun === 'banner' ? 'ảnh banner' : 'ảnh bìa'}`} className="adm-btn adm-course-image__action" disabled={busy} onClick={() => input.current?.click()} type="button"><RefreshCw aria-hidden="true" size={15} />Thay ảnh</button>
          <button aria-label={`Xóa ${noun}`} className="adm-btn adm-btn--danger adm-course-image__action" disabled={busy} onClick={onRemove} type="button"><Trash2 aria-hidden="true" size={15} />Xóa</button>
        </div>
      </>
      : <button
        aria-label={`Chọn ${noun} khóa học`}
        className={`adm-course-image__drop adm-course-image__frame--${shape}${dragging ? ' is-dragging' : ''}`}
        disabled={busy}
        onClick={() => input.current?.click()}
        onDragLeave={() => setDragging(false)}
        onDragOver={(event) => { event.preventDefault(); setDragging(true) }}
        onDrop={drop}
        type="button"
      >
        {busy
          ? <><Loader2 aria-hidden="true" className="adm-spin" size={20} /><strong>Đang tải ảnh…</strong></>
          : <><ImagePlus aria-hidden="true" size={22} /><strong>Chọn ảnh</strong><span>hoặc kéo thả vào đây</span></>}
      </button>}
  </div>
}
