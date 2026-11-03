import { useId, useState, type FormEvent } from 'react'
import { ArrowDown, ArrowUp, ExternalLink, Pencil, Plus, Trash2 } from 'lucide-react'
import { AdminModal } from '../../components/AdminLayer'
import { AdminRowMenu } from '../../components/AdminRowMenu'
import { useAdminConfirm } from '../../lib/useAdminConfirm'
import { AdminError, AdminLoading } from '../../components/AdminState'
import { adminErrorMessage } from '../../lib/adminErrors'
import { useAdminResource } from '../../lib/useAdminResource'
import { createLessonResource, deleteLessonResource, fetchLessonResources, reorderLessonResources, updateLessonResource } from '../api/lessonApi'
import { moveId } from '../lib/blockForm'
import { RESOURCE_REORDER_ENABLED } from '../lib/resource-reorder'
import type { LessonResource, LessonResourceRequest, LessonResources, LessonResourceType } from '../types'
import { useAdminError } from '../../lib/useAdminError'
import '../../course-drafts/course-drafts.css'

function httpsUrl(value: string) {
  try { return new URL(value).protocol === 'https:' } catch { return false }
}

function ResourceForm({ item, type, busy, onSave, onCancel }: {
  item?: LessonResource
  type: LessonResourceType
  busy: boolean
  onSave: (body: Pick<LessonResourceRequest, 'title' | 'url'>) => Promise<boolean>
  onCancel: () => void
}) {
  const id = useId()
  const [title, setTitle] = useState(item?.title ?? '')
  const [url, setUrl] = useState(item?.url ?? '')
  const [submitted, setSubmitted] = useState(false)
  const invalidUrl = (submitted || url.length > 0) && !httpsUrl(url.trim())
  const label = type === 'SLIDE' ? 'slide' : 'tài liệu'

  async function submit(event: FormEvent) {
    event.preventDefault()
    setSubmitted(true)
    if (busy || !title.trim() || title.trim().length > 255 || !httpsUrl(url.trim()) || url.trim().length > 2000) return
    await onSave({ title: title.trim(), url: url.trim() })
  }

  return (
    <form aria-label={`${item ? 'Sửa' : 'Thêm'} ${label}`} noValidate onSubmit={(event) => void submit(event)}>
      <fieldset className="adm-resource-fields" disabled={busy}>
        <label className="adm-field">
          <span>Tiêu đề {label}<span aria-hidden="true" className="adm-required" /></span>
          <input className="adm-input" maxLength={255} required value={title} onChange={(event) => setTitle(event.target.value)} aria-invalid={submitted && !title.trim()} />
          {submitted && !title.trim() ? <small role="alert">Nhập tiêu đề.</small> : null}
        </label>
        <label className="adm-field">
          <span>URL {label}<span aria-hidden="true" className="adm-required" /></span>
          <input className="adm-input" type="url" maxLength={2000} required value={url} onChange={(event) => setUrl(event.target.value)} aria-invalid={invalidUrl} aria-describedby={invalidUrl ? `${id}-url-error` : undefined} />
          {invalidUrl ? <small id={`${id}-url-error`} role="alert">Nhập đường dẫn HTTPS hợp lệ.</small> : null}
        </label>
        <div className="adm-form-footer">
          <button className="adm-btn" type="button" onClick={onCancel}>Đóng</button>
          <button className="adm-btn adm-btn--primary" type="submit">{busy ? 'Đang lưu…' : 'Lưu'}</button>
        </div>
      </fieldset>
    </form>
  )
}

/** The slides or the documents of a lesson: a titled table whose rows carry their actions in a "…" menu. */
function ResourceList({ lessonId, type, items, reload, busy, clearError, run }: {
  lessonId: string
  type: LessonResourceType
  items: LessonResource[]
  reload: () => void
  busy: boolean
  clearError: () => void
  run: (action: () => Promise<unknown>) => Promise<boolean>
}) {
  const { confirm, confirmDialog } = useAdminConfirm()
  const [editing, setEditing] = useState<string | null>(null)
  const [adding, setAdding] = useState(false)
  const label = type === 'SLIDE' ? 'Slide' : 'Tài liệu'
  const editingItem = editing ? items.find((item) => item.id === editing) : undefined
  const ordered = [...items].sort((a, b) => a.sortOrder - b.sortOrder)
  async function move(id: string, delta: -1 | 1) {
    const index = ordered.findIndex((item) => item.id === id)
    if (!RESOURCE_REORDER_ENABLED || busy || index < 0 || index + delta < 0 || index + delta >= ordered.length) return
    await run(async () => {
      try {
        await reorderLessonResources(lessonId, type, moveId(ordered.map((item) => item.id), id, delta))
      } finally {
        reload()
      }
    })
  }
  async function remove(item: LessonResource) {
    if (!(await confirm({
      title: `Xóa ${label.toLowerCase()}?`,
      message: `Xóa ${label.toLowerCase()} “${item.title}” khỏi bài học? Học viên sẽ không còn thấy nó.`,
      confirmLabel: 'Xóa',
      tone: 'danger',
    }))) return
    await run(async () => { await deleteLessonResource(lessonId, item.id); reload() })
  }
  return (
    <section aria-label={label} className="adm-sec">
      <div className="adm-sec__head">
        <h3 className="adm-sec__title">{label}<span className="adm-count">{items.length}</span></h3>
        <button className="adm-btn adm-btn--small" type="button" disabled={busy} onClick={() => { clearError(); setAdding(true) }}><Plus aria-hidden="true" size={14} />Thêm {label.toLowerCase()}</button>
      </div>
      <div className="adm-table-wrap adm-kp-table">
        <table aria-label={`${label} của bài`} className="adm-table">
          <thead><tr><th className="adm-stt" scope="col">STT</th><th scope="col">Tiêu đề</th><th scope="col">Đường dẫn</th><th className="adm-col-actions" scope="col">Hành động</th></tr></thead>
          <tbody>{ordered.length === 0 ? <tr><td className="adm-muted adm-kp-table__empty" colSpan={4}>Chưa có {label.toLowerCase()} nào.</td></tr> : ordered.map((item, index) => (
            <tr key={item.id}>
              <td className="adm-stt">{index + 1}</td>
              <td>{item.title}</td>
              <td>{httpsUrl(item.url)
                ? <a className="adm-link-out" href={item.url} rel="noreferrer" target="_blank">{item.url}<ExternalLink aria-hidden="true" size={13} /></a>
                : <span className="adm-muted">{item.url}</span>}</td>
              <td className="adm-col-actions">
                <AdminRowMenu disabled={busy} label={`Hành động của ${label.toLowerCase()} ${index + 1}`} items={[
                  { key: 'edit', label: `Sửa ${label.toLowerCase()}`, ariaLabel: `Sửa ${item.title}`, icon: <Pencil aria-hidden="true" size={16} />, onSelect: () => { clearError(); setEditing(item.id) } },
                  ...(RESOURCE_REORDER_ENABLED ? [
                    { key: 'up', label: 'Đưa lên', ariaLabel: `Đưa ${item.title} lên`, icon: <ArrowUp aria-hidden="true" size={16} />, separatorBefore: true, disabled: index === 0, onSelect: () => void move(item.id, -1) },
                    { key: 'down', label: 'Đưa xuống', ariaLabel: `Đưa ${item.title} xuống`, icon: <ArrowDown aria-hidden="true" size={16} />, disabled: index === ordered.length - 1, onSelect: () => void move(item.id, 1) },
                  ] : []),
                  { key: 'delete', label: `Xóa ${label.toLowerCase()}`, ariaLabel: `Xóa ${item.title}`, icon: <Trash2 aria-hidden="true" size={16} />, tone: 'danger', separatorBefore: true, onSelect: () => void remove(item) },
                ]} />
              </td>
            </tr>
          ))}</tbody>
        </table>
      </div>
      {confirmDialog}
      {adding ? <AdminModal title={`Thêm ${label.toLowerCase()}`} onClose={() => setAdding(false)} stacked>
        {(close) => <ResourceForm type={type} busy={busy} onCancel={close} onSave={async (body) => {
          const saved = await run(async () => {
            const sortOrder = items.length ? Math.max(...items.map((item) => item.sortOrder)) + 1 : 0
            await createLessonResource(lessonId, { ...body, type, sortOrder })
            reload()
          })
          if (saved) close()
          return saved
        }} />}
      </AdminModal> : null}
      {editingItem ? <AdminModal title={`Sửa ${label.toLowerCase()}`} description={editingItem.title} onClose={() => setEditing(null)} stacked>
        {(close) => <ResourceForm item={editingItem} type={type} busy={busy} onCancel={close} onSave={async (body) => {
          const saved = await run(async () => {
            await updateLessonResource(lessonId, editingItem.id, { ...body, sortOrder: editingItem.sortOrder })
            reload()
          })
          if (saved) close()
          return saved
        }} />}
      </AdminModal> : null}
    </section>
  )
}

export function LessonResourcesEditor({ lessonId }: { lessonId: string }) {
  const resources = useAdminResource(`lesson-resources|${lessonId}`, (signal) => fetchLessonResources(lessonId, signal))
  const [busy, setBusy] = useState(false)
  const [, setError] = useAdminError()
  const [shown, setShown] = useState<LessonResources | null>(null)
  if (resources.status === 'success' && resources.data !== shown) setShown(resources.data)
  const current = resources.status === 'success' ? resources.data : shown
  async function run(action: () => Promise<unknown>) {
    if (busy) return false
    setBusy(true)
    setError(null)
    try { await action(); return true } catch (reason) { setError(adminErrorMessage(reason)); return false } finally { setBusy(false) }
  }
  return (
    <>
      {resources.status === 'loading' ? <AdminLoading label="Đang tải slide và tài liệu…" /> : null}
      {resources.status === 'error' ? <AdminError message={resources.error ?? 'Không tải được slide và tài liệu.'} onRetry={resources.reload} /> : null}
      {current ? <>
        <ResourceList lessonId={lessonId} type="SLIDE" items={current.slides} reload={resources.reload} busy={busy || resources.status !== 'success'} clearError={() => setError(null)} run={run} />
        <ResourceList lessonId={lessonId} type="DOCUMENT" items={current.documents} reload={resources.reload} busy={busy || resources.status !== 'success'} clearError={() => setError(null)} run={run} />
      </> : null}
    </>
  )
}
