import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { AdminEmpty, AdminError, AdminLoading } from '../../components/AdminState'
import { AdminPage } from '../../pages/AdminPage'
import { useAdminResource } from '../../lib/useAdminResource'
import { AI_DRAFT_STATUSES, type AiDraftStatus } from '../../ai-drafts/types'
import { DRAFT_STATUS_LABEL, aiDraftFailure, draftBadgeClass, draftIsRunning } from '../../ai-drafts/lib/aiDraftLabels'
import { useDraftPolling } from '../../ai-drafts/lib/useDraftPolling'
import { createCourseDraft, listCourseDrafts } from '../api/courseDraftApi'
import { CourseGenerationForm } from '../components/CourseGenerationForm'
import { courseDraftError } from '../lib/courseDraftLabels'
import '../course-drafts.css'

export function CourseDraftsPage() {
  const navigate = useNavigate()
  const [status, setStatus] = useState<AiDraftStatus | ''>('')
  const [page, setPage] = useState(0)
  const [generating, setGenerating] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const mounted = useRef(true)
  useEffect(() => { mounted.current = true; return () => { mounted.current = false } }, [])
  const drafts = useAdminResource(`course-drafts:${status}:${page}`, (signal) => listCourseDrafts({ status: status || undefined, page, size: 20 }, signal))
  useDraftPolling(drafts.status === 'success' && !!drafts.data?.some((draft) => draftIsRunning(draft.status)), drafts.reload)
  async function create() {
    if (busy) return
    setBusy(true); setError(null)
    try { const draft = await createCourseDraft(); if (mounted.current) navigate(`/content-author/course-drafts/${draft.id}`) }
    catch (reason) { if (mounted.current) setError(courseDraftError(reason)) }
    finally { if (mounted.current) setBusy(false) }
  }
  return <AdminPage title="Dựng khóa học" subtitle="Dựng từ kho nội dung, kiểm tra kiến thức nền rồi duyệt thành khóa học chưa kích hoạt." actions={<div className="adm-course-actions"><button className="adm-btn adm-btn--primary" disabled={busy} onClick={() => void create()} type="button">{busy ? 'Đang tạo…' : 'Dựng khóa học mới'}</button><button className="adm-btn" disabled={generating || busy} onClick={() => setGenerating(true)} type="button">Sinh kế hoạch bằng AI</button></div>}>
    {generating ? <CourseGenerationForm onCancel={() => setGenerating(false)} onCreated={(draft) => navigate(`/content-author/course-drafts/${draft.id}`)} /> : null}
    {error ? <p className="adm-alert adm-alert--error" role="alert">{error}</p> : null}
    <label className="adm-field"><span>Trạng thái bản nháp khóa học</span><select className="adm-select" value={status} onChange={(event) => { setStatus(event.target.value as AiDraftStatus | ''); setPage(0) }}><option value="">Tất cả trạng thái</option>{AI_DRAFT_STATUSES.map((item) => <option key={item} value={item}>{DRAFT_STATUS_LABEL[item]}</option>)}</select></label>
    {drafts.status === 'loading' ? <AdminLoading /> : drafts.status === 'error' ? <AdminError message={drafts.error!} onRetry={drafts.reload} /> : drafts.data?.length === 0 ? <AdminEmpty title="Chưa có bản nháp khóa học" /> : <ul className="adm-course-list">{drafts.data?.map((draft) => <li className="adm-card" key={draft.id}><Link to={`/content-author/course-drafts/${draft.id}`}>{draft.result?.course?.name ?? `Bản nháp ${draft.id}`}</Link> <span className={draftBadgeClass(draft.status)}>{DRAFT_STATUS_LABEL[draft.status]}</span><p className="adm-muted">{new Date(draft.createdAt).toLocaleString('vi-VN')}</p>{draft.status === 'FAILED' ? <p role="alert">{aiDraftFailure(draft.errorCode)}</p> : null}</li>)}</ul>}
    <nav className="adm-course-actions" aria-label="Phân trang khóa học"><button className="adm-btn" type="button" disabled={page === 0 || drafts.status !== 'success'} onClick={() => setPage(page - 1)}>Trang trước</button><span>Trang {page + 1}</span><button className="adm-btn" type="button" disabled={drafts.status !== 'success' || (drafts.data?.length ?? 0) < 20 || page >= 2147483647} onClick={() => setPage(page + 1)}>Trang sau</button></nav>
  </AdminPage>
}
