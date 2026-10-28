import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { AdminDrawer } from '../../components/AdminLayer'
import { AdminEmpty, AdminError, AdminLoading } from '../../components/AdminState'
import { adminErrorMessage } from '../../lib/adminErrors'
import { useAdminResource } from '../../lib/useAdminResource'
import { AdminPage } from '../../pages/AdminPage'
import { listWorkItems, updateWorkItem } from '../api/workQueueApi'
import { KIND_HELP, KIND_LABEL, STATUS_LABEL, detailText, subjectText, workLinks } from '../lib/workQueueLabels'
import { WORK_KINDS, type WorkItem, type WorkKind, type WorkUpdate } from '../types'
import '../work-queue.css'
import { useAdminError } from '../../lib/useAdminError'

type StatusFilter = 'ACTIVE' | 'DONE' | 'ALL'

function DoneForm({ busy, onSubmit, onCancel }: { busy: boolean; onSubmit: (update: WorkUpdate) => void; onCancel: () => void }) {
  const [action, setAction] = useState('')
  const [result, setResult] = useState('')
  const [note, setNote] = useState('')
  function submit(event: FormEvent) {
    event.preventDefault()
    onSubmit({ status: 'DONE', action, result, note })
  }
  return (
    <form aria-label="Hoàn thành công việc" onSubmit={submit}>
      <fieldset className="adm-wq-fields" disabled={busy}>
        <label className="adm-field"><span>Đã làm gì</span><textarea className="adm-textarea" maxLength={1000} value={action} onChange={(event) => setAction(event.target.value)} /></label>
        <label className="adm-field"><span>Kết quả</span><textarea className="adm-textarea" maxLength={1000} value={result} onChange={(event) => setResult(event.target.value)} /></label>
        <label className="adm-field"><span>Ghi chú</span><textarea className="adm-textarea" maxLength={1000} value={note} onChange={(event) => setNote(event.target.value)} /></label>
        <div className="adm-form-footer">
          <button className="adm-btn" type="button" onClick={onCancel}>Hủy</button>
          <button className="adm-btn adm-btn--primary" type="submit">Đánh dấu xong</button>
        </div>
      </fieldset>
    </form>
  )
}

function ItemRow({ item, busy, onUpdate }: { item: WorkItem; busy: boolean; onUpdate: (update: WorkUpdate) => void }) {
  const [finishing, setFinishing] = useState(false)
  const kind = item.kind as WorkKind
  const links = workLinks(item)
  return (
    <li className="adm-card adm-wq-item">
      <div className="adm-wq-head">
        <strong>{KIND_LABEL[kind] ?? item.kind}</strong>
        <details className="adm-wq-help">
          <summary aria-label={`Giải thích: ${KIND_LABEL[kind] ?? item.kind}`}>?</summary>
          <p>{KIND_HELP[kind] ?? ''}</p>
        </details>
        <span className="adm-badge">{STATUS_LABEL[item.status]}</span>
      </div>
      <p>{subjectText(item)}</p>
      <p className="adm-muted">{detailText(item)}{item.createdAt ? ` · tạo ${new Date(item.createdAt).toLocaleString('vi-VN')}` : ''}</p>
      {item.status === 'DONE' && (item.action || item.result || item.note) ? (
        <p className="adm-muted">{[item.action, item.result, item.note].filter(Boolean).join(' · ')}</p>
      ) : null}
      <div className="adm-wq-actions">
        {links.map((link) => <Link className="adm-btn" key={link.to} to={link.to}>{link.label}</Link>)}
        {item.status === 'OPEN' ? <button className="adm-btn" type="button" disabled={busy} onClick={() => onUpdate({ status: 'IN_PROGRESS' })}>Nhận</button> : null}
        {item.status === 'IN_PROGRESS' ? <button className="adm-btn" type="button" disabled={busy} onClick={() => onUpdate({ status: 'OPEN' })}>Trả lại</button> : null}
        {item.status !== 'DONE' ? <button className="adm-btn adm-btn--primary" type="button" disabled={busy || finishing} onClick={() => setFinishing(true)}>Xong</button> : null}
      </div>
      {finishing ? <AdminDrawer title="Hoàn thành công việc" description={subjectText(item)} onClose={() => setFinishing(false)}>
        {(close) => <DoneForm busy={busy} onCancel={close} onSubmit={(update) => { onUpdate(update); close() }} />}
      </AdminDrawer> : null}
    </li>
  )
}

export function WorkQueuePage() {
  const [kind, setKind] = useState<WorkKind | ''>('')
  const [status, setStatus] = useState<StatusFilter>('ACTIVE')
  const [busy, setBusy] = useState(false)
  const [, setError] = useAdminError()
  const items = useAdminResource(`work-queue:${kind}:${status}`, (signal) =>
    listWorkItems({ kind: kind || undefined, status: status === 'DONE' ? 'DONE' : undefined }, signal))

  async function update(id: string, change: WorkUpdate) {
    if (busy) return
    setBusy(true)
    setError(null)
    try {
      await updateWorkItem(id, change)
      items.reload()
    } catch (reason) {
      setError(adminErrorMessage(reason))
    } finally {
      setBusy(false)
    }
  }

  const shown = (items.data ?? []).filter((item) => status !== 'ACTIVE' || item.status !== 'DONE')
  return (
    <AdminPage title="Việc cần làm" subtitle="Việc hệ thống tự phát hiện cho R&D: thiếu bài luyện, câu quá dễ hoặc quá khó, quan hệ tiên quyết đáng ngờ.">
      <div className="adm-wq-workspace">
        <div className="adm-wq-actions">
          <label className="adm-field"><span>Loại việc</span>
            <select className="adm-select" value={kind} onChange={(event) => setKind(event.target.value as WorkKind | '')}>
              <option value="">Tất cả loại</option>
              {WORK_KINDS.map((value) => <option key={value} value={value}>{KIND_LABEL[value]}</option>)}
            </select>
          </label>
          <label className="adm-field"><span>Trạng thái</span>
            <select className="adm-select" value={status} onChange={(event) => setStatus(event.target.value as StatusFilter)}>
              <option value="ACTIVE">Đang mở và đang làm</option>
              <option value="DONE">Đã xong</option>
              <option value="ALL">Tất cả</option>
            </select>
          </label>
        </div>
        {items.status === 'loading' ? <AdminLoading /> : null}
        {items.status === 'error' ? <AdminError message={items.error!} onRetry={items.reload} /> : null}
        {items.status === 'success' && shown.length === 0 ? <AdminEmpty title="Không có việc nào phù hợp" /> : null}
        {items.status === 'success' && shown.length > 0 ? (
          <ul className="adm-wq-list">
            {shown.map((item) => <ItemRow key={item.id} item={item} busy={busy} onUpdate={(change) => void update(item.id, change)} />)}
          </ul>
        ) : null}
      </div>
    </AdminPage>
  )
}
