import { useState, type FormEvent } from 'react'
import { adminErrorMessage } from '../../lib/adminErrors'
import { createCourse, updateCourse } from '../api/courseApi'
import { validBand, type Course } from '../types'
import { useAdminError } from '../../lib/useAdminError'

export function CourseForm({ course, onSaved, onCancel }: { course?: Course; onSaved: () => void; onCancel?: () => void }) {
  const [code, setCode] = useState(course?.code ?? '')
  const [name, setName] = useState(course?.name ?? '')
  const [band, setBand] = useState(course?.bandLevel.toString() ?? '')
  const [status, setStatus] = useState(course?.status ?? 'INACTIVE')
  const [coverImageUrl, setCoverImageUrl] = useState(course?.coverImageUrl ?? '')
  const [description, setDescription] = useState(course?.description ?? '')
  const [previewFailed, setPreviewFailed] = useState(false)
  const [saving, setSaving] = useState(false)
  const [, setError] = useAdminError()
  async function submit(event: FormEvent) {
    event.preventDefault()
    if (saving) return
    if (!code.trim() || !name.trim() || !validBand(band)) { setError('Nhập mã, tên khóa học và band từ 0 đến 9 theo bước 0,5.'); return }
    setSaving(true)
    setError(null)
    try {
      const content = { coverImageUrl: coverImageUrl.trim() || null, description: description.trim() || null }
      if (course) await updateCourse(course.id, { name: name.trim(), bandLevel: Number(band), status, ...content })
      else await createCourse({ code: code.trim(), name: name.trim(), bandLevel: Number(band), ...content })
      onSaved()
    } catch (reason) { setError(adminErrorMessage(reason)) } finally { setSaving(false) }
  }
  return <form aria-label={course ? 'Sửa khóa học' : 'Tạo khóa học'} noValidate onSubmit={(event) => void submit(event)}>
    <fieldset className="adm-author-fields" disabled={saving}>
      <label className="adm-field"><span>Mã khóa học</span><input className="adm-input" maxLength={100} required disabled={!!course} value={code} onChange={(event) => setCode(event.target.value)} /></label>
      <label className="adm-field"><span>Tên khóa học</span><input className="adm-input" maxLength={255} required value={name} onChange={(event) => setName(event.target.value)} /></label>
      <label className="adm-field"><span>Band khóa học</span><input className="adm-input" type="number" min={0} max={9} step={0.5} required value={band} onChange={(event) => setBand(event.target.value)} /></label>
      <label className="adm-field"><span>Ảnh bìa (URL)</span><input className="adm-input" type="url" value={coverImageUrl} onChange={(event) => { setCoverImageUrl(event.target.value); setPreviewFailed(false) }} /></label>
      {coverImageUrl.trim() && !previewFailed ? <img className="adm-course-cover-preview" src={coverImageUrl.trim()} alt="Xem trước ảnh bìa khóa học" onError={() => setPreviewFailed(true)} /> : null}
      <label className="adm-field"><span>Mô tả khóa học</span><textarea className="adm-textarea" maxLength={2000} value={description} onChange={(event) => setDescription(event.target.value)} /></label>
      {course ? <label className="adm-field"><span>Trạng thái khóa học</span><select className="adm-select" value={status} onChange={(event) => setStatus(event.target.value as Course['status'])}><option value="ACTIVE">Đang dùng</option><option value="INACTIVE">Ngừng dùng</option></select></label> : <p className="adm-muted">Khóa mới ở trạng thái đang dùng. Bạn có thể ngừng dùng trong phần sửa khóa học.</p>}
      <div className="adm-form-footer">{onCancel ? <button className="adm-btn" onClick={onCancel} type="button">Hủy</button> : null}<button className="adm-btn adm-btn--primary" type="submit">{saving ? 'Đang lưu…' : course ? 'Lưu khóa học' : 'Tạo khóa học'}</button></div>
    </fieldset>
  </form>
}
