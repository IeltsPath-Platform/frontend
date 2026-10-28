import { useId, useState, type FormEvent } from 'react'
import { ArrowDown, ArrowUp, ExternalLink, Pencil, Plus, Trash2 } from 'lucide-react'
import { AdminDrawer } from '../../components/AdminLayer'
import { useAdminConfirm } from '../../lib/useAdminConfirm'
import { AdminEmpty, AdminError, AdminLoading } from '../../components/AdminState'
import { adminErrorMessage } from '../../lib/adminErrors'
import { useAdminResource } from '../../lib/useAdminResource'
import { createLessonResource, deleteLessonResource, fetchLessonResources, reorderLessonResources, updateLessonResource } from '../api/lessonApi'
import { moveId } from '../lib/blockForm'
import { RESOURCE_REORDER_ENABLED } from '../lib/resource-reorder'
import type { LessonResource, LessonResourceRequest, LessonResources, LessonResourceType } from '../types'
import { useAdminError } from '../../lib/useAdminError'

function httpsUrl(value: string) {
  try { return new URL(value).protocol === 'https:' } catch { return false }
}

function ResourceForm({ item, type, busy, onSave, onCancel }: {
  item?: LessonResource
  type: LessonResourceType
  busy: boolean
  /** A failed save is shown here, in the drawer, because the page behind it is covered. */
  onSave: (body: Pick<LessonResourceRequest, 'title' | 'url'>) => Promise<boolean>
  onCancel?: () => void
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
    const saved = await onSave({ title: title.trim(), url: url.trim() })
    if (saved && !item) { setTitle(''); setUrl(''); setSubmitted(false) }
  }

  return (
    <form aria-label={`${item ? 'Sửa' : 'Thêm'} ${label}`} noValidate onSubmit={(event) => void submit(event)}>
      <fieldset className="adm-resource-fields" disabled={busy}>
        <label className="adm-field">
          <span>Tiêu đề {label}</span>
          <input className="adm-input" maxLength={255} required value={title} onChange={(event) => setTitle(event.target.value)} aria-invalid={submitted && !title.trim()} />
          {submitted && !title.trim() ? <small role="alert">Nhập tiêu đề.</small> : null}
        </label>
        <label className="adm-field">
          <span>URL {label}</span>
          <input className="adm-input" type="url" maxLength={2000} required value={url} onChange={(event) => setUrl(event.target.value)} aria-invalid={invalidUrl} aria-describedby={invalidUrl ? `${id}-url-error` : undefined} />
          {invalidUrl ? <small id={`${id}-url-error`} role="alert">Nhập đường dẫn HTTPS hợp lệ.</small> : null}
        </label>
        {type === 'SLIDE' ? <p className="adm-muted">Dán link Google Slides dạng …/embed. Bật quyền xem hoặc xuất bản lên web để học viên mở được.</p> : null}
        <div className="adm-form-footer">
          {onCancel ? <button className="adm-btn" type="button" onClick={onCancel}>Hủy</button> : null}
          <button className="adm-btn adm-btn--primary" type="submit">{busy ? 'Đang lưu…' : item ? 'Lưu thay đổi' : `Thêm ${label}`}</button>
        </div>
      </fieldset>
    </form>
  )
}

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
  return (
    <section className="adm-resource-list" aria-label={label}>
      <h3>{label} ({items.length})</h3>
      {items.length === 0 ? <AdminEmpty title={`Chưa có ${label.toLowerCase()}.`}>Thêm đường dẫn bên dưới để học viên xem trong bài học.</AdminEmpty> : null}
      <ol>
        {ordered.map((item, index) => (
          <li key={item.id}>
            <>
              <div className="adm-resource-head">
                <div className="adm-resource-link">
                  <strong>{item.title}</strong>
                  {httpsUrl(item.url) ? <a href={item.url} target="_blank" rel="noreferrer">{item.url} <ExternalLink aria-hidden="true" size={14} /></a> : <span className="adm-muted">{item.url} · Sửa thành đường dẫn HTTPS để mở.</span>}
                </div>
                <div className="adm-resource-actions">
                  <button className="adm-btn" type="button" disabled={!RESOURCE_REORDER_ENABLED || busy || index === 0} aria-label={`Đưa ${item.title} lên`} title={RESOURCE_REORDER_ENABLED ? undefined : 'Chờ API đổi thứ tự'} onClick={() => void move(item.id, -1)}><ArrowUp aria-hidden="true" size={16} /></button>
                  <button className="adm-btn" type="button" disabled={!RESOURCE_REORDER_ENABLED || busy || index === ordered.length - 1} aria-label={`Đưa ${item.title} xuống`} title={RESOURCE_REORDER_ENABLED ? undefined : 'Chờ API đổi thứ tự'} onClick={() => void move(item.id, 1)}><ArrowDown aria-hidden="true" size={16} /></button>
                  <button className="adm-btn" type="button" disabled={busy} aria-label={`Sửa ${item.title}`} onClick={() => { clearError(); setEditing(item.id) }}><Pencil aria-hidden="true" size={16} /> Sửa</button>
                  <button className="adm-btn adm-btn--danger" type="button" disabled={busy} aria-label={`Xóa ${item.title}`} onClick={() => void (async () => {
                    if (!(await confirm({
                      title: `Xóa ${label.toLowerCase()}?`,
                      message: `Xóa ${label.toLowerCase()} “${item.title}” khỏi bài học? Học viên sẽ không còn thấy nó.`,
                      confirmLabel: 'Xóa',
                      tone: 'danger',
                    }))) return
                    await run(async () => { await deleteLessonResource(lessonId, item.id); reload() })
                  })()}><Trash2 aria-hidden="true" size={16} /> Xóa</button>
                </div>
              </div>
            </>
          </li>
        ))}
      </ol>
      <button className="adm-btn" type="button" disabled={busy} onClick={() => { clearError(); setAdding(true) }}><Plus aria-hidden="true" size={16} /> Thêm {label.toLowerCase()}</button>
      {confirmDialog}
      {adding ? <AdminDrawer title={`Thêm ${label.toLowerCase()}`} onClose={() => setAdding(false)}>
        {(close) => <ResourceForm type={type} busy={busy} onCancel={close} onSave={async (body) => {
          const saved = await run(async () => {
            const sortOrder = items.length ? Math.max(...items.map((item) => item.sortOrder)) + 1 : 0
            await createLessonResource(lessonId, { ...body, type, sortOrder })
            reload()
          })
          if (saved) close()
          return saved
        }} />}
      </AdminDrawer> : null}
      {editingItem ? <AdminDrawer title={`Sửa ${label.toLowerCase()}`} description={editingItem.title} onClose={() => setEditing(null)}>
        {(close) => <ResourceForm item={editingItem} type={type} busy={busy} onCancel={close} onSave={async (body) => {
          const saved = await run(async () => {
            await updateLessonResource(lessonId, editingItem.id, { ...body, sortOrder: editingItem.sortOrder })
            reload()
          })
          if (saved) close()
          return saved
        }} />}
      </AdminDrawer> : null}
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
    <section className="adm-card adm-lesson-resources" aria-label="Slide và tài liệu">
      <h2>Slide và tài liệu</h2>
      <p className="adm-muted">Các đường dẫn này xuất hiện trong bài học của học viên.</p>
      {!RESOURCE_REORDER_ENABLED ? <p className="adm-muted">Chờ API đổi thứ tự. Bạn vẫn có thể thêm, sửa và xóa slide, tài liệu.</p> : null}
      {resources.status === 'loading' ? <AdminLoading label="Đang tải slide và tài liệu…" /> : null}
      {resources.status === 'error' ? <AdminError message={resources.error ?? 'Không tải được slide và tài liệu.'} onRetry={resources.reload} /> : null}
      {current ? <div className="adm-resources-grid">
        <ResourceList lessonId={lessonId} type="SLIDE" items={current.slides} reload={resources.reload} busy={busy || resources.status !== 'success'} clearError={() => setError(null)} run={run} />
        <ResourceList lessonId={lessonId} type="DOCUMENT" items={current.documents} reload={resources.reload} busy={busy || resources.status !== 'success'} clearError={() => setError(null)} run={run} />
      </div> : null}
    </section>
  )
}
