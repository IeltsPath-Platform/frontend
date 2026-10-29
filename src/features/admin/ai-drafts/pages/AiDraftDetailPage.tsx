import { useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { z } from 'zod'
import { HttpError } from '@/lib/httpClient'
import { AdminDrawer, AdminModal } from '../../components/AdminLayer'
import { AdminEmpty, AdminError, AdminLoading } from '../../components/AdminState'
import { useAdminConfirm } from '../../lib/useAdminConfirm'
import { useAdminError } from '../../lib/useAdminError'
import { useAdminResource } from '../../lib/useAdminResource'
import { AdminPage } from '../../pages/AdminPage'
import { DIFFICULTY_LABEL, TYPE_LABEL } from '../../questions/lib/labels'
import { approveQuestionDraft, deleteQuestionDraftItem, fetchAiDraft, patchQuestionDraftItem, rejectAiDraft } from '../api/aiDraftApi'
import { DraftUnavailable } from '../components/DraftUnavailable'
import { QuestionDraftItemEditor } from '../components/QuestionDraftItemEditor'
import { QuestionDraftItemView } from '../components/QuestionDraftItemView'
import { QuestionDraftItems } from '../components/QuestionDraftItems'
import { QUESTION_DRAFTS_ENABLED } from '../draftFlags'
import { DRAFT_STATUS_LABEL, REJECTED_REASON_LABEL, aiDraftError, aiDraftFailure, draftBadgeClass, draftIsRunning, draftLoadError } from '../lib/aiDraftLabels'
import { useDraftPolling } from '../lib/useDraftPolling'
import { questionDraftSchema, type QuestionDraft, type QuestionDraftItemPatch } from '../types'
import '../drafts.css'

function DraftDetail({ draftId }: { draftId: string }) {
  const resource = useAdminResource(`question-draft:${draftId}`, async (signal) => {
    const draft = await fetchAiDraft(draftId, signal).catch(draftLoadError)
    if (draft.kind !== 'QUESTIONS') throw new HttpError(400, 'Trang này chỉ hỗ trợ bản nháp câu hỏi.')
    return questionDraftSchema.parse(draft)
  })
  const [shown, setShown] = useState<QuestionDraft | null>(null)
  const [received, setReceived] = useState<QuestionDraft | null>(null)
  const [refreshPending, setRefreshPending] = useState(false)
  const [editing, setEditing] = useState<number | null>(null)
  const [viewing, setViewing] = useState<number | null>(null)
  const pending = useRef(false)
  const { confirm, confirmDialog } = useAdminConfirm()
  const [selected, setSelected] = useState<number[]>([])
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState(false)
  const [, setError] = useAdminError()
  const [notice, setNotice] = useState<string | null>(null)
  if (resource.status === 'success' && resource.data !== received) {
    setReceived(resource.data); setShown(resource.data); setRefreshPending(false); setEditing(null); setViewing(null); setSelected([])
  }
  const draft = shown
  useDraftPolling(resource.status === 'success' && !!draft && draftIsRunning(draft.status), resource.refresh)
  const locked = busy || refreshPending || resource.status !== 'success'
  const ready = draft?.status === 'READY' && draft.result !== null
  const items = draft?.result?.items ?? []

  async function review(action: () => Promise<unknown>, message: string) {
    if (pending.current || locked || !ready || editing !== null) return
    pending.current = true
    setBusy(true); setError(null); setNotice(null)
    try {
      await action()
      setSelected([]); setNote(''); setNotice(message)
      setRefreshPending(true)
      resource.reload()
    } catch (reason) { setError(aiDraftError(reason)) }
    finally { pending.current = false; setBusy(false) }
  }
  async function mutateItem(index: number, action: () => Promise<QuestionDraft>, message: string) {
    if (pending.current || locked || !ready || index < 0 || index >= items.length) return false
    pending.current = true
    setBusy(true); setError(null); setNotice(null)
    try {
      const updated = questionDraftSchema.parse(await action())
      setShown(updated); setSelected([]); setEditing(null); setNotice(message); setRefreshPending(true)
      resource.reload()
      return true
    } catch (reason) { setError(aiDraftError(reason)); return false }
    finally { pending.current = false; setBusy(false) }
  }
  function saveItem(index: number, body: QuestionDraftItemPatch) {
    return mutateItem(index, () => patchQuestionDraftItem(draftId, index, body), `Đã lưu câu ${index + 1}.`)
  }
  async function removeItem(index: number) {
    if (locked || !ready || editing !== null) return
    if (!(await confirm({
      title: 'Xóa câu này khỏi bản nháp?',
      message: `Xóa câu ${index + 1}? Các câu phía sau sẽ được đánh số lại.`,
      confirmLabel: 'Xóa câu',
      tone: 'danger',
    }))) return
    void mutateItem(index, () => deleteQuestionDraftItem(draftId, index), 'Đã xóa câu hỏi. Hãy chọn lại các câu cần duyệt.')
  }
  function approve() {
    if (!selected.length || selected.some((index) => index < 0 || index >= items.length)) return
    void review(() => approveQuestionDraft(draftId, { itemIndexes: selected }), `Đã duyệt ${selected.length} câu hỏi. Các câu được tạo ở trạng thái Nháp và cần xuất bản riêng.`)
  }
  function reject() {
    if (note.length > 1000) { setError('Ghi chú tối đa 1000 ký tự.'); return }
    void review(() => rejectAiDraft(draftId, { note }), 'Đã từ chối bản nháp.')
  }
  return <AdminPage actions={<Link className="adm-btn" to="/content-author/ai-drafts">Danh sách bản nháp</Link>} plain subtitle={draftId} title="Bản nháp câu hỏi">
    <div className="adm-draft-workspace">
      {confirmDialog}
      {resource.status === 'loading' && !draft ? <AdminLoading label="Đang tải bản nháp…" /> : null}
      {resource.status === 'error' ? <AdminError message={resource.error!} onRetry={resource.reload} /> : null}
      {draft ? <>
        <section aria-label="Thông tin bản nháp" className="adm-block dr-head">
          <dl className="dr-facts">
            <div><dt>Trạng thái</dt><dd><span className={draftBadgeClass(draft.status)}>{DRAFT_STATUS_LABEL[draft.status]}</span></dd></div>
            <div><dt>Dạng câu</dt><dd>{TYPE_LABEL[draft.request.questionType]}</dd></div>
            <div><dt>Số câu yêu cầu</dt><dd>{draft.request.count}</dd></div>
            <div><dt>Độ khó</dt><dd>{DIFFICULTY_LABEL[draft.request.difficulty]}</dd></div>
          </dl>
          <div className="dr-head__actions">
            {draft.status === 'APPROVED' ? <Link className="adm-btn adm-btn--primary" to="/content-author/questions">Mở Ngân hàng câu hỏi</Link> : null}
            <button className="adm-btn" disabled={locked} onClick={resource.reload} type="button">Tải lại</button>
          </div>
        </section>

        {resource.status === 'loading' ? <p className="dr-status adm-muted">Đang cập nhật bản nháp…</p> : null}
        {draftIsRunning(draft.status) ? <p className="adm-block dr-status" role="status">Yêu cầu đang được xử lý. Trang tự tải lại sau mỗi 5 giây.</p> : null}
        {draft.status === 'FAILED' ? <div className="adm-alert adm-alert--error" role="alert">{aiDraftFailure(draft.errorCode)} <Link to="/content-author/ai-drafts?new=questions">Gửi yêu cầu mới</Link></div> : null}
        {notice ? <p className="dr-status" role="status">{notice}</p> : null}
        {draft.status === 'READY' && !draft.result ? <AdminError message="Bản nháp chưa có kết quả hợp lệ để duyệt." onRetry={resource.reload} /> : null}

        {draft.result ? <>
          <section aria-label="Các câu hỏi sinh được" className="adm-block">
            <header className="dr-head dr-head--inline">
              <h2>Câu hỏi <span className="adm-badge">{items.length}</span></h2>
              {ready && items.length ? <button className="adm-btn adm-btn--primary" type="button" disabled={locked || editing !== null || !selected.length} onClick={approve}>Duyệt các câu đã chọn ({selected.length})</button> : null}
            </header>
            {!items.length ? <AdminEmpty title="Không có câu hỏi dùng được" /> : <QuestionDraftItems
              actions={ready ? { onView: setViewing, onEdit: setEditing, onRemove: (index) => void removeItem(index) } : undefined}
              disabled={locked || !ready || editing !== null}
              items={items}
              onChange={setSelected}
              selected={selected}
            />}
          </section>

          <section aria-label="Câu bị loại" className="adm-block">
            <h2 className="dr-section-title">Câu bị loại <span className="adm-badge">{draft.result.rejected.length}</span></h2>
            {!draft.result.rejected.length ? <p className="adm-muted">Không có câu bị loại khi sinh.</p> : <ul className="dr-rejected">{draft.result.rejected.map((item, index) => <li key={`${item.index}:${index}`}>Câu đầu ra {item.index + 1}: {REJECTED_REASON_LABEL[item.reason] ?? 'Câu không đạt kiểm tra dữ liệu.'}</li>)}</ul>}
          </section>
        </> : null}

        {ready ? <section aria-label="Từ chối bản nháp" className="adm-block">
          <h2 className="dr-section-title">Từ chối bản nháp</h2>
          <fieldset className="dr-reject" disabled={locked || editing !== null}>
            <label className="adm-field"><span>Ghi chú từ chối (không bắt buộc)</span><textarea className="adm-textarea" maxLength={1000} value={note} onChange={(event) => setNote(event.target.value)} /></label>
            <div className="dr-reject__bar">
              <span className="adm-muted">{note.length}/1000 ký tự</span>
              <button className="adm-btn adm-btn--danger" type="button" onClick={reject}>Từ chối</button>
            </div>
          </fieldset>
        </section> : null}

        {draft.status === 'REJECTED' && draft.reviewNote ? <section aria-label="Ghi chú từ chối" className="adm-block"><p className="adm-draft-stem">Ghi chú từ chối: {draft.reviewNote}</p></section> : null}
      </> : null}
    </div>

    {viewing !== null && items[viewing] ? (
      <AdminModal size="lg" title={`Câu ${viewing + 1}`} onClose={() => setViewing(null)}>
        <QuestionDraftItemView item={items[viewing]} />
      </AdminModal>
    ) : null}
    {editing !== null && items[editing] ? (
      <AdminDrawer onClose={() => setEditing(null)} size="xl" title={`Sửa câu ${editing + 1}`}>
        {(close) => <QuestionDraftItemEditor disabled={locked} index={editing} item={items[editing]} key={editing} onCancel={close} onSave={(body) => saveItem(editing, body)} />}
      </AdminDrawer>
    ) : null}
  </AdminPage>
}

function DraftDetailRoute() {
  const { draftId } = useParams<{ draftId: string }>()
  const parsed = z.guid().safeParse(draftId)
  return parsed.success ? <DraftDetail key={parsed.data} draftId={parsed.data} /> : <AdminPage title="Bản nháp câu hỏi"><AdminError message="ID bản nháp không hợp lệ." /></AdminPage>
}
export function AiDraftDetailPage() { return QUESTION_DRAFTS_ENABLED ? <DraftDetailRoute /> : <DraftUnavailable /> }
