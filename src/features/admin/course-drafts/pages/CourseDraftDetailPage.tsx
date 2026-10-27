import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { z } from 'zod'
import { AdminError, AdminLoading } from '../../components/AdminState'
import { AdminPage } from '../../pages/AdminPage'
import { useAdminResource } from '../../lib/useAdminResource'
import { rejectAiDraft } from '../../ai-drafts/api/aiDraftApi'
import { DRAFT_STATUS_LABEL, aiDraftFailure, draftBadgeClass, draftIsRunning } from '../../ai-drafts/lib/aiDraftLabels'
import { useDraftPolling } from '../../ai-drafts/lib/useDraftPolling'
import { QUESTION_DRAFTS_ENABLED } from '../../ai-drafts/draftFlags'
import { analyzeCourseDraft, approveCourseDraft, getCourseDraft, saveCourseDraft } from '../api/courseDraftApi'
import { CourseStructureEditor } from '../components/CourseStructureEditor'
import { CourseAnalysisPanel } from '../components/CourseAnalysisPanel'
import { CourseDraftProgress } from '../components/CourseDraftProgress'
import { courseDraftError } from '../lib/courseDraftLabels'
import type { CourseApproval, CourseDraft, CourseStructure } from '../types'
import '../course-drafts.css'

function CourseDetail({ id }: { id: string }) {
  const resource = useAdminResource(`course-draft:${id}`, (signal) => getCourseDraft(id, signal))
  const [loaded, setLoaded] = useState<CourseDraft | null>(null)
  const [structure, setStructure] = useState<CourseStructure | null>(null)
  const [revision, setRevision] = useState(0)
  if (resource.status === 'success' && resource.data !== loaded) {
    setLoaded(resource.data); setStructure(resource.data?.result ?? null); setRevision(revision + 1)
  }
  const draft = resource.status === 'success' ? resource.data : loaded
  const ready = draft?.status === 'READY'
  useDraftPolling(resource.status === 'success' && !!draft && draftIsRunning(draft.status), resource.reload)
  const analysis = useAdminResource(`course-analysis:${id}:${revision}:${ready}`, (signal) => ready ? analyzeCourseDraft(id, signal) : Promise.resolve(null))
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [note, setNote] = useState('')
  const [confirming, setConfirming] = useState(false)
  const [approved, setApproved] = useState<CourseApproval | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const dirty = JSON.stringify(structure) !== JSON.stringify(loaded?.result ?? null)
  const locked = busy || resource.status !== 'success' || !ready
  const canApprove = !locked && !dirty && !!structure?.course && !!structure.topics.length && analysis.status === 'success' && !!analysis.data?.valid && !analysis.data.errors.length
  async function run(action: () => Promise<unknown>, message: string) {
    if (locked) return
    setBusy(true); setError(null); setNotice(null)
    try { await action(); setNotice(message); setConfirming(false); resource.reload() }
    catch (reason) { setError(courseDraftError(reason)) }
    finally { setBusy(false) }
  }
  return <AdminPage title="Bản nháp khóa học" plain actions={<Link className="adm-btn" to="/content-author/course-drafts">Danh sách bản nháp</Link>}>
    {resource.status === 'loading' ? <div className="adm-block"><AdminLoading label="Đang tải bản nháp khóa học…" /></div> : null}
    {resource.status === 'error' ? <div className="adm-block"><AdminError message={resource.error!} onRetry={resource.reload} /></div> : null}
    {draft ? <div className="adm-course-workspace">
      {draft.status === 'FAILED' ? <p className="adm-alert adm-alert--error" role="alert">{aiDraftFailure(draft.errorCode)}</p> : null}
      {notice ? <p className="adm-alert" role="status">{notice}</p> : null}{error ? <p className="adm-alert adm-alert--error" style={{ whiteSpace: 'pre-wrap' }} role="alert">{error}</p> : null}
      <div className="adm-draft-detail">
        <div className="adm-draft-main">
          {structure ? <CourseStructureEditor value={structure} onChange={(value) => { setStructure(value); setConfirming(false) }} disabled={locked} /> : draftIsRunning(draft.status) ? <CourseDraftProgress createdAt={draft.createdAt} status={draft.status} /> : <div className="adm-block"><p className="adm-muted">Bản nháp chưa có cấu trúc để soạn.</p></div>}
        </div>
        <aside className="adm-draft-side" aria-label="Thao tác và kiểm tra">
          <section className="adm-block adm-draft-actions" aria-label="Thao tác bản nháp">
            <p role="status" className="adm-draft-state"><span className={draftBadgeClass(draft.status)}>{DRAFT_STATUS_LABEL[draft.status]}</span></p>
            {draftIsRunning(draft.status) ? <p className="adm-muted">Trang tự cập nhật khi bản nháp xong.</p> : null}
            {ready && structure ? <>
              <button className="adm-btn adm-btn--primary" type="button" disabled={locked || !dirty} onClick={() => void run(() => saveCourseDraft(id, structure), 'Đã lưu cấu trúc. Đang phân tích lại bản đã lưu.')}>Lưu cấu trúc</button>
              {dirty ? <p className="adm-muted">Có thay đổi chưa lưu. Lưu để phân tích và duyệt đúng bản này.</p> : null}
              <button className="adm-btn" type="button" disabled={locked || dirty || analysis.status === 'loading'} onClick={analysis.reload}>Phân tích lại</button>
              <button className="adm-btn adm-btn--primary" type="button" disabled={!canApprove} onClick={() => setConfirming(true)}>Duyệt khóa học</button>
              {confirming ? <div className="adm-alert" role="alert"><p>Duyệt sẽ tạo khóa học chưa kích hoạt, bài học và đề cuối ở trạng thái Nháp. Bạn cần hoàn thiện và xuất bản trước khi học viên sử dụng.</p><div className="adm-draft-confirm"><button className="adm-btn adm-btn--primary" type="button" disabled={!canApprove} onClick={() => void run(async () => { setApproved(await approveCourseDraft(id)) }, 'Đã tạo khóa học (chưa kích hoạt)')}>Xác nhận duyệt khóa học</button><button className="adm-btn" type="button" disabled={busy} onClick={() => setConfirming(false)}>Hủy duyệt</button></div></div> : null}
              <fieldset disabled={locked} className="adm-course-fields adm-draft-reject"><label className="adm-field"><span>Ghi chú từ chối</span><textarea className="adm-textarea" maxLength={1000} value={note} onChange={(event) => setNote(event.target.value)} /></label><button className="adm-btn adm-btn--danger" type="button" onClick={() => void run(() => rejectAiDraft(id, { note }), 'Đã từ chối bản nháp khóa học.')}>Từ chối bản nháp</button></fieldset>
            </> : null}
          </section>
          {ready ? <section aria-label="Kiểm tra bản nháp">{analysis.status === 'loading' ? <div className="adm-block"><AdminLoading /></div> : analysis.status === 'error' ? <div className="adm-block"><AdminError message={analysis.error!} onRetry={analysis.reload} /></div> : analysis.data ? <CourseAnalysisPanel analysis={analysis.data} unmatchedTopics={draft.result?.unmatchedTopics} warnings={draft.result?.warnings} questionDraftsEnabled={QUESTION_DRAFTS_ENABLED} /> : null}</section> : null}
          {approved ? <section className="adm-block"><h2>Đã tạo khóa học (chưa kích hoạt)</h2><Link to="/content-author/courses">Mở Khóa học &amp; chủ đề</Link><p>Khóa học và chủ đề: Chưa kích hoạt. Bài học và đề cuối: Nháp.</p><ul>{approved.finalTestPackageIds.map((packageId) => <li key={packageId}><Link to={`/content-author/packages/${packageId}`}>Hoàn thiện đề cuối {packageId}</Link></li>)}</ul></section> : null}
        </aside>
      </div>
    </div> : null}
  </AdminPage>
}
export function CourseDraftDetailPage() {
  const { draftId } = useParams<{ draftId: string }>()
  const id = z.guid().safeParse(draftId)
  return id.success ? <CourseDetail id={id.data} key={id.data} /> : <AdminPage title="Bản nháp khóa học" plain><div className="adm-block"><AdminError message="ID bản nháp không hợp lệ." /></div></AdminPage>
}
