import { useId, useState, type FormEvent } from 'react'
import { ArrowDown, ArrowUp, ExternalLink, Pencil, Trash2 } from 'lucide-react'
import { AdminEmpty, AdminError, AdminLoading } from '../../components/AdminState'
import { adminErrorMessage } from '../../lib/adminErrors'
import { useAdminResource } from '../../lib/useAdminResource'
import { createLessonResource, deleteLessonResource, fetchLessonResources, updateLessonResource } from '../api/lessonApi'
import type { LessonResource, LessonResourceRequest, LessonResources, LessonResourceType } from '../types'

function httpsUrl(value: string) {
  try { return new URL(value).protocol === 'https:' } catch { return false }
}

function ResourceForm({ item, type, busy, onSave, onCancel }: {
  item?: LessonResource
  type: LessonResourceType
  busy: boolean
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
        <legend>{item ? 'Sửa' : 'Thêm'} {label}</legend>
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
        <div className="adm-resource-actions">
          <button className="adm-btn adm-btn--primary" type="submit">{busy ? 'Đang lưu…' : item ? 'Lưu thay đổi' : `Thêm ${label}`}</button>
          {onCancel ? <button className="adm-btn" type="button" onClick={onCancel}>Hủy</button> : null}
        </div>
      </fieldset>
    </form>
  )
}

function ResourceList({ lessonId, type, items, reload, busy, run }: {
  lessonId: string
  type: LessonResourceType
  items: LessonResource[]
  reload: () => void
  busy: boolean
  run: (action: () => Promise<unknown>) => Promise<boolean>
}) {
  const [editing, setEditing] = useState<string | null>(null)
  const label = type === 'SLIDE' ? 'Slide' : 'Tài liệu'
  const ordered = [...items].sort((a, b) => a.sortOrder - b.sortOrder)
  return (
    <section className="adm-resource-list" aria-label={label}>
      <h3>{label} ({items.length})</h3>
      {items.length === 0 ? <AdminEmpty title={`Chưa có ${label.toLowerCase()}.`}>Thêm đường dẫn bên dưới để học viên xem trong bài học.</AdminEmpty> : null}
      <ol>
        {ordered.map((item) => (
          <li key={item.id}>
            {editing === item.id ? (
              <ResourceForm item={item} type={type} busy={busy} onCancel={() => setEditing(null)} onSave={(body) => run(async () => {
                await updateLessonResource(lessonId, item.id, { ...body, sortOrder: item.sortOrder })
                setEditing(null)
                reload()
              })} />
            ) : <>
              <div className="adm-resource-head">
                <div className="adm-resource-link">
                  <strong>{item.title}</strong>
                  {httpsUrl(item.url) ? <a href={item.url} target="_blank" rel="noreferrer">{item.url} <ExternalLink aria-hidden="true" size={14} /></a> : <span className="adm-muted">{item.url} · Sửa thành đường dẫn HTTPS để mở.</span>}
                </div>
                <div className="adm-resource-actions">
                  <button className="adm-btn" type="button" disabled aria-label={`Đưa ${item.title} lên`} title="Chờ API đổi thứ tự"><ArrowUp aria-hidden="true" size={16} /></button>
                  <button className="adm-btn" type="button" disabled aria-label={`Đưa ${item.title} xuống`} title="Chờ API đổi thứ tự"><ArrowDown aria-hidden="true" size={16} /></button>
                  <button className="adm-btn" type="button" disabled={busy} aria-label={`Sửa ${item.title}`} onClick={() => setEditing(item.id)}><Pencil aria-hidden="true" size={16} /> Sửa</button>
                  <button className="adm-btn adm-btn--danger" type="button" disabled={busy} aria-label={`Xóa ${item.title}`} onClick={() => {
                    if (window.confirm(`Xóa ${label.toLowerCase()} “${item.title}” khỏi bài học?`)) void run(async () => { await deleteLessonResource(lessonId, item.id); reload() })
                  }}><Trash2 aria-hidden="true" size={16} /> Xóa</button>
                </div>
              </div>
            </>}
          </li>
        ))}
      </ol>
      <ResourceForm type={type} busy={busy} onSave={(body) => run(async () => {
        const sortOrder = items.length ? Math.max(...items.map((item) => item.sortOrder)) + 1 : 0
        await createLessonResource(lessonId, { ...body, type, sortOrder })
        reload()
      })} />
    </section>
  )
}

export function LessonResourcesEditor({ lessonId }: { lessonId: string }) {
  const resources = useAdminResource(`lesson-resources|${lessonId}`, (signal) => fetchLessonResources(lessonId, signal))
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
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
      <p className="adm-muted">Chờ API đổi thứ tự. Bạn vẫn có thể thêm, sửa và xóa slide, tài liệu.</p>
      {error ? <div className="adm-alert adm-alert--error" role="alert">{error}</div> : null}
      {resources.status === 'loading' ? <AdminLoading label="Đang tải slide và tài liệu…" /> : null}
      {resources.status === 'error' ? <AdminError message={resources.error ?? 'Không tải được slide và tài liệu.'} onRetry={resources.reload} /> : null}
      {current ? <div className="adm-resources-grid">
        <ResourceList lessonId={lessonId} type="SLIDE" items={current.slides} reload={resources.reload} busy={busy || resources.status !== 'success'} run={run} />
        <ResourceList lessonId={lessonId} type="DOCUMENT" items={current.documents} reload={resources.reload} busy={busy || resources.status !== 'success'} run={run} />
      </div> : null}
    </section>
  )
}
