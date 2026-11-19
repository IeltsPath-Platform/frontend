import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Eye, Pencil, Trash2 } from 'lucide-react'
import { useToast } from '@/components/toast/toastContext'
import { AdminRowMenu } from '../../components/AdminRowMenu'
import { AdminEmpty, AdminError, AdminLoading } from '../../components/AdminState'
import { AdminPage } from '../../pages/AdminPage'
import { useAdminResource } from '../../lib/useAdminResource'
import { AI_DRAFT_STATUSES, type AiDraftStatus } from '../../ai-drafts/types'
import { DRAFT_STATUS_LABEL, aiDraftFailure, draftBadgeClass } from '../../ai-drafts/lib/aiDraftLabels'
import { createCourseDraft, deleteCourseDraft, listCourseDrafts } from '../api/courseDraftApi'
import { courseDraftError } from '../lib/courseDraftLabels'
import type { CourseDraft } from '../types'
import '../course-drafts.css'
import { useAdminConfirm } from '../../lib/useAdminConfirm'
import { useAdminError } from '../../lib/useAdminError'

/** The statuses the server lets an author delete; an approved draft is the record of its course. */
const DELETABLE: ReadonlySet<AiDraftStatus> = new Set(['READY', 'FAILED', 'REJECTED'])

export function CourseDraftsPage() {
  const navigate = useNavigate()
  const [status, setStatus] = useState<AiDraftStatus | ''>('')
  const [page, setPage] = useState(0)
  const [busy, setBusy] = useState(false)
  /** The draft being deleted, so its row cannot be acted on twice. */
  const [removing, setRemoving] = useState<string | null>(null)
  const [, setError] = useAdminError()
  const { toast } = useToast()
  const { confirm, confirmDialog } = useAdminConfirm()
  const mounted = useRef(true)
  useEffect(() => { mounted.current = true; return () => { mounted.current = false } }, [])
  const drafts = useAdminResource(`course-drafts:${status}:${page}`, (signal) => listCourseDrafts({ status: status || undefined, page, size: 20 }, signal))
  async function create() {
    if (busy) return
    setBusy(true); setError(null)
    try { const draft = await createCourseDraft(); if (mounted.current) navigate(`/content-author/course-drafts/${draft.id}`) }
    catch (reason) { if (mounted.current) setError(courseDraftError(reason)) }
    finally { if (mounted.current) setBusy(false) }
  }
  const rows = drafts.data ?? []
  async function remove(draft: CourseDraft) {
    const confirmed = await confirm({
      title: 'Xóa bản nháp khóa học?',
      message: 'Bản nháp sẽ bị xóa hẳn và không khôi phục được. Khóa học đã tạo từ bản nháp khác không bị ảnh hưởng.',
      confirmLabel: 'Xóa bản nháp',
      tone: 'danger',
    })
    if (!confirmed || removing) return
    setRemoving(draft.id); setError(null)
    try {
      await deleteCourseDraft(draft.id)
      if (!mounted.current) return
      toast({ title: 'Thành công', description: 'Đã xóa bản nháp khóa học.', tone: 'success' })
      // Deleting the last row of a later page leaves that page empty, so go back one page instead of reloading it.
      if (rows.length === 1 && page > 0) setPage(page - 1)
      else drafts.reload()
    } catch (reason) { if (mounted.current) setError(courseDraftError(reason)) }
    finally { if (mounted.current) setRemoving(null) }
  }
  return <AdminPage title="Dựng khóa học" subtitle="Dựng từ kho nội dung, kiểm tra kiến thức nền rồi duyệt thành khóa học chưa kích hoạt." plain actions={<div className="adm-course-actions"><button className="adm-btn adm-btn--primary" disabled={busy} onClick={() => void create()} type="button">{busy ? 'Đang tạo…' : 'Dựng khóa học mới'}</button></div>}>
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
            <thead><tr><th className="adm-stt" scope="col">STT</th><th scope="col">Bản nháp</th><th scope="col">Trạng thái</th><th scope="col">Tạo lúc</th><th className="adm-col-actions" scope="col">Hành động</th></tr></thead>
            <tbody>{rows.map((draft, index) => {
              const number = page * 20 + index + 1
              const open = () => navigate(`/content-author/course-drafts/${draft.id}`)
              return <tr key={draft.id}>
                <td className="adm-stt">{number}</td>
                <td>
                  <span className="adm-draft-name">{draft.result?.course?.name ?? `Bản nháp ${draft.id}`}</span>
                  {draft.status === 'FAILED' ? <p className="adm-draft-failure" role="alert">{aiDraftFailure(draft.errorCode)}</p> : null}
                </td>
                <td><span className={draftBadgeClass(draft.status)}>{DRAFT_STATUS_LABEL[draft.status]}</span></td>
                <td className="adm-muted adm-draft-time">{new Date(draft.createdAt).toLocaleString('vi-VN')}</td>
                <td className="adm-col-actions">
                  {/* Only a draft waiting for review can be edited, and one still queued, generating or approved cannot go. */}
                  <AdminRowMenu disabled={removing === draft.id} label={`Hành động của bản nháp ${number}`} items={[
                    { key: 'view', label: 'Xem chi tiết', icon: <Eye aria-hidden="true" size={16} />, onSelect: open },
                    { key: 'edit', label: 'Sửa', icon: <Pencil aria-hidden="true" size={16} />, disabled: draft.status !== 'READY', onSelect: open },
                    { key: 'delete', label: 'Xóa', icon: <Trash2 aria-hidden="true" size={16} />, tone: 'danger', separatorBefore: true, disabled: !DELETABLE.has(draft.status), onSelect: () => void remove(draft) },
                  ]} />
                </td>
              </tr>
            })}</tbody>
          </table>
        </div>}
      <nav className="adm-draft-pager" aria-label="Phân trang khóa học"><button className="adm-btn" type="button" disabled={page === 0 || drafts.status !== 'success'} onClick={() => setPage(page - 1)}>Trang trước</button><span>Trang {page + 1}</span><button className="adm-btn" type="button" disabled={drafts.status !== 'success' || (drafts.data?.length ?? 0) < 20 || page >= 2147483647} onClick={() => setPage(page + 1)}>Trang sau</button></nav>
    </section>
    {confirmDialog}
  </AdminPage>
}
