import { useMemo, useRef, useState, type DragEvent, type FormEvent } from 'react'
import { Eye, ImageOff, ImagePlus, Loader2, Trash2 } from 'lucide-react'
import { z } from 'zod'
import { Image } from 'primereact/image'
import { createCourse, deleteCourse, updateCourse } from '../api/courseApi'
import { useAdminConfirm } from '../../lib/useAdminConfirm'
import { AdminField } from '../../components/AdminField'
import { AdminSwitch } from '../../components/AdminSwitch'
import { courseErrorMessage } from '../lib/courseErrorMessage'
import { bandText, optionalText, positiveIntegerText, requiredText } from '@/lib/validation/fields'
import { useFormErrors } from '@/lib/validation/useFormErrors'
import type { Course } from '../types'
import { adminErrorMessage } from '../../lib/adminErrors'
import { useAdminError } from '../../lib/useAdminError'
import { TOPIC_SKILLS, SKILL_LABEL } from '../types'
import type { TopicSkill } from '../types'
import { uploadAdminImage } from '../../media/api/mediaUploadApi'
import { fetchCodeSuggestion } from '../../code-settings/api/codeSettingsApi'
import { useGeneratedCode } from '../../code-settings/lib/useGeneratedCode'

/** An uploaded image: the reference that is saved, and the address the preview shows. */
interface CourseImage { reference: string; preview: string }
type ImageSlot = 'cover' | 'banner'

const NO_COURSES: Course[] = []
const PRICE_FIELDS = TOPIC_SKILLS.map((skill) => ({ skill, name: `price${skill}` }))

/**
 * The rules of the form: what each field needs, and the checks that need other fields or the courses already there
 * (a code or a band another course holds, a combo price outside what the skill prices allow). Errors are shown under
 * the field they are about.
 */
function courseSchema(existing: Course[], current: Course | undefined, codeRequired = true) {
  const others = existing.filter((item) => item.id !== current?.id)
  const shape: Record<string, z.ZodType> = {
    code: codeRequired ? requiredText('Mã khóa học', 100) : optionalText('Mã khóa học', 100),
    name: requiredText('Tên khóa học', 255),
    band: bandText('Band khóa học'),
    description: optionalText('Mô tả khóa học', 2000),
    combo: positiveIntegerText('Giá gói kết hợp', { optional: true }),
  }
  for (const { skill, name } of PRICE_FIELDS) shape[name] = positiveIntegerText(`Giá mở khóa ${SKILL_LABEL[skill]}`, { optional: true })
  return z.object(shape).superRefine((value, ctx) => {
    const text = value as Record<string, string>
    if (!current) {
      const sameCode = others.find((item) => item.code === (text.code ?? '').trim())
      if (sameCode) ctx.addIssue({ code: 'custom', path: ['code'], message: `Mã khóa học "${sameCode.code}" đã được dùng. Hãy chọn mã khác.` })
    }
    const band = Number(text.band)
    if ((text.band ?? '').trim() !== '' && Number.isFinite(band)) {
      const sameBand = others.find((item) => item.bandLevel === band)
      if (sameBand) ctx.addIssue({ code: 'custom', path: ['band'], message: `Band ${band.toFixed(1)} đã có khóa học "${sameBand.name}". Mỗi band chỉ có một khóa học.` })
    }
    const prices = PRICE_FIELDS.map(({ name }) => (text[name] ?? '').trim()).filter((price) => /^\d+$/.test(price) && Number(price) > 0).map(Number)
    const comboText = (text.combo ?? '').trim()
    if (/^\d+$/.test(comboText) && Number(comboText) > 0) {
      const combo = Number(comboText)
      if (prices.length && combo < Math.max(...prices)) ctx.addIssue({ code: 'custom', path: ['combo'], message: 'Giá gói kết hợp không được thấp hơn giá kỹ năng cao nhất.' })
      else if (prices.length >= 2 && combo > prices.reduce((sum, price) => sum + price, 0)) ctx.addIssue({ code: 'custom', path: ['combo'], message: 'Giá gói kết hợp không được cao hơn tổng giá các kỹ năng.' })
    }
  })
}

/**
 * `existing` is every course the author already sees: a code or a band one of them holds is refused before the request,
 * naming that course. A new course starts inactive, so it can be filled in before learners can see it.
 */
export function CourseForm({ course, existing = NO_COURSES, onSaved, onDeleted, onCancel }: {
  course?: Course
  existing?: Course[]
  onSaved: (saved: Course) => void
  /** Offered only when editing: a course that holds nothing can be deleted, the server refuses one that does. */
  onDeleted?: () => void
  onCancel?: () => void
}) {
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
  const generated = useGeneratedCode({
    kind: 'COURSE', enabled: !course, initial: course?.code ?? '', contextKey: band,
    suggest: (signal) => fetchCodeSuggestion(band, signal),
  })
  const { code } = generated
  const codeRequired = generated.required
  const schema = useMemo(() => courseSchema(existing, course, codeRequired), [existing, course, codeRequired])
  // A free course sells nothing, so whatever was typed into the price fields is neither checked nor sent.
  const form = useFormErrors(schema, {
    code, name, band, description,
    combo: free ? '' : comboPrice,
    ...Object.fromEntries(PRICE_FIELDS.map(({ skill, name: field }) => [field, free ? '' : skillPrices[skill] ?? ''])),
  })

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
    if (!form.validate()) return
    const parsedPrices: Partial<Record<TopicSkill, number>> = {}
    for (const skill of free ? [] : TOPIC_SKILLS) {
      const value = skillPrices[skill]?.trim() ?? ''
      if (value) parsedPrices[skill] = Number(value)
    }
    const combo = free || comboPrice.trim() === '' ? null : Number(comboPrice)
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
        : await createCourse({ ...(generated.codeToSend !== undefined ? { code: generated.codeToSend } : {}), name: name.trim(), bandLevel: Number(band), status, ...content, skillUnlockPoints: parsedPrices, comboUnlockPoints: combo, free })
      onSaved(saved)
    } catch (reason) { setError(courseErrorMessage(reason)) } finally { setSaving(false) }
  }

  return <form aria-label={course ? 'Sửa khóa học' : 'Tạo khóa học'} className="adm-course-form" noValidate onSubmit={(event) => void submit(event)}>
    <fieldset className="adm-author-fields" disabled={saving || uploading !== null}>
      <div className="adm-course-form__basics">
        <AdminField label="Mã khóa học" {...form.field('code')} required={codeRequired}><input className="adm-input" maxLength={100} disabled={!!course || generated.locked} value={code} onChange={(event) => generated.onType(event.target.value)} /></AdminField>
        <AdminField label="Tên khóa học" {...form.field('name')}><input className="adm-input" maxLength={255} value={name} onChange={(event) => setName(event.target.value)} /></AdminField>
        <AdminField label="Band khóa học" {...form.field('band')}><input className="adm-input" type="number" min={0} max={9} step={0.5} value={band} onChange={(event) => setBand(event.target.value)} /></AdminField>
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
      <AdminField label="Mô tả khóa học" {...form.field('description')}><textarea className="adm-textarea adm-course-form__description" maxLength={2000} value={description} onChange={(event) => setDescription(event.target.value)} /></AdminField>
      <div className="adm-course-form__sale">
        <AdminSwitch checked={free} onChange={setFree}>Khóa học miễn phí cho mọi người</AdminSwitch>
        {free ? <p className="adm-muted">Khóa miễn phí không có giá mở khóa: học viên học được mọi bài mà không cần mua hay Premium.</p> : null}
        {!free ? <fieldset className="adm-author-fields adm-course-form__prices">
          <legend>Giá mở khóa kỹ năng (Points)</legend>
          {PRICE_FIELDS.map(({ skill, name: field }) => <AdminField key={skill} label={SKILL_LABEL[skill]} {...form.field(field)}><input className="adm-input" type="number" min={1} step={1} inputMode="numeric" value={skillPrices[skill] ?? ''} onChange={(event) => setSkillPrices((current) => ({ ...current, [skill]: event.target.value }))} /></AdminField>)}
          <AdminField label="Gói kết hợp" {...form.field('combo')}><input className="adm-input" type="number" min={1} step={1} inputMode="numeric" value={comboPrice} onChange={(event) => setComboPrice(event.target.value)} /></AdminField>
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
  const canShow = preview !== '' && failedPreview !== preview

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
        {/* The picture fills the same box the empty state does, so choosing one never moves what is around it. */}
        <div className={`adm-course-image__frame adm-course-image__frame--${shape}`}>
          {canShow
            // PrimeReact's Image draws the eye over the picture on hover and opens it large, with zoom and rotate.
            ? <Image alt={previewAlt} className="adm-course-image__picture" imageClassName="adm-course-image__img" indicatorIcon={<Eye aria-hidden="true" size={22} />} preview pt={{ image: { onError: () => setFailedPreview(preview) } }} src={preview} />
            : <span className="adm-course-image__missing"><ImageOff aria-hidden="true" size={20} />Không xem được ảnh</span>}
          {busy ? <span className="adm-course-image__busy"><Loader2 aria-hidden="true" className="adm-spin" size={18} />Đang tải ảnh…</span> : null}
          <button aria-label={`Xóa ${noun}`} className="adm-course-image__remove" disabled={busy} onClick={onRemove} title="Xóa ảnh" type="button"><Trash2 aria-hidden="true" size={16} /></button>
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
