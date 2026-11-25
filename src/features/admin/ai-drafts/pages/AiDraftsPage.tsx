import { Link, useSearchParams } from 'react-router-dom'
import { RefreshCw } from 'lucide-react'
import { AdminEmpty, AdminError, AdminLoading } from '../../components/AdminState'
import { InfiniteCount, InfiniteSentinel } from '../../components/InfiniteSentinel'
import { useInfiniteList } from '../../lib/useInfiniteList'
import { AdminPage } from '../../pages/AdminPage'
import { fetchAiDrafts } from '../api/aiDraftApi'
import { DraftUnavailable } from '../components/DraftUnavailable'
import { QUESTION_DRAFTS_ENABLED } from '../draftFlags'
import { DRAFT_STATUS_LABEL, aiDraftFailure, draftBadgeClass, draftIsRunning, draftLoadError } from '../lib/aiDraftLabels'
import { useDraftPolling } from '../lib/useDraftPolling'
import { AI_DRAFT_STATUSES, type AiDraftStatus } from '../types'
import '../drafts.css'

const PAGE_SIZE = 20

function DraftList() {
  const [params, setParams] = useSearchParams()
  const rawStatus = params.get('status')
  const status = rawStatus === 'ALL' ? undefined : AI_DRAFT_STATUSES.find((item) => item === rawStatus) ?? 'READY'
  const key = `question-drafts:${status ?? 'ALL'}`
  const resource = useInfiniteList(key, async (page, signal) => {
    const content = await fetchAiDrafts({ kind: ['QUESTIONS', 'SECTION_QUESTIONS'], ...(status ? { status } : {}), page, size: PAGE_SIZE }, signal).catch(draftLoadError)
    const hasMore = content.length === PAGE_SIZE
    return { content, page, totalElements: hasMore ? null : page * PAGE_SIZE + content.length, totalPages: null, hasMore }
  })
  const drafts = resource.items
  const running = resource.status === 'success' && drafts.some((draft) => draftIsRunning(draft.status))
  useDraftPolling(running, resource.refresh)
  return <AdminPage title="Duyệt câu hỏi AI">
    <div className="adm-draft-workspace">
      <div className="adm-draft-actions">
        <label className="adm-field"><span>Trạng thái bản nháp</span><select className="adm-select" value={status ?? 'ALL'} onChange={(event) => setParams((previous) => { const next = new URLSearchParams(previous); next.set('status', event.target.value); return next })}><option value="READY">Chờ duyệt</option><option value="ALL">Tất cả trạng thái</option>{AI_DRAFT_STATUSES.filter((item) => item !== 'READY').map((item) => <option key={item} value={item}>{DRAFT_STATUS_LABEL[item]}</option>)}</select></label>
        <button className="adm-btn" type="button" disabled={resource.status === 'loading'} onClick={resource.refresh}><RefreshCw size={16} aria-hidden="true" /> Tải lại</button>
      </div>
      {resource.status === 'loading' && !drafts.length ? <AdminLoading label="Đang tải bản nháp…" /> : null}
      {resource.status === 'error' ? <AdminError message={resource.error!} onRetry={resource.reload} /> : null}
      {running ? <p className="adm-muted">Tự tải lại sau mỗi 5 giây khi còn yêu cầu đang chờ hoặc đang sinh.</p> : null}
      {resource.status === 'success' && drafts.length === 0 ? <AdminEmpty title="Chưa có bản nháp phù hợp" /> : null}
      <InfiniteCount items={drafts.length} noun="bản nháp" total={resource.total} />
      <ul className="adm-draft-list">{drafts.map((draft) => <li key={draft.id} className="adm-draft-list-row">
        <div><Link className="adm-draft-link" to={`/content-author/ai-drafts/${draft.id}`}>{draft.origin?.title ?? (draft.kind === 'SECTION_QUESTIONS' ? 'Câu hỏi cho phần của đề' : 'Câu hỏi AI')}</Link><p className="adm-muted">{draft.itemCount ?? (Array.isArray(draft.result?.items) ? draft.result.items.length : 0)} câu · {new Intl.DateTimeFormat('vi-VN', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(draft.createdAt))}</p></div>
        <span className={draftBadgeClass(draft.status)}>{DRAFT_STATUS_LABEL[draft.status as AiDraftStatus] ?? draft.status}</span>
        {draft.status === 'FAILED' ? <p className="adm-draft-failure">{aiDraftFailure(draft.errorCode)}</p> : null}
      </li>)}<InfiniteSentinel as="li" hasMore={resource.hasMore} itemCount={drafts.length} loadingMore={resource.loadingMore} moreError={resource.moreError} noun="bản nháp" onReachEnd={resource.loadMore} onRetry={resource.retryMore} resetKey={key} /></ul>
    </div>
  </AdminPage>
}

export function AiDraftsPage() { return QUESTION_DRAFTS_ENABLED ? <DraftList /> : <DraftUnavailable /> }
