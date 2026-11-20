import { useMemo, useState, type FormEvent } from 'react'
import { z } from 'zod'
import { AdminField } from '../../components/AdminField'
import { adminErrorMessage } from '../../lib/adminErrors'
import { bandText, requiredText } from '@/lib/validation/fields'
import { useFormErrors } from '@/lib/validation/useFormErrors'
import { addGoldEssay } from '../api/evaluationApi'
import { newGoldEssaySchema, type WritingTask } from '../types'
import { useAdminError } from '../../lib/useAdminError'
import { AdminSwitch } from '../../components/AdminSwitch'

const CRITERION_LABELS = ['TA/TR', 'CC', 'LR', 'GRA']

/** The prompt, the essay and the band always; the chart facts for Task 1; the four criterion bands when they are given. */
function goldEssaySchema(task: WritingTask, withCriteria: boolean) {
  const shape: Record<string, z.ZodType> = {
    prompt: requiredText('Đề bài', 20000),
    essay: requiredText('Bài viết chuẩn', 50000),
    band: bandText('Band giám khảo'),
  }
  if (task === 'TASK_1') shape.chartFacts = requiredText('Số liệu biểu đồ', 20000)
  if (withCriteria) CRITERION_LABELS.forEach((label, index) => { shape[`criterion${index}`] = bandText(`Band ${label}`) })
  return z.object(shape)
}

export function GoldEssayForm({ onSaved, onCancel }: { onSaved: () => void; onCancel: () => void }) {
  const [task, setTask] = useState<WritingTask>('TASK_2')
  const [prompt, setPrompt] = useState('')
  const [chartFacts, setChartFacts] = useState('')
  const [essay, setEssay] = useState('')
  const [band, setBand] = useState('6.5')
  const [withCriteria, setWithCriteria] = useState(false)
  const [criteria, setCriteria] = useState(['6.5', '6.5', '6.5', '6.5'])
  const [codes, setCodes] = useState('')
  const [busy, setBusy] = useState(false)
  const [, setError] = useAdminError()
  const schema = useMemo(() => goldEssaySchema(task, withCriteria), [task, withCriteria])
  const form = useFormErrors(schema, { prompt, chartFacts, essay, band, ...Object.fromEntries(criteria.map((value, index) => [`criterion${index}`, value])) })
  async function submit(event: FormEvent) {
    event.preventDefault(); if (busy) return
    if (!form.validate()) return
    const body = newGoldEssaySchema.safeParse({ task, prompt, chartFacts: task === 'TASK_1' ? chartFacts : undefined, essay, examinerBand: Number(band), examinerCriteria: withCriteria ? [task === 'TASK_1' ? 'TA' : 'TR', 'CC', 'LR', 'GRA'].map((code, index) => ({ code, band: Number(criteria[index]) })) : undefined, examinerErrorCodes: codes.trim() ? codes.split(/[,;\n]+/).map((code) => code.trim()).filter(Boolean) : undefined })
    if (!body.success) return
    setBusy(true); setError(null)
    try { await addGoldEssay(body.data); onSaved() }
    catch (reason) { setError(adminErrorMessage(reason)) }
    finally { setBusy(false) }
  }
  return <form aria-label="Thêm bài chuẩn" noValidate onSubmit={(event) => void submit(event)}><fieldset className="adm-evaluation-fields" disabled={busy}>
    <label className="adm-field"><span>Task bài chuẩn</span><select className="adm-select" value={task} onChange={(event) => setTask(event.target.value as WritingTask)}><option value="TASK_1">Task 1</option><option value="TASK_2">Task 2</option></select></label>
    <AdminField label="Đề bài" {...form.field('prompt')}><textarea className="adm-textarea" value={prompt} onChange={(event) => setPrompt(event.target.value)} /></AdminField>
    {task === 'TASK_1' ? <AdminField label="Số liệu biểu đồ" {...form.field('chartFacts')}><textarea className="adm-textarea" value={chartFacts} onChange={(event) => setChartFacts(event.target.value)} /></AdminField> : null}
    <AdminField label="Bài viết chuẩn" {...form.field('essay')}><textarea className="adm-textarea" value={essay} onChange={(event) => setEssay(event.target.value)} /></AdminField>
    <AdminField label="Band giám khảo" {...form.field('band')}><input className="adm-input" type="number" min="0" max="9" step="0.5" value={band} onChange={(event) => setBand(event.target.value)} /></AdminField>
    <AdminSwitch checked={withCriteria} onChange={setWithCriteria}>Nhập điểm theo tiêu chí</AdminSwitch>
    {withCriteria ? CRITERION_LABELS.map((label, index) => <AdminField key={label} label={`Band ${label}`} {...form.field(`criterion${index}`)}><input className="adm-input" type="number" min="0" max="9" step="0.5" value={criteria[index]} onChange={(event) => setCriteria(criteria.map((value, position) => position === index ? event.target.value : value))} /></AdminField>) : null}
    <label className="adm-field"><span>Mã lỗi (tùy chọn, cách bằng dấu phẩy)</span><textarea className="adm-textarea" value={codes} onChange={(event) => setCodes(event.target.value)} /></label>
    <div className="adm-form-footer"><button className="adm-btn" type="button" onClick={onCancel}>Hủy thêm bài</button><button className="adm-btn adm-btn--primary" type="submit">{busy ? 'Đang lưu…' : 'Lưu bài chuẩn'}</button></div>
  </fieldset></form>
}
