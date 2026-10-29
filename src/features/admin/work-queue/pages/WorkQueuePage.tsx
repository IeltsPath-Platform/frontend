import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowUpRight, Check, Hand, Undo2 } from 'lucide-react'
import { AdminDrawer } from '../../components/AdminLayer'
import { AdminRowMenu, type RowMenuItem } from '../../components/AdminRowMenu'
import { AdminEmpty, AdminError, AdminLoading } from '../../components/AdminState'
import { adminErrorMessage } from '../../lib/adminErrors'
import { useAdminError } from '../../lib/useAdminError'
import { useAdminResource } from '../../lib/useAdminResource'
import { AdminPage } from '../../pages/AdminPage'
import { listWorkItems, updateWorkItem } from '../api/workQueueApi'
import { KIND_HELP, KIND_LABEL, STATUS_LABEL, detailText, subjectText, workLinks } from '../lib/workQueueLabels'
import { WORK_KINDS, type WorkItem, type WorkKind, type WorkUpdate } from '../types'
import '../work-queue.css'

type StatusFilter = 'ACTIVE' | 'DONE' | 'ALL'

/** The tone of each kind: a learner with no practice is the most urgent, a question off its level the next. */
const KIND_TONE: Record<WorkKind, string> = {
  CONTENT_GAP: 'adm-badge--danger',
  QUESTION_TOO_EASY: 'adm-badge--warn',
  QUESTION_TOO_HARD: 'adm-badge--warn',
  EDGE_SUSPECT: 'adm-badge--muted',
}

const STATUS_TONE: Record<WorkItem['status'], string> = {
  OPEN: '',
  IN_PROGRESS: 'adm-badge--ok',
  DONE: 'adm-badge--muted',
}

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

function WorkRow({ item, number, busy, onUpdate, onFinish, onOpen }: {
  item: WorkItem
  number: number
  busy: boolean
  onUpdate: (change: WorkUpdate) => void
  onFinish: () => void
  onOpen: (to: string) => void
}) {
  const kind = item.kind as WorkKind
  const subject = subjectText(item)
  const actions: RowMenuItem[] = [
    ...workLinks(item).map((link) => ({
      key: link.to,
      label: link.label,
      icon: <ArrowUpRight aria-hidden="true" size={16} />,
      onSelect: () => onOpen(link.to),
    })),
    ...(item.status === 'OPEN' ? [{ key: 'take', label: 'Nhận', icon: <Hand aria-hidden="true" size={16} />, disabled: busy, onSelect: () => onUpdate({ status: 'IN_PROGRESS' }) }] : []),
    ...(item.status === 'IN_PROGRESS' ? [{ key: 'return', label: 'Trả lại', icon: <Undo2 aria-hidden="true" size={16} />, disabled: busy, onSelect: () => onUpdate({ status: 'OPEN' }) }] : []),
    ...(item.status !== 'DONE' ? [{ key: 'finish', label: 'Xong', icon: <Check aria-hidden="true" size={16} />, disabled: busy, onSelect: onFinish }] : []),
  ]
  const outcome = [item.action, item.result, item.note].filter(Boolean).join(' · ')
  return (
    <tr>
      <td className="adm-stt">{number}</td>
      <td><span className={`adm-badge ${KIND_TONE[kind] ?? ''}`} title={KIND_HELP[kind]}>{KIND_LABEL[kind] ?? item.kind}</span></td>
      <td>
        {subject}
        {item.status === 'DONE' && outcome ? <small className="adm-muted wq-outcome">{outcome}</small> : null}
      </td>
      <td className="adm-muted">{detailText(item)}</td>
      <td><span className={`adm-badge ${STATUS_TONE[item.status]}`}>{STATUS_LABEL[item.status]}</span></td>
      <td className="adm-muted">{item.createdAt ? new Date(item.createdAt).toLocaleString('vi-VN') : '—'}</td>
      <td className="adm-col-actions">
        {actions.length ? <AdminRowMenu items={actions} label={`Hành động cho ${subject}`} /> : null}
      </td>
    </tr>
  )
}

export function WorkQueuePage() {
  const navigate = useNavigate()
  const [kind, setKind] = useState<WorkKind | ''>('')
  const [status, setStatus] = useState<StatusFilter>('ACTIVE')
  const [busy, setBusy] = useState(false)
  const [finishing, setFinishing] = useState<WorkItem | null>(null)
  const [, setError] = useAdminError()
  const items = useAdminResource(`work-queue:${kind}:${status}`, (signal) =>
    listWorkItems({ kind: kind || undefined, status: status === 'DONE' ? 'DONE' : undefined }, signal))

  /** Returns whether the change was saved, so a form can stay open when it was not. */
  async function update(id: string, change: WorkUpdate): Promise<boolean> {
    if (busy) return false
    setBusy(true)
    setError(null)
    try {
      await updateWorkItem(id, change)
      items.reload()
      return true
    } catch (reason) {
      setError(adminErrorMessage(reason))
      return false
    } finally {
      setBusy(false)
    }
  }

  const shown = (items.data ?? []).filter((item) => status !== 'ACTIVE' || item.status !== 'DONE')
  return (
    <AdminPage plain subtitle="Việc hệ thống tự phát hiện từ dữ liệu học viên." title="Việc cần làm">
      <section aria-label="Bộ lọc" className="adm-block">
        <div className="adm-filters">
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
      </section>

      <section aria-label="Danh sách việc" className="adm-block">
        <header className="adm-wq-head">
          <h2>Việc</h2>
          {items.status === 'success' ? <span className="adm-badge">{shown.length}</span> : null}
        </header>
        {items.status === 'loading' ? <AdminLoading /> : null}
        {items.status === 'error' ? <AdminError message={items.error!} onRetry={items.reload} /> : null}
        {items.status === 'success' && shown.length === 0 ? <AdminEmpty title="Không có việc nào phù hợp" /> : null}
        {items.status === 'success' && shown.length > 0 ? (
          <div className="adm-table-wrap">
            <table aria-label="Danh sách việc cần làm" className="adm-table">
              <thead>
                <tr>
                  <th className="adm-stt" scope="col">STT</th>
                  <th scope="col">Loại việc</th>
                  <th scope="col">Đối tượng</th>
                  <th scope="col">Số liệu</th>
                  <th scope="col">Trạng thái</th>
                  <th scope="col">Tạo lúc</th>
                  <th className="adm-col-actions" scope="col">Hành động</th>
                </tr>
              </thead>
              <tbody>
                {shown.map((item, index) => (
                  <WorkRow
                    busy={busy}
                    item={item}
                    key={item.id}
                    number={index + 1}
                    onFinish={() => setFinishing(item)}
                    onOpen={navigate}
                    onUpdate={(change) => void update(item.id, change)}
                  />
                ))}
              </tbody>
            </table>
          </div>
        ) : null}
      </section>

      {finishing ? (
        <AdminDrawer description={subjectText(finishing)} onClose={() => setFinishing(null)} title="Hoàn thành công việc">
          {(close) => <DoneForm busy={busy} onCancel={close} onSubmit={(change) => {
            void update(finishing.id, { ...change, status: 'DONE' }).then((saved) => {
              if (saved) close()
            })
          }} />}
        </AdminDrawer>
      ) : null}
    </AdminPage>
  )
}
