import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { z } from 'zod'
import { AdminError, AdminLoading } from '../../components/AdminState'
import { AdminPage } from '../../pages/AdminPage'
import { useAdminResource } from '../../lib/useAdminResource'
import { adminErrorCode, adminErrorMessage } from '../../lib/adminErrors'
import { useDraftPolling } from '../../ai-drafts/lib/useDraftPolling'
import { activateEvaluation, getEvaluation } from '../api/evaluationApi'
import { percent, score } from '../lib/evaluationLabels'
import '../evaluation.css'

function EvaluationRun({ id }: { id: string }) {
  const run = useAdminResource(`evaluation-run:${id}`, (signal) => getEvaluation(id, signal))
  useDraftPolling(run.status === 'success' && run.data?.status === 'RUNNING', run.reload)
  const [confirming, setConfirming] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const canActivate = run.status === 'success' && run.data?.status === 'DONE' && run.data.passed === true && !busy
  async function activate() {
    if (!canActivate) return
    setBusy(true); setError(null); setNotice(null)
    try { await activateEvaluation(id); setConfirming(false); setNotice('Đã kích hoạt bản chấm.'); run.reload() }
    catch (reason) { setError(adminErrorCode(reason) === 'EVALUATION_NOT_PASSED' ? 'Lượt này chưa đạt nên không kích hoạt được.' : adminErrorMessage(reason)) }
    finally { setBusy(false) }
  }
  return <AdminPage title="Chi tiết lượt đánh giá" actions={<Link className="adm-btn" to="/content-author/ai-evaluation">Danh sách đánh giá</Link>}><div className="adm-evaluation-workspace">
    {run.status === 'loading' ? <AdminLoading /> : run.status === 'error' ? <AdminError message={run.error!} onRetry={run.reload} /> : null}
    {run.data ? <><p>{run.data.task === 'TASK_1' ? 'Task 1' : 'Task 2'} · {run.data.model ?? 'Chưa có mô hình'} · {run.data.promptVersion ?? 'Chưa có phiên bản'}</p><p role="status">{run.data.status === 'RUNNING' ? 'Đang chạy, tự cập nhật sau mỗi 5 giây.' : run.data.status === 'DONE' ? 'Đã xong' : 'Đánh giá thất bại'}</p>{run.data.status === 'FAILED' ? <p role="alert">Không hoàn thành đánh giá{run.data.failureCode ? ` (${run.data.failureCode})` : ''}. Hãy kiểm tra cấu hình và thử lượt mới.</p> : null}
      <section className="adm-card"><h2>Kết quả so với ngưỡng</h2><p>Lệch không quá 0,5 band: {percent(run.data.withinHalfBand)} (cần ≥ {percent(run.data.thresholds.withinHalfBand)})</p><p>Độ đồng thuận QWK: {score(run.data.qwk)} (cần ≥ {score(run.data.thresholds.qwk)})</p><p>Lệch trung bình: {score(run.data.mae)} band · Tỉ lệ gắn sai mã lỗi: {percent(run.data.errorCodeFalsePositive)}</p><p>Số bài: {run.data.n} · {run.data.passed === null ? 'Chưa có kết luận' : run.data.passed ? 'Đạt' : 'Chưa đạt'}</p></section>
      <section><h2>Độ lệch theo tiêu chí</h2><div className="adm-table-wrap"><table className="adm-table"><thead><tr><th>Tiêu chí</th><th>Số bài</th><th>Lệch ≤ 0,5 band</th><th>Lệch trung bình</th><th>QWK</th></tr></thead><tbody>{Object.entries(run.data.perCriterion ?? {}).map(([code, metric]) => <tr key={code}><td>{code}</td><td>{metric.n}</td><td>{percent(metric.withinHalfBand)}</td><td>{metric.mae}</td><td>{metric.qwk}</td></tr>)}</tbody></table></div>{!Object.keys(run.data.perCriterion ?? {}).length ? <p className="adm-muted">Chưa có số liệu tiêu chí.</p> : null}</section>
      <section><h2>Đối chiếu từng bài</h2><div className="adm-table-wrap"><table className="adm-table"><thead><tr><th>Bài chuẩn</th><th>Band giám khảo</th><th>Band AI</th><th>Chênh lệch</th></tr></thead><tbody>{[...run.data.items].sort((a, b) => b.diff.absoluteBandDifference - a.diff.absoluteBandDifference).map((item) => <tr key={item.goldId}><td>{item.goldId}</td><td>{item.diff.examinerBand}</td><td>{item.llmBand}</td><td>{item.diff.absoluteBandDifference}</td></tr>)}</tbody></table></div></section>
      <button className="adm-btn adm-btn--primary" type="button" disabled={!canActivate} onClick={() => setConfirming(true)}>Kích hoạt bản này</button>
      {confirming ? <div className="adm-alert" role="alert"><p>Từ lúc kích hoạt, mọi bài Writing của học viên (cả thi topic lẫn bài học) được chấm bằng bản này. Sửa rubric sau đó sẽ không tự áp dụng cho tới khi một lượt mới đạt và được kích hoạt.</p><button className="adm-btn adm-btn--primary" type="button" disabled={!canActivate} onClick={() => void activate()}>Xác nhận kích hoạt</button><button className="adm-btn" type="button" disabled={busy} onClick={() => setConfirming(false)}>Hủy kích hoạt</button></div> : null}
      {run.data.status === 'DONE' && !run.data.passed ? <p>Xem tiêu chí lệch nhiều nhất, sửa mô tả band ở <Link to="/content-author/rubrics">Rubric chấm Writing</Link> rồi chạy lại.</p> : null}
    </> : null}{error ? <p className="adm-alert adm-alert--error" role="alert">{error}</p> : null}{notice ? <p role="status">{notice} <Link to="/content-author/ai-evaluation">Xem bản đang sử dụng</Link></p> : null}
  </div></AdminPage>
}
export function EvaluationRunPage() { const { runId } = useParams<{ runId: string }>(); const id = z.uuid().safeParse(runId); return id.success ? <EvaluationRun id={id.data} key={id.data} /> : <AdminPage title="Chi tiết lượt đánh giá"><AdminError message="ID lượt đánh giá không hợp lệ." /></AdminPage> }
