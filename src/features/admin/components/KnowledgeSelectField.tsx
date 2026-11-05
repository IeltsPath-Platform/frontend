import { useState } from 'react'
import { X } from 'lucide-react'
import { CourseKnowledgeDialog } from '../course-drafts/components/CourseKnowledgeDialog'
import type { TreeNode } from '../knowledge-graph/types'
import type { AdminResource } from '../lib/useAdminResource'
import { AdminError, AdminLoading } from './AdminState'

/**
 * The knowledge points of one record (a lesson, a block of it): the chosen ones as a small table with a remove button
 * per row and a count against the limit, and a button that opens the big picker. A chosen point that is no longer on
 * offer stays in the table, so nothing already attached is hidden.
 */
export function KnowledgeSelectField({ title, value, onChange, knowledge, offered, scope, limit = 50, disabled = false }: {
  title: string
  value: readonly string[]
  onChange: (next: string[]) => void
  knowledge: Pick<AdminResource<{ nodes: readonly TreeNode[] }>, 'status' | 'data' | 'error' | 'reload'>
  /** What the picker lists, already narrowed and ordered highest level first. */
  offered: readonly TreeNode[]
  /** The line under the picker's title that says what the list is limited to. */
  scope: string
  limit?: number
  disabled?: boolean
}) {
  const [open, setOpen] = useState(false)
  const byId = new Map((knowledge.data?.nodes ?? []).map((node) => [node.id, node]))

  return <div className="adm-sec">
    <div className="adm-sec__head">
      <h3 className="adm-sec__title">{title}<span className="adm-count">{value.length}/{limit}</span></h3>
      <button className="adm-btn adm-btn--small" disabled={disabled || knowledge.status !== 'success'} onClick={() => setOpen(true)} type="button">{value.length ? 'Sửa lựa chọn' : 'Chọn điểm kiến thức'}</button>
    </div>
    {knowledge.status === 'loading' ? <AdminLoading label="Đang tải điểm kiến thức…" /> : null}
    {knowledge.status === 'error' ? <AdminError message={knowledge.error ?? 'Không tải được điểm kiến thức.'} onRetry={knowledge.reload} /> : null}
    {knowledge.status === 'success' ? <div className="adm-table-wrap adm-kp-table">
      <table aria-label={title} className="adm-table">
        <thead><tr><th className="adm-stt" scope="col">STT</th><th scope="col">Mã</th><th scope="col">Điểm kiến thức</th><th scope="col">Cấp</th><th aria-label="Bỏ chọn" scope="col" /></tr></thead>
        <tbody>{value.length === 0 ? <tr><td className="adm-muted adm-kp-table__empty" colSpan={5}>Chưa gắn điểm kiến thức nào.</td></tr> : value.map((id, index) => {
          const node = byId.get(id)
          return <tr key={id}>
            <td className="adm-stt">{index + 1}</td><td><code>{node?.code ?? id.slice(0, 8)}</code></td>
            <td>{node?.name ?? <span className="adm-muted">Không còn trong kho điểm kiến thức</span>}</td>
            <td>{node?.cefrLevel ? <span className="adm-badge">{node.cefrLevel}</span> : null}</td>
            <td className="adm-kp-table__remove"><button aria-label={`Bỏ ${node?.code ?? id}`} disabled={disabled} onClick={() => onChange(value.filter((item) => item !== id))} type="button"><X aria-hidden="true" size={16} /></button></td>
          </tr>
        })}</tbody>
      </table>
    </div> : null}
    {open ? <CourseKnowledgeDialog description={scope} limit={limit} offered={offered} onChange={onChange} onClose={() => setOpen(false)} picked={value} /> : null}
  </div>
}
