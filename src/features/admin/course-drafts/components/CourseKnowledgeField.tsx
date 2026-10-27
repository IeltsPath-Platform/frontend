import { useState } from 'react'
import { X } from 'lucide-react'
import { AdminError, AdminLoading } from '../../components/AdminState'
import { SKILL_LABEL } from '../../courses/types'
import { CEFR_LEVELS, type CefrLevel } from '../../knowledge-graph/types'
import { useCourseDraftCatalog } from '../lib/courseDraftCatalog'
import { cefrForBand, courseKnowledgeLevels, courseKnowledgeOptions } from '../lib/courseKnowledgeOptions'
import { CourseKnowledgeDialog } from './CourseKnowledgeDialog'

/**
 * The knowledge points a lesson (or one block of it) teaches: what is attached, as a small table with a remove button
 * per row, and a dialog to choose more. The dialog offers the points of the course band and the level below, as the
 * request form does; a point attached already stays in the table even when it is outside that list.
 */
export function CourseKnowledgeField({ title, value, onChange, skill, limit = 50, disabled }: {
  title: string; value: readonly string[]; onChange: (next: string[]) => void; skill: string; limit?: number; disabled: boolean
}) {
  const { knowledge, bandLevel } = useCourseDraftCatalog()
  const [open, setOpen] = useState(false)
  const nodes = knowledge.data?.nodes ?? []
  const byId = new Map(nodes.map((node) => [node.id, node]))
  const suggested = bandLevel === null ? nodes.filter((node) => node.cefrLevel) : courseKnowledgeOptions(nodes, bandLevel, [skill])
  // A point already attached but outside the suggestion (a foundation point the generator added, say) is listed too,
  // ticked, so the dialog never shows fewer points than the count says.
  const suggestedIds = new Set(suggested.map((node) => node.id))
  const attached = value.map((id) => byId.get(id)).filter((node): node is NonNullable<typeof node> => !!node?.cefrLevel && !suggestedIds.has(node.id))
  const rank = (node: { cefrLevel?: string | null }) => CEFR_LEVELS.indexOf(node.cefrLevel as CefrLevel)
  const offered = [...suggested, ...attached].sort((left, right) => rank(right) - rank(left))
  const scope = bandLevel === null ? 'chưa đặt band khóa học'
    : `band ${bandLevel.toFixed(1)} · ${SKILL_LABEL[skill as keyof typeof SKILL_LABEL] ?? skill} · cấp ${courseKnowledgeLevels(bandLevel).join(' và ') || (cefrForBand(bandLevel) ?? '—')}`

  return <div className="adm-sec">
    <div className="adm-sec__head">
      <h5 className="adm-sec__title">{title}<span className="adm-count">{value.length}/{limit}</span></h5>
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
