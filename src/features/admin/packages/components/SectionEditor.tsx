import { useState, type FormEvent } from 'react'
import { SECTION_SKILL_LABEL } from '../lib/packageLabels'
import { sectionRequestSchema, type PackageSection, type SectionRequest } from '../types'

export function SectionEditor({ section, sortOrder, busy, onSave, onCancel }: {
  section?: PackageSection; sortOrder: number; busy: boolean
  onSave: (body: SectionRequest) => Promise<void>; onCancel: () => void
}) {
  const [title, setTitle] = useState(section?.title ?? '')
  const [skill, setSkill] = useState(section?.skill ?? '')
  const [partNo, setPartNo] = useState(section?.partNo?.toString() ?? '')
  const initialMinutes = section?.timeLimitSeconds == null ? '' : String(section.timeLimitSeconds / 60)
  const [minutes, setMinutes] = useState(initialMinutes)
  const [instructions, setInstructions] = useState(section?.instructions ?? '')
  const [error, setError] = useState<string | null>(null)
  async function submit(event: FormEvent) {
    event.preventDefault()
    if (busy) return
    if (!title.trim() || title.trim().length > 255) { setError('Nhập tiêu đề phần, tối đa 255 ký tự.'); return }
    const preservingTime = !!section && minutes === initialMinutes
    const seconds = preservingTime ? section.timeLimitSeconds : minutes.trim() === '' ? null : Math.round(Number(minutes) * 60)
    if (!preservingTime && seconds !== null && (!Number.isFinite(Number(minutes)) || Number(minutes) <= 0 || !Number.isSafeInteger(seconds) || seconds < 1 || seconds > 2147483647)) { setError('Thời gian phải lớn hơn 0 và nằm trong giới hạn số giây hợp lệ.'); return }
    const parsed = sectionRequestSchema.safeParse({ title, skill: skill || null, partNo: partNo === '' ? null : Number(partNo), sortOrder, timeLimitSeconds: seconds, instructions: instructions.trim() || null, coverAssetId: section?.coverAssetId ?? null })
    if (!parsed.success) { setError('Kiểm tra kỹ năng, phần thi (1–4) và thời gian.'); return }
    setError(null)
    await onSave(parsed.data)
  }
  return <form aria-label={section ? `Sửa phần ${section.title}` : 'Thêm phần'} className="adm-card" noValidate onSubmit={(event) => void submit(event)}>
    <h3>{section ? 'Sửa phần' : 'Thêm phần'}</h3>
    {error ? <p className="adm-alert adm-alert--error" role="alert">{error}</p> : null}
    <fieldset className="adm-package-fields" disabled={busy}>
      <label className="adm-field"><span>Tiêu đề phần</span><input className="adm-input" required maxLength={255} value={title} onChange={(event) => setTitle(event.target.value)} /></label>
      <div className="adm-package-form-grid">
        <label className="adm-field"><span>Kỹ năng</span><select className="adm-select" value={skill} onChange={(event) => setSkill(event.target.value as typeof skill)}><option value="">Chưa chọn</option>{Object.entries(SECTION_SKILL_LABEL).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
        <label className="adm-field"><span>Phần thi</span><select className="adm-select" value={partNo} onChange={(event) => setPartNo(event.target.value)}><option value="">Không chỉ định</option>{[1, 2, 3, 4].map((part) => <option key={part} value={part}>Phần {part}</option>)}</select></label>
        <label className="adm-field"><span>Thời gian (phút)</span><input className="adm-input" type="number" min={0} step="any" value={minutes} onChange={(event) => setMinutes(event.target.value)} /></label>
      </div>
      <label className="adm-field"><span>Hướng dẫn</span><textarea className="adm-textarea" value={instructions} onChange={(event) => setInstructions(event.target.value)} /></label>
      <p className="adm-muted">Dùng nút lên/xuống trong danh sách để đổi thứ tự phần.</p>
      <div className="adm-package-actions"><button className="adm-btn adm-btn--primary" type="submit">{busy ? 'Đang lưu…' : 'Lưu phần'}</button><button className="adm-btn" type="button" onClick={onCancel}>Hủy</button></div>
    </fieldset>
  </form>
}
