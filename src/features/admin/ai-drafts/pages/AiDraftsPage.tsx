import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { Plus, RefreshCw } from 'lucide-react'
import { AdminEmpty, AdminError, AdminLoading } from '../../components/AdminState'
import { useAdminResource } from '../../lib/useAdminResource'
import { AdminPage } from '../../pages/AdminPage'
import { fetchAiDrafts } from '../api/aiDraftApi'
import { DraftUnavailable } from '../components/DraftUnavailable'
import { QuestionDraftForm } from '../components/QuestionDraftForm'
import { QUESTION_DRAFTS_ENABLED } from '../draftFlags'
import { DRAFT_STATUS_LABEL, aiDraftFailure, draftBadgeClass, draftIsRunning, draftLoadError } from '../lib/aiDraftLabels'
import { useDraftPolling } from '../lib/useDraftPolling'
import { AI_DRAFT_STATUSES, type AiDraft, type AiDraftStatus } from '../types'
import '../drafts.css'

const PAGE_SIZE = 20

function DraftList() {
  const [params, setParams] = useSearchParams()
  const navigate = useNavigate()
  const rawPage = Number(params.get('page') ?? 0)
  const page = Number.isInteger(rawPage) && rawPage >= 0 && rawPage <= 2147483647 ? rawPage : 0
  const rawStatus = params.get('status')
  const status = AI_DRAFT_STATUSES.find((item) => item === rawStatus)
  const key = `question-drafts:${status ?? 'all'}:${page}`
  const resource = useAdminResource(key, (signal) => fetchAiDrafts({ kind: 'QUESTIONS', status, page, size: PAGE_SIZE }, signal).catch(draftLoadError))
  const [shown, setShown] = useState<{ key: string; data: AiDraft[] } | null>(null)
  if (resource.status === 'success' && resource.data && (shown?.data !== resource.data || shown.key !== key)) setShown({ key, data: resource.data })
  const drafts = resource.status === 'success' ? resource.data : shown?.key === key ? shown.data : null
  const running = resource.status === 'success' && !!drafts?.some((draft) => draftIsRunning(draft.status))
  useDraftPolling(running, resource.reload)
  const creating = params.get('new') === 'questions'
  function changePage(nextPage: number) {
    setParams((previous) => { const next = new URLSearchParams(previous); next.set('page', String(nextPage)); return next })
  }
  function toggleForm(open: boolean) {
    setParams((previous) => { const next = new URLSearchParams(previous); if (open) next.set('new', 'questions'); else { next.delete('new'); next.delete('knowledgePointId') } return next })
  }
  return <AdminPage title="Sinh nội dung bằng AI" subtitle="Yêu cầu tạo câu hỏi theo kiến thức, kiểm tra đáp án rồi chọn những câu phù hợp để duyệt." actions={<button className="adm-btn adm-btn--primary" type="button" disabled={creating} onClick={() => toggleForm(true)}><Plus size={16} aria-hidden="true" /> Sinh câu hỏi</button>}>
    <div className="adm-draft-workspace">
      {creating ? <QuestionDraftForm initialKnowledgePointId={params.get('knowledgePointId') ?? undefined} onCancel={() => toggleForm(false)} onCreated={(draft) => navigate(`/content-author/ai-drafts/${draft.id}`)} /> : null}
      <div className="adm-draft-actions">
        <label className="adm-field"><span>Trạng thái bản nháp</span><select className="adm-select" value={status ?? ''} onChange={(event) => setParams((previous) => { const next = new URLSearchParams(previous); next.delete('page'); if (event.target.value) next.set('status', event.target.value); else next.delete('status'); return next })}><option value="">Tất cả trạng thái</option>{AI_DRAFT_STATUSES.map((item) => <option key={item} value={item}>{DRAFT_STATUS_LABEL[item]}</option>)}</select></label>
        <button className="adm-btn" type="button" disabled={resource.status === 'loading'} onClick={resource.reload}><RefreshCw size={16} aria-hidden="true" /> Tải lại</button>
      </div>
      {resource.status === 'loading' && !drafts ? <AdminLoading label="Đang tải bản nháp…" /> : null}
      {resource.status === 'loading' && drafts ? <p className="adm-muted">Đang cập nhật danh sách…</p> : null}
      {resource.status === 'error' ? <AdminError message={resource.error!} onRetry={resource.reload} /> : null}
      {running ? <p className="adm-muted">Tự tải lại sau mỗi 5 giây khi còn yêu cầu đang chờ hoặc đang sinh.</p> : null}
      {drafts?.length === 0 ? <AdminEmpty title="Chưa có bản nháp phù hợp">Gửi yêu cầu sinh câu hỏi mới hoặc đổi bộ lọc.</AdminEmpty> : null}
      <ul className="adm-draft-list">{drafts?.map((draft) => <li key={draft.id} className="adm-draft-list-row">
        <div><Link className="adm-draft-link" to={`/content-author/ai-drafts/${draft.id}`}>Bản nháp câu hỏi · {draft.id}</Link><p className="adm-muted">{new Intl.DateTimeFormat('vi-VN', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(draft.createdAt))}</p></div>
        <span className={draftBadgeClass(draft.status)}>{DRAFT_STATUS_LABEL[draft.status as AiDraftStatus]}</span>
        {draft.status === 'FAILED' ? <p className="adm-draft-failure">{aiDraftFailure(draft.errorCode)}</p> : null}
      </li>)}</ul>
      <nav className="adm-draft-actions" aria-label="Phân trang bản nháp"><button className="adm-btn" type="button" disabled={resource.status !== 'success' || page === 0} onClick={() => changePage(page - 1)}>Trang trước</button><span>Trang {page + 1}</span><button className="adm-btn" type="button" disabled={resource.status !== 'success' || !drafts || drafts.length < PAGE_SIZE || page === 2147483647} onClick={() => changePage(page + 1)}>Trang sau</button></nav>
    </div>
  </AdminPage>
}

export function AiDraftsPage() { return QUESTION_DRAFTS_ENABLED ? <DraftList /> : <DraftUnavailable /> }
