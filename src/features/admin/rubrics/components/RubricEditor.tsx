import { useState, type FormEvent } from 'react'
import { ArrowDown, ArrowUp } from 'lucide-react'
import { adminErrorCode, adminErrorMessage } from '../../lib/adminErrors'
import { activateRubric, createRubric, updateRubric } from '../api/rubricApi'
import { activationProblem, rubricRequest } from '../lib/rubricDraft'
import { RUBRIC_BANDS, rubricRequestSchema, type RubricRequest } from '../types'
import { CriterionEditor } from './CriterionEditor'

export function RubricEditor({ initial, persisted, onSaved, onActivated, onCancel }: {
  initial: RubricRequest; persisted: boolean; onSaved: () => void; onActivated: () => void; onCancel: () => void
}) {
  const [draft, setDraft] = useState(initial)
  const [saved, setSaved] = useState(persisted)
  const [dirty, setDirty] = useState(!persisted)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  function change(next: RubricRequest) { setDraft(next); setDirty(true); setNotice(null) }
  function move(index: number, delta: number) {
    const criteria = [...draft.criteria]
    ;[criteria[index], criteria[index + delta]] = [criteria[index + delta]!, criteria[index]!]
    change({ ...draft, criteria: criteria.map((item, position) => ({ ...item, sortOrder: position + 1 })) })
  }
  function errorText(reason: unknown) { return adminErrorCode(reason) === 'RUBRIC_NOT_EDITABLE' ? 'Bản này đã được kích hoạt, không còn sửa được. Tải lại danh sách để tạo bản nháp mới.' : adminErrorMessage(reason) }
  async function save(event: FormEvent) {
    event.preventDefault()
    if (busy) return
    const parsed = rubricRequestSchema.safeParse(draft)
    if (!parsed.success) { setError('Nhập nguồn, mã, tên và mô tả cho mọi tiêu chí; mỗi tiêu chí cần ít nhất một band không trùng, đủ nội dung. Bài mẫu cần đầy đủ đề, bài và nhận xét.'); return }
    setBusy(true)
    setError(null)
    setNotice(null)
    try {
      const result = saved ? await updateRubric(parsed.data) : await createRubric(parsed.data)
      setDraft(rubricRequest(result))
      setSaved(true)
      setDirty(false)
      setNotice('Đã lưu bản nháp.')
      onSaved()
    } catch (reason) { setError(errorText(reason)) } finally { setBusy(false) }
  }
  async function activate() {
    if (busy || dirty || !saved) return
    const problem = activationProblem(draft)
    if (problem) { setError(problem); return }
    if (!window.confirm(`Rubric này sẽ được dùng để chấm mọi bài Writing Task ${draft.task === 'TASK_1' ? '1' : '2'} từ bây giờ. Bản đang dùng sẽ ngừng áp dụng. Bạn có muốn kích hoạt ${draft.code} phiên bản ${draft.version}?`)) return
    setBusy(true)
    setError(null)
    try { await activateRubric(draft.code, draft.version); onActivated() } catch (reason) { setError(errorText(reason)) } finally { setBusy(false) }
  }
  return <form className="adm-card adm-rubric-editor" aria-label="Soạn rubric" noValidate onSubmit={(event) => void save(event)}>
    <h2>{draft.code} · Bản nháp {draft.version}</h2>
    <p className="adm-muted">Kích hoạt cần đúng {draft.task === 'TASK_1' ? 'TA' : 'TR'}, CC, LR, GRA; mỗi tiêu chí có đủ band 4,0–9,0 theo bước 0,5. Lưu bản nháp trước khi kích hoạt.</p>
    {error ? <div className="adm-alert adm-alert--error" role="alert">{error}</div> : null}
    {notice ? <p role="status">{notice}</p> : null}
    <fieldset className="adm-rubric-fields" disabled={busy}>
      <label className="adm-field"><span>Nguồn rubric</span><textarea className="adm-textarea" required maxLength={10000} value={draft.sourceNote} onChange={(event) => change({ ...draft, sourceNote: event.target.value })} /></label>
      {draft.criteria.map((criterion, index) => <div key={index}>
        <CriterionEditor criterion={criterion} index={index} onChange={(next) => change({ ...draft, criteria: draft.criteria.map((item, position) => position === index ? next : item) })} />
        <div className="adm-rubric-actions">
          <button className="adm-btn" aria-label={`Đưa tiêu chí ${index + 1} lên`} disabled={index === 0} type="button" onClick={() => move(index, -1)}><ArrowUp aria-hidden="true" size={16} /></button>
          <button className="adm-btn" aria-label={`Đưa tiêu chí ${index + 1} xuống`} disabled={index === draft.criteria.length - 1} type="button" onClick={() => move(index, 1)}><ArrowDown aria-hidden="true" size={16} /></button>
          <button className="adm-btn adm-btn--danger" type="button" onClick={() => change({ ...draft, criteria: draft.criteria.filter((_, position) => position !== index).map((item, position) => ({ ...item, sortOrder: position + 1 })) })}>Xóa tiêu chí {index + 1}</button>
        </div>
      </div>)}
      <button className="adm-btn" type="button" onClick={() => change({ ...draft, criteria: [...draft.criteria, { code: '', name: '', description: '', sortOrder: draft.criteria.length + 1, bandDescriptors: [{ band: 4, descriptor: '' }] }] })}>Thêm tiêu chí</button>
      <h3>Bài mẫu</h3>
      {draft.examples.map((example, index) => <fieldset className="adm-card adm-rubric-example" key={index}>
        <legend>Bài mẫu {index + 1}</legend>
        <label className="adm-field"><span>Band bài mẫu {index + 1}</span><select className="adm-select" value={example.band} onChange={(event) => change({ ...draft, examples: draft.examples.map((item, position) => position === index ? { ...item, band: Number(event.target.value) } : item) })}>{RUBRIC_BANDS.map((band) => <option key={band} value={band}>{band.toFixed(1)}</option>)}</select></label>
        {(['prompt', 'essay', 'commentary'] as const).map((field) => <label className="adm-field" key={field}><span>{field === 'prompt' ? 'Đề' : field === 'essay' ? 'Bài viết' : 'Nhận xét'} bài mẫu {index + 1}</span><textarea className="adm-textarea" required maxLength={field === 'essay' ? 50000 : 20000} value={example[field]} onChange={(event) => change({ ...draft, examples: draft.examples.map((item, position) => position === index ? { ...item, [field]: event.target.value } : item) })} /></label>)}
        <button className="adm-btn adm-btn--danger" type="button" onClick={() => change({ ...draft, examples: draft.examples.filter((_, position) => position !== index) })}>Xóa bài mẫu {index + 1}</button>
      </fieldset>)}
      <button className="adm-btn" type="button" onClick={() => change({ ...draft, examples: [...draft.examples, { band: 6.5, prompt: '', essay: '', commentary: '' }] })}>Thêm bài mẫu</button>
      <div className="adm-rubric-actions">
        <button className="adm-btn adm-btn--primary" type="submit">{busy ? 'Đang xử lý…' : 'Lưu bản nháp'}</button>
        <button className="adm-btn" type="button" disabled={!saved || dirty} onClick={() => void activate()}>Kích hoạt</button>
        <button className="adm-btn" type="button" onClick={onCancel}>Đóng trình soạn</button>
      </div>
    </fieldset>
  </form>
}
