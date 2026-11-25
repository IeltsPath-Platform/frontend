import { useState } from 'react'
import { useToast } from '@/components/toast/toastContext'
import { Link, useNavigate } from 'react-router-dom'
import { AdminDrawer } from '../../components/AdminLayer'
import { InfiniteCount, InfiniteSentinel } from '../../components/InfiniteSentinel'
import { AdminEmpty, AdminError, AdminLoading } from '../../components/AdminState'
import { AdminPage } from '../../pages/AdminPage'
import { useAdminResource } from '../../lib/useAdminResource'
import { useInfiniteList } from '../../lib/useInfiniteList'
import { adminErrorMessage } from '../../lib/adminErrors'
import { useDraftPolling } from '../../ai-drafts/lib/useDraftPolling'
import { importComparisons, listActivations, listEvaluations, listGoldEssays, startEvaluation } from '../api/evaluationApi'
import { GoldEssayForm } from '../components/GoldEssayForm'
import { percent } from '../lib/evaluationLabels'
import type { WritingTask } from '../types'
import '../evaluation.css'
import { useAdminError } from '../../lib/useAdminError'


export function AiEvaluationPage() {
  const [tab, setTab] = useState<'gold' | 'runs'>('gold')
  const [task, setTask] = useState<WritingTask | ''>('')
  const [runTask, setRunTask] = useState<WritingTask>('TASK_2')
  const [adding, setAdding] = useState(false)
  const [busy, setBusy] = useState(false)
  const [, setError] = useAdminError()
  const { toast } = useToast()
  const navigate = useNavigate()
  const activations = useAdminResource('prompt-activations', listActivations)
  const gold = useInfiniteList(`gold-essays:${task}:${tab}`, async (page, signal) => {
    if (tab !== 'gold') return { content: [], page: 0, totalElements: 0, totalPages: 0 }
    const result = await listGoldEssays(task, page, signal)
    return { content: result.content, page: result.page, totalElements: result.totalElements, totalPages: Math.ceil(result.totalElements / result.size) }
  })
  const runs = useInfiniteList(`evaluation-runs:${task}:${tab}`, async (page, signal) => {
    if (tab !== 'runs') return { content: [], page: 0, totalElements: 0, totalPages: 0 }
    const result = await listEvaluations(task, page, signal)
    return { content: result.content, page: result.page, totalElements: result.totalElements, totalPages: Math.ceil(result.totalElements / result.size) }
  })
  useDraftPolling(runs.status === 'success' && runs.items.some((run) => run.status === 'RUNNING'), runs.refresh)
  async function mutate(action: () => Promise<void>) { if (busy) return; setBusy(true); setError(null); try { await action() } catch (reason) { setError(adminErrorMessage(reason)) } finally { setBusy(false) } }
  const resource = tab === 'gold' ? gold : runs
  return <AdminPage title="Đánh giá AI chấm Writing" subtitle="Đối chiếu với bộ bài do giám khảo chấm trước khi kích hoạt bản chấm cho học viên."><div className="adm-evaluation-workspace">
    <section aria-label="Bản chấm đang sử dụng"><h2>Bản chấm đang sử dụng</h2>{activations.status === 'loading' ? <AdminLoading /> : activations.status === 'error' ? <AdminError message={activations.error!} onRetry={activations.reload} /> : activations.data?.map((item) => <div className="adm-alert" key={item.task}>{item.promptVersion ? <p>{item.task === 'TASK_1' ? 'Task 1' : 'Task 2'} đang dùng bản {item.promptVersion}, kích hoạt ngày {item.activatedAt ? new Date(item.activatedAt).toLocaleString('vi-VN') : '—'}. {item.runId ? <Link to={`/content-author/ai-evaluation/runs/${item.runId}`}>Xem lượt đánh giá</Link> : null}</p> : <p>{item.task === 'TASK_1' ? 'Task 1' : 'Task 2'} chưa được kiểm định. AI đang chấm học viên bằng rubric hiện tại, chưa đối chiếu với giám khảo.</p>}</div>)}</section>
    <div className="adm-evaluation-actions"><button className="adm-btn" type="button" aria-pressed={tab === 'gold'} onClick={() => setTab('gold')}>Bộ bài chuẩn</button><button className="adm-btn" type="button" aria-pressed={tab === 'runs'} onClick={() => setTab('runs')}>Các lượt đánh giá</button></div>
    <label className="adm-field"><span>Lọc theo Task</span><select className="adm-select" value={task} onChange={(event) => setTask(event.target.value as WritingTask | '')}><option value="">Tất cả Task</option><option value="TASK_1">Task 1</option><option value="TASK_2">Task 2</option></select></label>
    {tab === 'gold' ? <><div className="adm-evaluation-actions"><button className="adm-btn adm-btn--primary" disabled={busy || adding} type="button" onClick={() => setAdding(true)}>Thêm bài chuẩn</button><button className="adm-btn" disabled={busy} type="button" onClick={() => void mutate(async () => { const result = await importComparisons(); toast({ title: 'Thành công', description: `Đã nhập ${result.imported} bài`, tone: 'success' }); gold.refresh() })}>Nhập từ các bài AI và giám khảo đã cùng chấm</button></div>{adding ? <AdminDrawer title="Thêm bài chuẩn" size="lg" onClose={() => setAdding(false)}>{(close) => <GoldEssayForm onCancel={close} onSaved={() => { gold.refresh(); toast({ title: 'Thành công', description: 'Đã thêm bài chuẩn', tone: 'success' }); close() }} />}</AdminDrawer> : null}</> : <fieldset className="adm-evaluation-actions" disabled={busy}><label className="adm-field"><span>Task cần đánh giá</span><select className="adm-select" value={runTask} onChange={(event) => setRunTask(event.target.value as WritingTask)}><option value="TASK_1">Task 1</option><option value="TASK_2">Task 2</option></select></label><button className="adm-btn adm-btn--primary" type="button" onClick={() => void mutate(async () => { const run = await startEvaluation(runTask); navigate(`/content-author/ai-evaluation/runs/${run.id}`) })}>Chạy đánh giá</button></fieldset>}
    {resource.status === 'loading' && resource.items.length === 0 ? <AdminLoading /> : resource.status === 'error' ? <AdminError message={resource.error!} onRetry={resource.reload} /> : resource.status === 'success' && resource.items.length === 0 ? <AdminEmpty title={tab === 'gold' ? 'Chưa có bài chuẩn' : 'Chưa có lượt đánh giá'} /> : null}
    {tab === 'gold' && gold.items.length ? <><InfiniteCount items={gold.items.length} noun="bài chuẩn" total={gold.total} /><div className="adm-table-wrap"><table className="adm-table adm-table--sticky"><thead><tr><th className="adm-stt" scope="col">STT</th><th>Task</th><th>Band giám khảo</th><th>Nguồn</th><th>Đầu bài viết</th><th>Ngày thêm</th></tr></thead><tbody>{gold.items.map((item, index) => <tr key={item.id}><td className="adm-stt">{index + 1}</td><td>{item.task === 'TASK_1' ? 'Task 1' : 'Task 2'}</td><td>{item.examinerBand}</td><td>{item.source === 'MANUAL' ? 'Nhập tay' : 'Bài đối chiếu'}</td><td>{item.essayPreview}</td><td>{new Date(item.createdAt).toLocaleString('vi-VN')}</td></tr>)}</tbody></table></div></> : null}
    {tab === 'gold' ? <InfiniteSentinel hasMore={gold.hasMore} itemCount={gold.items.length} loadingMore={gold.loadingMore} moreError={gold.moreError} noun="bài chuẩn" onReachEnd={gold.loadMore} onRetry={gold.retryMore} resetKey={`gold-${task}`} /> : null}
    {tab === 'runs' && runs.items.length ? <><InfiniteCount items={runs.items.length} noun="lượt đánh giá" total={runs.total} /><div className="adm-table-wrap"><table className="adm-table adm-table--sticky"><thead><tr><th className="adm-stt" scope="col">STT</th><th>Lượt</th><th>Trạng thái</th><th>Số bài</th><th>Lệch ≤ 0,5 band</th><th>QWK</th><th>Kết quả</th></tr></thead><tbody>{runs.items.map((run, index) => <tr key={run.id}><td className="adm-stt">{index + 1}</td><td><Link to={`/content-author/ai-evaluation/runs/${run.id}`}>{run.task === 'TASK_1' ? 'Task 1' : 'Task 2'} · {new Date(run.startedAt).toLocaleString('vi-VN')}</Link></td><td>{run.status === 'RUNNING' ? 'Đang chạy' : run.status === 'DONE' ? 'Đã xong' : 'Lỗi'}</td><td>{run.n}</td><td>{percent(run.withinHalfBand)}</td><td>{run.qwk ?? 'Chưa có'}</td><td>{run.passed === null ? 'Chưa có' : run.passed ? 'Đạt' : 'Chưa đạt'}</td></tr>)}</tbody></table></div></> : null}
    {tab === 'runs' ? <InfiniteSentinel hasMore={runs.hasMore} itemCount={runs.items.length} loadingMore={runs.loadingMore} moreError={runs.moreError} noun="lượt đánh giá" onReachEnd={runs.loadMore} onRetry={runs.retryMore} resetKey={`runs-${task}`} /> : null}
  </div></AdminPage>
}
