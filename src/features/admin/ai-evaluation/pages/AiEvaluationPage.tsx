import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { AdminDrawer } from '../../components/AdminLayer'
import { AdminEmpty, AdminError, AdminLoading } from '../../components/AdminState'
import { AdminPage } from '../../pages/AdminPage'
import { useAdminResource } from '../../lib/useAdminResource'
import { adminErrorMessage } from '../../lib/adminErrors'
import { useDraftPolling } from '../../ai-drafts/lib/useDraftPolling'
import { importComparisons, listActivations, listEvaluations, listGoldEssays, startEvaluation } from '../api/evaluationApi'
import { GoldEssayForm } from '../components/GoldEssayForm'
import { percent } from '../lib/evaluationLabels'
import type { WritingTask } from '../types'
import '../evaluation.css'


export function AiEvaluationPage() {
  const [tab, setTab] = useState<'gold' | 'runs'>('gold')
  const [task, setTask] = useState<WritingTask | ''>('')
  const [runTask, setRunTask] = useState<WritingTask>('TASK_2')
  const [page, setPage] = useState(0)
  const [adding, setAdding] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const navigate = useNavigate()
  const activations = useAdminResource('prompt-activations', listActivations)
  const gold = useAdminResource(`gold-essays:${task}:${page}:${tab}`, (signal) => tab === 'gold' ? listGoldEssays(task, page, signal) : Promise.resolve(null))
  const runs = useAdminResource(`evaluation-runs:${task}:${page}:${tab}`, (signal) => tab === 'runs' ? listEvaluations(task, page, signal) : Promise.resolve(null))
  useDraftPolling(runs.status === 'success' && !!runs.data?.content.some((run) => run.status === 'RUNNING'), runs.reload)
  async function mutate(action: () => Promise<void>) { if (busy) return; setBusy(true); setError(null); setNotice(null); try { await action() } catch (reason) { setError(adminErrorMessage(reason)) } finally { setBusy(false) } }
  const resource = tab === 'gold' ? gold : runs
  return <AdminPage title="Đánh giá AI chấm Writing" subtitle="Đối chiếu với bộ bài do giám khảo chấm trước khi kích hoạt bản chấm cho học viên."><div className="adm-evaluation-workspace">
    <section aria-label="Bản chấm đang sử dụng"><h2>Bản chấm đang sử dụng</h2>{activations.status === 'loading' ? <AdminLoading /> : activations.status === 'error' ? <AdminError message={activations.error!} onRetry={activations.reload} /> : activations.data?.map((item) => <div className="adm-alert" key={item.task}>{item.promptVersion ? <p>{item.task === 'TASK_1' ? 'Task 1' : 'Task 2'} đang dùng bản {item.promptVersion}, kích hoạt ngày {item.activatedAt ? new Date(item.activatedAt).toLocaleString('vi-VN') : '—'}. {item.runId ? <Link to={`/content-author/ai-evaluation/runs/${item.runId}`}>Xem lượt đánh giá</Link> : null}</p> : <p>{item.task === 'TASK_1' ? 'Task 1' : 'Task 2'} chưa được kiểm định. AI đang chấm học viên bằng rubric hiện tại, chưa đối chiếu với giám khảo.</p>}</div>)}</section>
    <div className="adm-evaluation-actions"><button className="adm-btn" type="button" aria-pressed={tab === 'gold'} onClick={() => { setTab('gold'); setPage(0) }}>Bộ bài chuẩn</button><button className="adm-btn" type="button" aria-pressed={tab === 'runs'} onClick={() => { setTab('runs'); setPage(0) }}>Các lượt đánh giá</button></div>
    <label className="adm-field"><span>Lọc theo Task</span><select className="adm-select" value={task} onChange={(event) => { setTask(event.target.value as WritingTask | ''); setPage(0) }}><option value="">Tất cả Task</option><option value="TASK_1">Task 1</option><option value="TASK_2">Task 2</option></select></label>
    {tab === 'gold' ? <><div className="adm-evaluation-actions"><button className="adm-btn adm-btn--primary" disabled={busy || adding} type="button" onClick={() => setAdding(true)}>Thêm bài chuẩn</button><button className="adm-btn" disabled={busy} type="button" onClick={() => void mutate(async () => { const result = await importComparisons(); setNotice(`Đã nhập ${result.imported} bài`); gold.reload() })}>Nhập từ các bài AI và giám khảo đã cùng chấm</button></div>{adding ? <AdminDrawer title="Thêm bài chuẩn" size="lg" onClose={() => setAdding(false)}>{(close) => <GoldEssayForm onCancel={close} onSaved={() => { gold.reload(); setNotice('Đã thêm bài chuẩn'); close() }} />}</AdminDrawer> : null}</> : <fieldset className="adm-evaluation-actions" disabled={busy}><label className="adm-field"><span>Task cần đánh giá</span><select className="adm-select" value={runTask} onChange={(event) => setRunTask(event.target.value as WritingTask)}><option value="TASK_1">Task 1</option><option value="TASK_2">Task 2</option></select></label><button className="adm-btn adm-btn--primary" type="button" onClick={() => void mutate(async () => { const run = await startEvaluation(runTask); navigate(`/content-author/ai-evaluation/runs/${run.id}`) })}>Chạy đánh giá</button></fieldset>}
    {error ? <p role="alert" className="adm-alert adm-alert--error">{error}</p> : null}{notice ? <p role="status">{notice}</p> : null}
    {resource.status === 'loading' ? <AdminLoading /> : resource.status === 'error' ? <AdminError message={resource.error!} onRetry={resource.reload} /> : resource.data?.content.length === 0 ? <AdminEmpty title={tab === 'gold' ? 'Chưa có bài chuẩn' : 'Chưa có lượt đánh giá'} /> : null}
    {tab === 'gold' && gold.data ? <><p>{gold.data.totalElements} bài chuẩn {task ? `cho ${task === 'TASK_1' ? 'Task 1' : 'Task 2'}` : 'của hai Task'}</p><div className="adm-table-wrap"><table className="adm-table"><thead><tr><th className="adm-stt" scope="col">STT</th><th>Task</th><th>Band giám khảo</th><th>Nguồn</th><th>Đầu bài viết</th><th>Ngày thêm</th></tr></thead><tbody>{gold.data.content.map((item, index) => <tr key={item.id}><td className="adm-stt">{page * 20 + index + 1}</td><td>{item.task === 'TASK_1' ? 'Task 1' : 'Task 2'}</td><td>{item.examinerBand}</td><td>{item.source === 'MANUAL' ? 'Nhập tay' : 'Bài đối chiếu'}</td><td>{item.essayPreview}</td><td>{new Date(item.createdAt).toLocaleString('vi-VN')}</td></tr>)}</tbody></table></div></> : null}
    {tab === 'runs' && runs.data ? <div className="adm-table-wrap"><table className="adm-table"><thead><tr><th className="adm-stt" scope="col">STT</th><th>Lượt</th><th>Trạng thái</th><th>Số bài</th><th>Lệch ≤ 0,5 band</th><th>QWK</th><th>Kết quả</th></tr></thead><tbody>{runs.data.content.map((run, index) => <tr key={run.id}><td className="adm-stt">{page * 20 + index + 1}</td><td><Link to={`/content-author/ai-evaluation/runs/${run.id}`}>{run.task === 'TASK_1' ? 'Task 1' : 'Task 2'} · {new Date(run.startedAt).toLocaleString('vi-VN')}</Link></td><td>{run.status === 'RUNNING' ? 'Đang chạy' : run.status === 'DONE' ? 'Đã xong' : 'Lỗi'}</td><td>{run.n}</td><td>{percent(run.withinHalfBand)}</td><td>{run.qwk ?? 'Chưa có'}</td><td>{run.passed === null ? 'Chưa có' : run.passed ? 'Đạt' : 'Chưa đạt'}</td></tr>)}</tbody></table></div> : null}
    <nav className="adm-evaluation-actions" aria-label="Phân trang đánh giá"><button className="adm-btn" type="button" disabled={!page || resource.status !== 'success'} onClick={() => setPage(page - 1)}>Trang trước</button><span>Trang {page + 1}</span><button className="adm-btn" type="button" disabled={resource.status !== 'success' || !resource.data || (page + 1) * 20 >= resource.data.totalElements} onClick={() => setPage(page + 1)}>Trang sau</button></nav>
  </div></AdminPage>
}
