import { useState, type FormEvent } from 'react'
import { adminErrorMessage } from '../../lib/adminErrors'
import { createCourse, updateCourse } from '../api/courseApi'
import { validBand, type Course } from '../types'
import { useAdminError } from '../../lib/useAdminError'
import { TOPIC_SKILLS, SKILL_LABEL } from '../types'
import type { TopicSkill } from '../types'
import { uploadAdminImage } from '../../media/api/mediaUploadApi'

export function CourseForm({ course, onSaved, onCancel }: { course?: Course; onSaved: () => void; onCancel?: () => void }) {
  const [code, setCode] = useState(course?.code ?? '')
  const [name, setName] = useState(course?.name ?? '')
  const [band, setBand] = useState(course?.bandLevel.toString() ?? '')
  const [status, setStatus] = useState(course?.status ?? 'INACTIVE')
  const [coverImageReference, setCoverImageReference] = useState(course?.coverImageUrl ?? '')
  const [coverImagePreview, setCoverImagePreview] = useState(course?.coverImageUrl ?? '')
  const [description, setDescription] = useState(course?.description ?? '')
  const [skillPrices, setSkillPrices] = useState<Partial<Record<TopicSkill, string>>>(() => Object.fromEntries(
    Object.entries(course?.skillUnlockPoints ?? {}).map(([skill, points]) => [skill, String(points)]),
  ))
  const [comboPrice, setComboPrice] = useState(course?.comboUnlockPoints?.toString() ?? '')
  const [previewFailed, setPreviewFailed] = useState(false)
  const [saving, setSaving] = useState(false)
  const [uploadingCover, setUploadingCover] = useState(false)
  const [, setError] = useAdminError()
  async function uploadCover(file: File) {
    setUploadingCover(true)
    setError(null)
    try {
      const result = await uploadAdminImage('/api/content/admin/media/image', file)
      setCoverImageReference(result.mediaReference)
      setCoverImagePreview(result.mediaUrl ?? '')
      setPreviewFailed(false)
    } catch (reason) { setError(adminErrorMessage(reason)) } finally { setUploadingCover(false) }
  }
  async function submit(event: FormEvent) {
    event.preventDefault()
    if (saving) return
    if (!code.trim() || !name.trim() || !validBand(band)) { setError('Nhập mã, tên khóa học và band từ 0 đến 9 theo bước 0,5.'); return }
    const parsedPrices: Partial<Record<TopicSkill, number>> = {}
    for (const skill of TOPIC_SKILLS) {
      const value = skillPrices[skill]?.trim() ?? ''
      if (!value) continue
      if (!/^\d+$/.test(value) || Number(value) <= 0) { setError(`Giá mở khóa ${SKILL_LABEL[skill]} phải là số nguyên dương.`); return }
      parsedPrices[skill] = Number(value)
    }
    const combo = comboPrice.trim() === '' ? null : Number(comboPrice)
    if (combo !== null && (!/^\d+$/.test(comboPrice.trim()) || combo <= 0)) { setError('Giá gói kết hợp phải là số nguyên dương.'); return }
    const prices = Object.values(parsedPrices)
    if (combo !== null && prices.length && combo < Math.max(...prices)) { setError('Giá gói kết hợp không được thấp hơn giá kỹ năng cao nhất.'); return }
    if (combo !== null && prices.length >= 2 && combo > prices.reduce((sum, price) => sum + price, 0)) { setError('Giá gói kết hợp không được cao hơn tổng giá các kỹ năng.'); return }
    setSaving(true)
    setError(null)
    try {
      const content = { coverImageUrl: coverImageReference.trim() || null, description: description.trim() || null }
      if (course) await updateCourse(course.id, { name: name.trim(), bandLevel: Number(band), status, ...content, skillUnlockPoints: parsedPrices, comboUnlockPoints: combo })
      else await createCourse({ code: code.trim(), name: name.trim(), bandLevel: Number(band), ...content })
      onSaved()
    } catch (reason) { setError(adminErrorMessage(reason)) } finally { setSaving(false) }
  }
  return <form aria-label={course ? 'Sửa khóa học' : 'Tạo khóa học'} noValidate onSubmit={(event) => void submit(event)}>
    <fieldset className="adm-author-fields" disabled={saving || uploadingCover}>
      <label className="adm-field"><span>Mã khóa học</span><input className="adm-input" maxLength={100} required disabled={!!course} value={code} onChange={(event) => setCode(event.target.value)} /></label>
      <label className="adm-field"><span>Tên khóa học</span><input className="adm-input" maxLength={255} required value={name} onChange={(event) => setName(event.target.value)} /></label>
      <label className="adm-field"><span>Band khóa học</span><input className="adm-input" type="number" min={0} max={9} step={0.5} required value={band} onChange={(event) => setBand(event.target.value)} /></label>
      <label className="adm-field"><span>Ảnh bìa khóa học</span><input className="adm-input" type="file" accept="image/png,image/jpeg,image/webp" onChange={(event) => { const file = event.currentTarget.files?.[0]; event.currentTarget.value = ''; if (file) void uploadCover(file) }} /></label>
      {coverImagePreview.trim() && !previewFailed ? <img className="adm-course-cover-preview" src={coverImagePreview.trim()} alt="Xem trước ảnh bìa khóa học" onError={() => setPreviewFailed(true)} /> : null}
      {coverImageReference ? <button className="adm-btn adm-btn--danger" type="button" onClick={() => { setCoverImageReference(''); setCoverImagePreview(''); setPreviewFailed(false) }}>Xóa ảnh bìa</button> : null}
      <label className="adm-field"><span>Mô tả khóa học</span><textarea className="adm-textarea" maxLength={2000} value={description} onChange={(event) => setDescription(event.target.value)} /></label>
      {course ? <fieldset className="adm-author-fields"><legend>Giá mở khóa kỹ năng (Points)</legend>{TOPIC_SKILLS.map((skill) => <label className="adm-field" key={skill}><span>{SKILL_LABEL[skill]}</span><input className="adm-input" type="number" min={1} step={1} inputMode="numeric" value={skillPrices[skill] ?? ''} onChange={(event) => setSkillPrices((current) => ({ ...current, [skill]: event.target.value }))} /></label>)}<label className="adm-field"><span>Gói kết hợp</span><input className="adm-input" type="number" min={1} step={1} inputMode="numeric" value={comboPrice} onChange={(event) => setComboPrice(event.target.value)} /></label></fieldset> : null}
      {course ? <label className="adm-field"><span>Trạng thái khóa học</span><select className="adm-select" value={status} onChange={(event) => setStatus(event.target.value as Course['status'])}><option value="ACTIVE">Đang dùng</option><option value="INACTIVE">Ngừng dùng</option></select></label> : <p className="adm-muted">Khóa mới ở trạng thái đang dùng. Bạn có thể ngừng dùng trong phần sửa khóa học.</p>}
      <div className="adm-form-footer">{onCancel ? <button className="adm-btn" onClick={onCancel} type="button">Hủy</button> : null}<button className="adm-btn adm-btn--primary" type="submit">{saving ? 'Đang lưu…' : course ? 'Lưu khóa học' : 'Tạo khóa học'}</button></div>
    </fieldset>
  </form>
}
