import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { z } from 'zod'
import { AdminError, AdminLoading } from '../../components/AdminState'
import { AdminPage } from '../../pages/AdminPage'
import { useAdminResource } from '../../lib/useAdminResource'
import { rejectAiDraft } from '../../ai-drafts/api/aiDraftApi'
import { DRAFT_STATUS_LABEL, aiDraftFailure, draftBadgeClass, draftIsRunning } from '../../ai-drafts/lib/aiDraftLabels'
import { useDraftPolling } from '../../ai-drafts/lib/useDraftPolling'
import { QUESTION_DRAFTS_ENABLED } from '../../ai-drafts/draftFlags'
import { fetchKnowledgeTree } from '../../knowledge-graph/api/knowledgeGraphApi'
import { analyzeCourseDraft, approveCourseDraft, getCourseDraft, saveCourseDraft } from '../api/courseDraftApi'
import { CourseStructureEditor } from '../components/CourseStructureEditor'
import { CourseAnalysisPanel } from '../components/CourseAnalysisPanel'
import { CourseDraftProgress } from '../components/CourseDraftProgress'
import { courseDraftError } from '../lib/courseDraftLabels'
import type { CourseApproval, CourseDraft, CourseStructure } from '../types'
import '../course-drafts.css'
import { useAdminError } from '../../lib/useAdminError'

/** How long the author must stop editing before the structure is saved. */
const AUTOSAVE_DELAY_MS = 1500

/**
 * A draft is saved as it is edited: a pause in typing saves the structure, so nothing depends on a save button and the
 * author can come back later and carry on. The editor stays editable while a save runs; the server's own copy replaces
 * the local one only when nothing was typed meanwhile. A structure the server refuses (a blank title halfway through an
 * edit) stays local and is tried again on the next edit, or on request.
 */
function CourseDetail({ id }: { id: string }) {
  const resource = useAdminResource(`course-draft:${id}`, (signal) => getCourseDraft(id, signal))
  const [loaded, setLoaded] = useState<CourseDraft | null>(null)
  const [structure, setStructure] = useState<CourseStructure | null>(null)
  /** The structure last stored on the server, as JSON, to tell whether the local one has changed since. */
  const [saved, setSaved] = useState('null')
  const [revision, setRevision] = useState(0)
  if (resource.status === 'success' && resource.data !== loaded) {
    setLoaded(resource.data); setStructure(resource.data?.result ?? null); setSaved(JSON.stringify(resource.data?.result ?? null)); setRevision(revision + 1)
  }
  const draft = resource.status === 'success' ? resource.data : loaded
  const ready = draft?.status === 'READY'
  useDraftPolling(resource.status === 'success' && !!draft && draftIsRunning(draft.status), resource.refresh)
  // Names for the knowledge points the analysis mentions by id; without them the panel shows the ids.
  const knowledge = useAdminResource('course-analysis-names', (signal) => fetchKnowledgeTree({}, signal))
  const names = new Map((knowledge.data?.nodes ?? []).map((node) => [node.id, { code: node.code, name: node.name }]))
  const analysis = useAdminResource(`course-analysis:${id}:${revision}:${ready}`, (signal) => ready ? analyzeCourseDraft(id, signal) : Promise.resolve(null))
  const [busy, setBusy] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saveFailed, setSaveFailed] = useState(false)
  const [, setError] = useAdminError()
  const [note, setNote] = useState('')
  const [confirming, setConfirming] = useState(false)
  const [approved, setApproved] = useState<CourseApproval | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const dirty = JSON.stringify(structure) !== saved
  const locked = busy || resource.status !== 'success' || !ready
  const canApprove = !locked && !saving && !dirty && !!structure?.course && !!structure.topics.length && analysis.status === 'success' && !!analysis.data?.valid && !analysis.data.errors.length

  const latest = useRef(structure)
  const inFlight = useRef(false)
  const failureShown = useRef(false)
  /** What would be lost if the page closed now: the structure when it has unsaved changes and no save is running. */
  const unsaved = useRef<CourseStructure | null>(null)
  useEffect(() => {
    latest.current = structure
    unsaved.current = ready && dirty && !saving ? structure : null
  })

  const save = useCallback(async () => {
    const sent = latest.current
    if (!sent || inFlight.current) return
    const sentJson = JSON.stringify(sent)
    inFlight.current = true
    setSaving(true)
    try {
      const result = await saveCourseDraft(id, sent)
      failureShown.current = false
      setSaveFailed(false)
      if (result.result && JSON.stringify(latest.current) === sentJson) { setStructure(result.result); setSaved(JSON.stringify(result.result)) } else setSaved(sentJson)
      setRevision((current) => current + 1)
    } catch (reason) {
      setSaveFailed(true)
      // One toast per run of failures; the status line keeps saying so.
      if (!failureShown.current) { failureShown.current = true; setError(courseDraftError(reason)) }
    } finally {
      inFlight.current = false
      setSaving(false)
    }
  }, [id, setError])

  useEffect(() => {
    if (!ready || !dirty || busy || saving || saveFailed) return
    const timer = window.setTimeout(() => void save(), AUTOSAVE_DELAY_MS)
    return () => window.clearTimeout(timer)
  }, [ready, dirty, busy, saving, saveFailed, structure, save])
  // Leaving the page with edits still waiting saves them once more, and a closing tab asks first.
  useEffect(() => () => { if (unsaved.current) void saveCourseDraft(id, unsaved.current).catch(() => undefined) }, [id])
  useEffect(() => {
    if (!dirty && !saving) return
    const warn = (event: BeforeUnloadEvent) => event.preventDefault()
    window.addEventListener('beforeunload', warn)
    return () => window.removeEventListener('beforeunload', warn)
  }, [dirty, saving])
  function edit(value: CourseStructure) { setStructure(value); setConfirming(false); setSaveFailed(false) }
  function retry() { setSaveFailed(false); void save() }
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
      {notice ? <p className="adm-alert" role="status">{notice}</p> : null}
      {draftIsRunning(draft.status) ? <CourseDraftProgress createdAt={draft.createdAt} request={draft.request} status={draft.status} /> : <div className="adm-draft-detail">
        <div className="adm-draft-main">
          {structure ? <CourseStructureEditor value={structure} onChange={edit} disabled={locked} /> : <div className="adm-block"><p className="adm-muted">Bản nháp chưa có cấu trúc để soạn.</p></div>}
        </div>
        <aside className="adm-draft-side" aria-label="Thao tác và kiểm tra">
          <section className="adm-block adm-draft-actions" aria-label="Thao tác bản nháp">
            <p role="status" className="adm-draft-state"><span className={draftBadgeClass(draft.status)}>{DRAFT_STATUS_LABEL[draft.status]}</span></p>
            {ready && structure ? <>
              <p role="status" className="adm-draft-saved">{saving ? 'Đang lưu…' : saveFailed ? <>Chưa lưu được. <button className="adm-link" type="button" onClick={retry}>Thử lại</button></> : dirty ? 'Đang chờ lưu…' : 'Đã lưu'}</p>
              <button className="adm-btn" type="button" disabled={locked || saving || dirty || analysis.status === 'loading'} onClick={analysis.reload}>Phân tích lại</button>
              <button className="adm-btn adm-btn--primary" type="button" disabled={!canApprove} onClick={() => setConfirming(true)}>Duyệt khóa học</button>
              {confirming ? <div className="adm-alert" role="alert"><p>Duyệt sẽ tạo khóa học chưa kích hoạt, bài học và đề cuối ở trạng thái Nháp. Bạn cần hoàn thiện và xuất bản trước khi học viên sử dụng.</p><div className="adm-draft-confirm"><button className="adm-btn adm-btn--primary" type="button" disabled={!canApprove} onClick={() => void run(async () => { setApproved(await approveCourseDraft(id)) }, 'Đã tạo khóa học (chưa kích hoạt)')}>Xác nhận duyệt khóa học</button><button className="adm-btn" type="button" disabled={busy} onClick={() => setConfirming(false)}>Hủy duyệt</button></div></div> : null}
              <fieldset disabled={locked || saving} className="adm-course-fields adm-draft-reject"><label className="adm-field"><span>Ghi chú từ chối</span><textarea className="adm-textarea" maxLength={1000} value={note} onChange={(event) => setNote(event.target.value)} /></label><button className="adm-btn adm-btn--danger" type="button" onClick={() => void run(() => rejectAiDraft(id, { note }), 'Đã từ chối bản nháp khóa học.')}>Từ chối bản nháp</button></fieldset>
            </> : null}
          </section>
          {ready ? <section aria-label="Kiểm tra bản nháp">{analysis.status === 'loading' ? <div className="adm-block"><AdminLoading /></div> : analysis.status === 'error' ? <div className="adm-block"><AdminError message={analysis.error!} onRetry={analysis.reload} /></div> : analysis.data ? <CourseAnalysisPanel analysis={analysis.data} names={names} unmatchedTopics={draft.result?.unmatchedTopics} warnings={draft.result?.warnings} questionDraftsEnabled={QUESTION_DRAFTS_ENABLED} /> : null}</section> : null}
          {approved ? <section className="adm-block"><h2>Đã tạo khóa học (chưa kích hoạt)</h2><Link to="/content-author/courses">Mở Khóa học &amp; chủ đề</Link><p>Khóa học và chủ đề: Chưa kích hoạt. Bài học và đề cuối: Nháp.</p><ul>{approved.finalTestPackageIds.map((packageId) => <li key={packageId}><Link to={`/content-author/packages/${packageId}`}>Hoàn thiện đề cuối {packageId}</Link></li>)}</ul></section> : null}
        </aside>
      </div>}
    </div> : null}
  </AdminPage>
}
export function CourseDraftDetailPage() {
  const { draftId } = useParams<{ draftId: string }>()
  const id = z.guid().safeParse(draftId)
  return id.success ? <CourseDetail id={id.data} key={id.data} /> : <AdminPage title="Bản nháp khóa học" plain><div className="adm-block"><AdminError message="ID bản nháp không hợp lệ." /></div></AdminPage>
}
