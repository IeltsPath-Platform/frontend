import { useMemo, useState, type FormEvent } from 'react'
import { z } from 'zod'
import { AdminField } from '../../components/AdminField'
import { SECTION_SKILL_LABEL } from '../lib/packageLabels'
import { sectionRequestSchema, type PackageSection, type SectionRequest } from '../types'
import { useAdminError } from '../../lib/useAdminError'
import { requiredText } from '@/lib/validation/fields'
import { useFormErrors } from '@/lib/validation/useFormErrors'

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
  const [, setError] = useAdminError()
  const schema = useMemo(() => z.object({ title: requiredText('Tiêu đề phần', 255), minutes: z.string() }).superRefine((value, ctx) => {
    if (section && value.minutes === initialMinutes) return // the time is kept as it was saved
    const text = value.minutes.trim()
    if (text === '') return
    const seconds = Math.round(Number(text) * 60)
    if (!Number.isFinite(Number(text)) || Number(text) <= 0 || !Number.isSafeInteger(seconds) || seconds < 1 || seconds > 2147483647) {
      ctx.addIssue({ code: 'custom', path: ['minutes'], message: 'Thời gian phải lớn hơn 0 và nằm trong giới hạn số giây hợp lệ.' })
    }
  }), [section, initialMinutes])
  const form = useFormErrors(schema, { title, minutes })
  async function submit(event: FormEvent) {
    event.preventDefault()
    if (busy) return
    if (!form.validate()) return
    const preservingTime = !!section && minutes === initialMinutes
    const seconds = preservingTime ? section.timeLimitSeconds : minutes.trim() === '' ? null : Math.round(Number(minutes) * 60)
    const parsed = sectionRequestSchema.safeParse({ title, skill: skill || null, partNo: partNo === '' ? null : Number(partNo), sortOrder, timeLimitSeconds: seconds, instructions: instructions.trim() || null, coverAssetId: section?.coverAssetId ?? null })
    if (!parsed.success) { setError('Kiểm tra kỹ năng, phần thi (1–4) và thời gian.'); return }
    setError(null)
    await onSave(parsed.data)
  }
  return <form aria-label={section ? `Sửa phần ${section.title}` : 'Thêm phần'} className="adm-card" noValidate onSubmit={(event) => void submit(event)}>
    <h3>{section ? 'Sửa phần' : 'Thêm phần'}</h3>
    <fieldset className="adm-package-fields" disabled={busy}>
      <AdminField label="Tiêu đề phần" {...form.field('title')}><input className="adm-input" maxLength={255} value={title} onChange={(event) => setTitle(event.target.value)} /></AdminField>
      <div className="adm-package-form-grid">
        <label className="adm-field"><span>Kỹ năng</span><select className="adm-select" value={skill} onChange={(event) => setSkill(event.target.value as typeof skill)}><option value="">Chưa chọn</option>{Object.entries(SECTION_SKILL_LABEL).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
        <label className="adm-field"><span>Phần thi</span><select className="adm-select" value={partNo} onChange={(event) => setPartNo(event.target.value)}><option value="">Không chỉ định</option>{[1, 2, 3, 4].map((part) => <option key={part} value={part}>Phần {part}</option>)}</select></label>
        <AdminField label="Thời gian (phút)" {...form.field('minutes')}><input className="adm-input" type="number" min={0} step="any" value={minutes} onChange={(event) => setMinutes(event.target.value)} /></AdminField>
      </div>
      <label className="adm-field"><span>Hướng dẫn</span><textarea className="adm-textarea" value={instructions} onChange={(event) => setInstructions(event.target.value)} /></label>
      <p className="adm-muted">Dùng nút lên/xuống trong danh sách để đổi thứ tự phần.</p>
      <div className="adm-package-actions"><button className="adm-btn adm-btn--primary" type="submit">{busy ? 'Đang lưu…' : 'Lưu phần'}</button><button className="adm-btn" type="button" onClick={onCancel}>Hủy</button></div>
    </fieldset>
  </form>
}
