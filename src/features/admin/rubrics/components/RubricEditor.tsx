import { useMemo, useState, type FormEvent } from 'react'
import { ArrowDown, ArrowUp } from 'lucide-react'
import { z } from 'zod'
import { AdminField } from '../../components/AdminField'
import { useAdminConfirm } from '../../lib/useAdminConfirm'
import { requiredText } from '@/lib/validation/fields'
import { useFormErrors } from '@/lib/validation/useFormErrors'
import { adminErrorCode, adminErrorMessage } from '../../lib/adminErrors'
import { activateRubric, createRubric, updateRubric } from '../api/rubricApi'
import { activationProblem, rubricRequest } from '../lib/rubricDraft'
import { RUBRIC_BANDS, rubricRequestSchema, type RubricRequest } from '../types'
import { CriterionEditor } from './CriterionEditor'
import { useAdminError } from '../../lib/useAdminError'

/**
 * Every input of the editor has a flat key (`sourceNote`, `c0_name`, `c0_b1_descriptor`, `e0_essay`…) so each can show
 * its own message. The structural rules of `rubricRequestSchema` (a repeated criterion code, a repeated band…) are run
 * on the whole draft and their messages are moved onto the keys of the inputs they are about.
 */
function flatKey(path: readonly PropertyKey[]): string {
  const [first, index, second, subIndex, last] = path
  if (first === 'criteria' && typeof index === 'number') {
    if (second === 'bandDescriptors' && typeof subIndex === 'number') return `c${index}_b${subIndex}_${String(last ?? 'band')}`
    return `c${index}_${String(second ?? 'criterion')}`
  }
  if (first === 'examples' && typeof index === 'number') return `e${index}_${String(second ?? 'example')}`
  return path.map(String).join('_')
}

/** The number of bands of every criterion and of examples: the schema only needs to be rebuilt when this changes. */
function shapeOf(draft: RubricRequest): string {
  return `${draft.criteria.map((criterion) => criterion.bandDescriptors.length).join(',')}|${draft.examples.length}`
}

function flatValues(draft: RubricRequest): Record<string, unknown> {
  const values: Record<string, unknown> = { sourceNote: draft.sourceNote, systemPrompt: draft.systemPrompt ?? '', whole: draft }
  draft.criteria.forEach((criterion, i) => {
    values[`c${i}_name`] = criterion.name
    values[`c${i}_description`] = criterion.description
    criterion.bandDescriptors.forEach((item, j) => { values[`c${i}_b${j}_descriptor`] = item.descriptor })
  })
  draft.examples.forEach((example, i) => {
    values[`e${i}_prompt`] = example.prompt
    values[`e${i}_essay`] = example.essay
    values[`e${i}_commentary`] = example.commentary
  })
  return values
}

function rubricFormSchema(draft: RubricRequest) {
  const shape: Record<string, z.ZodType> = { sourceNote: requiredText('Nguồn rubric', 10000), systemPrompt: z.string(), whole: z.unknown() }
  draft.criteria.forEach((criterion, i) => {
    const n = i + 1
    shape[`c${i}_name`] = requiredText(`Tên tiêu chí ${n}`, 120)
    shape[`c${i}_description`] = requiredText(`Mô tả tiêu chí ${n}`, 20000)
    criterion.bandDescriptors.forEach((_, j) => { shape[`c${i}_b${j}_descriptor`] = requiredText(`Mô tả band ${j + 1} của tiêu chí ${n}`, 20000) })
  })
  draft.examples.forEach((_, i) => {
    const n = i + 1
    shape[`e${i}_prompt`] = requiredText(`Đề bài mẫu ${n}`, 20000)
    shape[`e${i}_essay`] = requiredText(`Bài viết mẫu ${n}`, 50000)
    shape[`e${i}_commentary`] = requiredText(`Nhận xét bài mẫu ${n}`, 20000)
  })
  return z.object(shape).superRefine((values, ctx) => {
    const parsed = rubricRequestSchema.safeParse(values.whole)
    if (parsed.success) return
    for (const issue of parsed.error.issues) ctx.addIssue({ code: 'custom', path: [flatKey(issue.path)], message: issue.message })
  })
}

export function RubricEditor({ initial, persisted, onSaved, onActivated, onCancel }: {
  initial: RubricRequest; persisted: boolean; onSaved: () => void; onActivated: () => void; onCancel: () => void
}) {
  const { confirm, confirmDialog } = useAdminConfirm()
  const [draft, setDraft] = useState(initial)
  const [saved, setSaved] = useState(persisted)
  const [dirty, setDirty] = useState(!persisted)
  const [busy, setBusy] = useState(false)
  const [, setError] = useAdminError()
  const [notice, setNotice] = useState<string | null>(null)
  /** What is missing before this rubric can be activated; it is about the whole rubric, so it sits at the foot. */
  const [activationError, setActivationError] = useState<string | null>(null)
  const shape = shapeOf(draft)
  // eslint-disable-next-line react-hooks/exhaustive-deps -- the field names follow `shape`; their values come in through `flatValues`
  const schema = useMemo(() => rubricFormSchema(draft), [shape])
  const form = useFormErrors(schema, flatValues(draft))
  function change(next: RubricRequest) { setDraft(next); setDirty(true); setNotice(null); setActivationError(null) }
  function move(index: number, delta: number) {
    const criteria = [...draft.criteria]
    ;[criteria[index], criteria[index + delta]] = [criteria[index + delta]!, criteria[index]!]
    change({ ...draft, criteria: criteria.map((item, position) => ({ ...item, sortOrder: position + 1 })) })
  }
  function errorText(reason: unknown) { return adminErrorCode(reason) === 'RUBRIC_NOT_EDITABLE' ? 'Bản này đã được kích hoạt, không còn sửa được. Tải lại danh sách để tạo bản nháp mới.' : adminErrorMessage(reason) }
  async function save(event: FormEvent) {
    event.preventDefault()
    if (busy) return
    if (!form.validate()) return
    const parsed = rubricRequestSchema.safeParse(draft)
    if (!parsed.success) return
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
    if (problem) { setActivationError(problem); return }
    setActivationError(null)
    if (!(await confirm({
      title: 'Kích hoạt rubric này?',
          message: `Rubric này sẽ được dùng để chấm mọi bài ${draft.task === 'SPEAKING' ? 'Speaking' : `Writing Task ${draft.task === 'TASK_1' ? '1' : '2'}`} từ bây giờ. Bản đang dùng sẽ ngừng áp dụng. Bạn có muốn kích hoạt ${draft.code} phiên bản ${draft.version}?`,
      confirmLabel: 'Kích hoạt',
    }))) return
    setBusy(true)
    setError(null)
    try { await activateRubric(draft.code, draft.version); onActivated() } catch (reason) { setError(errorText(reason)) } finally { setBusy(false) }
  }
  return <form className="adm-rubric-editor" aria-label="Soạn rubric" noValidate onSubmit={(event) => void save(event)}>
    {confirmDialog}
    <p className="adm-muted">{draft.task === 'SPEAKING' ? 'Kích hoạt cần FC, LR, GRA và PR; mỗi tiêu chí có đủ band 0,0–9,0 theo bước 0,5.' : `Kích hoạt cần đúng ${draft.task === 'TASK_1' ? 'TA' : 'TR'}, CC, LR, GRA; mỗi tiêu chí có đủ band 4,0–9,0 theo bước 0,5.`} Lưu bản nháp trước khi kích hoạt.</p>
    {notice ? <p role="status">{notice}</p> : null}
    <fieldset className="adm-rubric-fields" disabled={busy}>
      <AdminField label="Nguồn rubric" {...form.field('sourceNote')}><textarea className="adm-textarea" maxLength={10000} value={draft.sourceNote} onChange={(event) => change({ ...draft, sourceNote: event.target.value })} /></AdminField>
      {draft.task === 'SPEAKING' ? <AdminField label="System prompt (tối đa 4.000 ký tự)" {...form.field('systemPrompt')}><textarea className="adm-textarea" maxLength={4000} value={draft.systemPrompt ?? ''} onChange={(event) => change({ ...draft, systemPrompt: event.target.value })} /></AdminField> : null}
      {draft.criteria.map((criterion, index) => <div key={index}>
        <CriterionEditor criterion={criterion} index={index} task={draft.task} field={form.field} onChange={(next) => change({ ...draft, criteria: draft.criteria.map((item, position) => position === index ? next : item) })} />
        <div className="adm-rubric-actions">
          <button className="adm-btn" aria-label={`Đưa tiêu chí ${index + 1} lên`} disabled={index === 0} type="button" onClick={() => move(index, -1)}><ArrowUp aria-hidden="true" size={16} /></button>
          <button className="adm-btn" aria-label={`Đưa tiêu chí ${index + 1} xuống`} disabled={index === draft.criteria.length - 1} type="button" onClick={() => move(index, 1)}><ArrowDown aria-hidden="true" size={16} /></button>
          <button className="adm-btn adm-btn--danger" type="button" onClick={() => change({ ...draft, criteria: draft.criteria.filter((_, position) => position !== index).map((item, position) => ({ ...item, sortOrder: position + 1 })) })}>Xóa tiêu chí {index + 1}</button>
        </div>
      </div>)}
      <button className="adm-btn" type="button" onClick={() => change({ ...draft, criteria: [...draft.criteria, { code: draft.task === 'SPEAKING' ? 'FC' : draft.task === 'TASK_1' ? 'TA' : 'TR', name: '', description: '', sortOrder: draft.criteria.length + 1, bandDescriptors: [{ band: draft.task === 'SPEAKING' ? 0 : 4, descriptor: '' }] }] })}>Thêm tiêu chí</button>
      <h3>Bài mẫu</h3>
      {draft.examples.map((example, index) => <fieldset className="adm-card adm-rubric-example" key={index}>
        <legend>Bài mẫu {index + 1}</legend>
        <AdminField label={`Band bài mẫu ${index + 1}`} {...form.field(`e${index}_band`)}><select className="adm-select" value={example.band} onChange={(event) => change({ ...draft, examples: draft.examples.map((item, position) => position === index ? { ...item, band: Number(event.target.value) } : item) })}>{RUBRIC_BANDS.map((band) => <option key={band} value={band}>{band.toFixed(1)}</option>)}</select></AdminField>
        {(['prompt', 'essay', 'commentary'] as const).map((part) => <AdminField key={part} label={`${part === 'prompt' ? 'Đề' : part === 'essay' ? 'Bài viết' : 'Nhận xét'} bài mẫu ${index + 1}`} {...form.field(`e${index}_${part}`)}><textarea className="adm-textarea" maxLength={part === 'essay' ? 50000 : 20000} value={example[part]} onChange={(event) => change({ ...draft, examples: draft.examples.map((item, position) => position === index ? { ...item, [part]: event.target.value } : item) })} /></AdminField>)}
        <button className="adm-btn adm-btn--danger" type="button" onClick={() => change({ ...draft, examples: draft.examples.filter((_, position) => position !== index) })}>Xóa bài mẫu {index + 1}</button>
      </fieldset>)}
      <button className="adm-btn" type="button" onClick={() => change({ ...draft, examples: [...draft.examples, { band: 6.5, prompt: '', essay: '', commentary: '' }] })}>Thêm bài mẫu</button>
      {activationError ? <p className="adm-field__error" role="alert">{activationError}</p> : null}
      <div className="adm-form-footer">
        <button className="adm-btn" type="button" onClick={onCancel}>Đóng trình soạn</button>
        <button className="adm-btn" type="button" disabled={!saved || dirty} onClick={() => void activate()}>Kích hoạt</button>
        <button className="adm-btn adm-btn--primary" type="submit">{busy ? 'Đang xử lý…' : 'Lưu bản nháp'}</button>
      </div>
    </fieldset>
  </form>
}
