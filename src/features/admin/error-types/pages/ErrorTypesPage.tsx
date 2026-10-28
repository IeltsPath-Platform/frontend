import { useState } from 'react'
import { AdminDrawer, AdminDetails, AdminModal } from '../../components/AdminLayer'
import { AdminEmpty, AdminError, AdminLoading } from '../../components/AdminState'
import { fetchKnowledgeTree } from '../../knowledge-graph/api/knowledgeGraphApi'
import { useAdminResource } from '../../lib/useAdminResource'
import { AdminPage } from '../../pages/AdminPage'
import { fetchErrorTypes, updateErrorType } from '../api/errorTypeApi'
import { ErrorTypeForm } from '../components/ErrorTypeForm'
import { ERROR_CATEGORY_LABEL, SEVERITY_LABEL, errorTypeMessage, errorTypeUpdate } from '../lib/errorTypeLabels'
import { ERROR_CATEGORIES, type ErrorType, type ErrorTypeUpdate } from '../types'
import '../error-types.css'
import '../../questions/questions.css'
import { useAdminError } from '../../lib/useAdminError'

export function ErrorTypesPage() {
  const resource = useAdminResource('author-error-types', fetchErrorTypes)
  const points = useAdminResource('author-error-type-kps', (signal) => fetchKnowledgeTree({ includeInactive: true }, signal))
  const [category, setCategory] = useState('')
  const [review, setReview] = useState('')
  const [query, setQuery] = useState('')
  const [editing, setEditing] = useState<{ item?: ErrorType } | null>(null)
  const [viewing, setViewing] = useState<ErrorType | null>(null)
  const [busy, setBusy] = useState(false)
  const [, setError] = useAdminError()
  const text = query.trim().toLocaleLowerCase('vi')
  const rows = (resource.data ?? []).filter((item) => (!category || item.category === category) && (!review || item.reviewStatus === review) && (!text || `${item.code} ${item.name}`.toLocaleLowerCase('vi').includes(text)))
  const names = new Map(points.data?.nodes.map((point) => [point.id, point.name]) ?? [])
  async function change(item: ErrorType, patch: Partial<ErrorTypeUpdate>) {
    if (busy) return
    setBusy(true)
    setError(null)
    try { await updateErrorType(item.id, { ...errorTypeUpdate(item), ...patch }); resource.reload() } catch (reason) { setError(errorTypeMessage(reason)) } finally { setBusy(false) }
  }
  return <AdminPage title="Mã lỗi" subtitle="Quản lý lỗi thường gặp, kiến thức liên quan và gợi ý sửa để chấm, chẩn đoán bài làm." actions={<button className="adm-btn adm-btn--primary" disabled={busy || !!editing} type="button" onClick={() => setEditing({})}>Tạo mã lỗi</button>}>
    {editing ? <AdminDrawer title={editing.item ? 'Sửa mã lỗi' : 'Tạo mã lỗi'} onClose={() => setEditing(null)}>
      {(close) => <ErrorTypeForm key={editing.item?.id ?? 'new'} item={editing.item} onCancel={close} onSaved={() => { resource.reload(); close() }} />}
    </AdminDrawer> : null}
    {viewing ? <AdminModal title={viewing.name} description={viewing.code} onClose={() => setViewing(null)}>
      {(close) => <>
        <AdminDetails items={[
          { label: 'Mã', value: <code>{viewing.code}</code> },
          { label: 'Nhóm lỗi', value: ERROR_CATEGORY_LABEL[viewing.category] },
          { label: 'Mức độ', value: SEVERITY_LABEL[viewing.severity] },
          { label: 'Kiến thức liên quan', value: viewing.knowledgePointId ? names.get(viewing.knowledgePointId) ?? 'Không tìm thấy tên điểm kiến thức' : 'Chưa gắn' },
          { label: 'Gợi ý sửa', value: viewing.fixHint },
          { label: 'Trạng thái duyệt', value: viewing.reviewStatus === 'APPROVED' ? 'Đã duyệt' : 'Chưa duyệt' },
          { label: 'Trạng thái', value: viewing.status === 'ACTIVE' ? 'Đang dùng' : 'Ngừng dùng' },
        ]} />
        <div className="adm-form-footer"><button className="adm-btn" type="button" onClick={close}>Đóng</button><button className="adm-btn adm-btn--primary adm-btn--noicon" type="button" onClick={() => { setViewing(null); setEditing({ item: viewing }) }}>Sửa</button></div>
      </>}
    </AdminModal> : null}
    <div className="adm-filters">
      <label className="adm-field"><span>Lọc nhóm lỗi</span><select className="adm-select" value={category} onChange={(event) => setCategory(event.target.value)}><option value="">Tất cả nhóm</option>{ERROR_CATEGORIES.map((value) => <option key={value} value={value}>{ERROR_CATEGORY_LABEL[value]}</option>)}</select></label>
      <label className="adm-field"><span>Lọc trạng thái duyệt</span><select className="adm-select" value={review} onChange={(event) => setReview(event.target.value)}><option value="">Tất cả</option><option value="DRAFT">Chưa duyệt</option><option value="APPROVED">Đã duyệt</option></select></label>
      <label className="adm-field"><span>Tìm mã hoặc tên</span><input className="adm-input" type="search" value={query} onChange={(event) => setQuery(event.target.value)} /></label>
    </div>
    {resource.status === 'loading' ? <AdminLoading label="Đang tải mã lỗi…" /> : null}
    {resource.status === 'error' ? <AdminError message={resource.error!} onRetry={resource.reload} /> : null}
    {points.status === 'error' ? <AdminError message="Chưa tải được tên điểm kiến thức. Danh sách mã lỗi vẫn dùng được." onRetry={points.reload} /> : null}
    {resource.status === 'success' && !rows.length ? <AdminEmpty title={resource.data?.length ? 'Không có mã lỗi khớp bộ lọc' : 'Chưa có mã lỗi'}>Tạo mã lỗi mới hoặc điều chỉnh bộ lọc.</AdminEmpty> : null}
    {rows.length ? <div className="adm-table-wrap"><table className="adm-table"><caption className="adm-sr-only">Danh mục mã lỗi</caption><thead><tr>{['STT', 'Mã', 'Tên', 'Nhóm', 'Mức', 'Kiến thức', 'Duyệt', 'Trạng thái', 'Thao tác'].map((label) => <th scope="col" key={label}>{label}</th>)}</tr></thead><tbody>{rows.map((item, index) => <tr key={item.id}>
      <td className="adm-stt">{index + 1}</td><td><code>{item.code}</code></td><td>{item.name}</td><td>{ERROR_CATEGORY_LABEL[item.category]}</td><td>{SEVERITY_LABEL[item.severity]}</td><td>{item.knowledgePointId ? names.get(item.knowledgePointId) ?? (points.status === 'loading' ? 'Đang tải tên…' : 'Không tìm thấy tên điểm kiến thức') : 'Chưa gắn'}</td>
      <td><span className={`adm-badge ${item.reviewStatus === 'APPROVED' ? 'adm-badge--ok' : 'adm-badge--warn'}`}>{item.reviewStatus === 'APPROVED' ? 'Đã duyệt' : 'Chưa duyệt'}</span></td><td>{item.status === 'ACTIVE' ? 'Đang dùng' : 'Ngừng dùng'}</td>
      <td><div className="adm-error-actions"><button className="adm-btn" type="button" onClick={() => setViewing(item)} aria-label={`Chi tiết ${item.code}`}>Chi tiết</button><button className="adm-btn" type="button" disabled={busy || !!editing} onClick={() => setEditing({ item })} aria-label={`Sửa ${item.code}`}>Sửa</button>{item.reviewStatus === 'DRAFT' ? <button className="adm-btn" type="button" disabled={busy || !!editing} aria-label={`Duyệt ${item.code}`} onClick={() => void change(item, { reviewStatus: 'APPROVED' })}>Duyệt</button> : null}<button className="adm-btn" type="button" disabled={busy || !!editing} aria-label={`${item.status === 'ACTIVE' ? 'Ngừng dùng' : 'Dùng lại'} ${item.code}`} onClick={() => void change(item, { status: item.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE' })}>{item.status === 'ACTIVE' ? 'Ngừng dùng' : 'Dùng lại'}</button></div></td>
    </tr>)}</tbody></table></div> : null}
  </AdminPage>
}
