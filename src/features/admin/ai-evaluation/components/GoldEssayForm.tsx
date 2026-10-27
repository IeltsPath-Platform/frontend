import { useState, type FormEvent } from 'react'
import { adminErrorMessage } from '../../lib/adminErrors'
import { addGoldEssay } from '../api/evaluationApi'
import { newGoldEssaySchema, type WritingTask } from '../types'

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
  const [error, setError] = useState<string | null>(null)
  async function submit(event: FormEvent) {
    event.preventDefault(); if (busy) return
    const body = newGoldEssaySchema.safeParse({ task, prompt, chartFacts: task === 'TASK_1' ? chartFacts : undefined, essay, examinerBand: Number(band), examinerCriteria: withCriteria ? [task === 'TASK_1' ? 'TA' : 'TR', 'CC', 'LR', 'GRA'].map((code, index) => ({ code, band: Number(criteria[index]) })) : undefined, examinerErrorCodes: codes.trim() ? codes.split(/[,;\n]+/).map((code) => code.trim()).filter(Boolean) : undefined })
    if (!body.success) { setError('Điền đầy đủ đề bài, bài viết và band 0–9 theo bước 0,5. Task 1 cần số liệu biểu đồ.'); return }
    setBusy(true); setError(null)
    try { await addGoldEssay(body.data); onSaved() }
    catch (reason) { setError(adminErrorMessage(reason)) }
    finally { setBusy(false) }
  }
  return <form aria-label="Thêm bài chuẩn" onSubmit={(event) => void submit(event)}>{error ? <p role="alert" className="adm-alert adm-alert--error">{error}</p> : null}<fieldset className="adm-evaluation-fields" disabled={busy}>
    <label className="adm-field"><span>Task bài chuẩn</span><select className="adm-select" value={task} onChange={(event) => setTask(event.target.value as WritingTask)}><option value="TASK_1">Task 1</option><option value="TASK_2">Task 2</option></select></label>
    <label className="adm-field"><span>Đề bài</span><textarea className="adm-textarea" required value={prompt} onChange={(event) => setPrompt(event.target.value)} /></label>
    {task === 'TASK_1' ? <label className="adm-field"><span>Số liệu biểu đồ (bắt buộc)</span><textarea className="adm-textarea" required value={chartFacts} onChange={(event) => setChartFacts(event.target.value)} /></label> : null}
    <label className="adm-field"><span>Bài viết chuẩn</span><textarea className="adm-textarea" required value={essay} onChange={(event) => setEssay(event.target.value)} /></label>
    <label className="adm-field"><span>Band giám khảo</span><input className="adm-input" type="number" min="0" max="9" step="0.5" required value={band} onChange={(event) => setBand(event.target.value)} /></label>
    <label><input type="checkbox" checked={withCriteria} onChange={(event) => setWithCriteria(event.target.checked)} /> Nhập điểm theo tiêu chí</label>
    {withCriteria ? ['TA/TR', 'CC', 'LR', 'GRA'].map((label, index) => <label className="adm-field" key={label}><span>Band {label}</span><input className="adm-input" type="number" min="0" max="9" step="0.5" required value={criteria[index]} onChange={(event) => setCriteria(criteria.map((value, position) => position === index ? event.target.value : value))} /></label>) : null}
    <label className="adm-field"><span>Mã lỗi (tùy chọn, cách bằng dấu phẩy)</span><textarea className="adm-textarea" value={codes} onChange={(event) => setCodes(event.target.value)} /></label>
    <div className="adm-form-footer"><button className="adm-btn" type="button" onClick={onCancel}>Hủy thêm bài</button><button className="adm-btn adm-btn--primary" type="submit">{busy ? 'Đang lưu…' : 'Lưu bài chuẩn'}</button></div>
  </fieldset></form>
}
