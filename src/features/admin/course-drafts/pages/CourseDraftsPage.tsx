import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { AdminDrawer } from '../../components/AdminLayer'
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
import { useAdminError } from '../../lib/useAdminError'

export function CourseDraftsPage() {
  const navigate = useNavigate()
  const [status, setStatus] = useState<AiDraftStatus | ''>('')
  const [page, setPage] = useState(0)
  const [generating, setGenerating] = useState(false)
  const [busy, setBusy] = useState(false)
  const [, setError] = useAdminError()
  const mounted = useRef(true)
  useEffect(() => { mounted.current = true; return () => { mounted.current = false } }, [])
  const drafts = useAdminResource(`course-drafts:${status}:${page}`, (signal) => listCourseDrafts({ status: status || undefined, page, size: 20 }, signal))
  useDraftPolling(drafts.status === 'success' && !!drafts.data?.some((draft) => draftIsRunning(draft.status)), drafts.refresh)
  async function create() {
    if (busy) return
    setBusy(true); setError(null)
    try { const draft = await createCourseDraft(); if (mounted.current) navigate(`/content-author/course-drafts/${draft.id}`) }
    catch (reason) { if (mounted.current) setError(courseDraftError(reason)) }
    finally { if (mounted.current) setBusy(false) }
  }
  const rows = drafts.data ?? []
  return <AdminPage title="Dựng khóa học" subtitle="Dựng từ kho nội dung, kiểm tra kiến thức nền rồi duyệt thành khóa học chưa kích hoạt." plain actions={<div className="adm-course-actions"><button className="adm-btn adm-btn--primary" disabled={busy} onClick={() => void create()} type="button">{busy ? 'Đang tạo…' : 'Dựng khóa học mới'}</button><button className="adm-btn" disabled={generating || busy} onClick={() => setGenerating(true)} type="button">Sinh kế hoạch bằng AI</button></div>}>
    {generating ? <AdminDrawer title="Sinh khóa học bằng AI" size="xl" onClose={() => setGenerating(false)}>
      {(close) => <CourseGenerationForm onCancel={close} onCreated={(draft) => navigate(`/content-author/course-drafts/${draft.id}`)} />}
    </AdminDrawer> : null}
    <section aria-label="Danh sách bản nháp" className="adm-draft-section">
      <div className="adm-draft-toolbar">
        <label className="adm-field adm-draft-filter"><span>Trạng thái bản nháp khóa học</span><select className="adm-select" value={status} onChange={(event) => { setStatus(event.target.value as AiDraftStatus | ''); setPage(0) }}><option value="">Tất cả trạng thái</option>{AI_DRAFT_STATUSES.map((item) => <option key={item} value={item}>{DRAFT_STATUS_LABEL[item]}</option>)}</select></label>
        {drafts.status === 'success' ? <p className="adm-muted adm-draft-count">{rows.length} bản nháp ở trang này</p> : null}
      </div>
      {drafts.status === 'loading' ? <div className="adm-block"><AdminLoading /></div>
        : drafts.status === 'error' ? <div className="adm-block"><AdminError message={drafts.error!} onRetry={drafts.reload} /></div>
        : rows.length === 0 ? <div className="adm-block"><AdminEmpty title="Chưa có bản nháp khóa học" /></div>
        : <div className="adm-table-wrap adm-draft-table">
          <table className="adm-table">
            <thead><tr><th className="adm-stt" scope="col">STT</th><th scope="col">Bản nháp</th><th scope="col">Trạng thái</th><th scope="col">Tạo lúc</th></tr></thead>
            <tbody>{rows.map((draft, index) => <tr key={draft.id}>
              <td className="adm-stt">{page * 20 + index + 1}</td>
              <td>
                <Link className="adm-draft-name" to={`/content-author/course-drafts/${draft.id}`}>{draft.result?.course?.name ?? `Bản nháp ${draft.id}`}</Link>
                {draft.status === 'FAILED' ? <p className="adm-draft-failure" role="alert">{aiDraftFailure(draft.errorCode)}</p> : null}
              </td>
              <td><span className={draftBadgeClass(draft.status)}>{DRAFT_STATUS_LABEL[draft.status]}</span></td>
              <td className="adm-muted adm-draft-time">{new Date(draft.createdAt).toLocaleString('vi-VN')}</td>
            </tr>)}</tbody>
          </table>
        </div>}
      <nav className="adm-draft-pager" aria-label="Phân trang khóa học"><button className="adm-btn" type="button" disabled={page === 0 || drafts.status !== 'success'} onClick={() => setPage(page - 1)}>Trang trước</button><span>Trang {page + 1}</span><button className="adm-btn" type="button" disabled={drafts.status !== 'success' || (drafts.data?.length ?? 0) < 20 || page >= 2147483647} onClick={() => setPage(page + 1)}>Trang sau</button></nav>
    </section>
  </AdminPage>
}
