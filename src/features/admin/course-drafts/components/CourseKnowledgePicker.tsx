import { useState } from 'react'
import { X } from 'lucide-react'
import { AdminError, AdminLoading } from '../../components/AdminState'
import { SKILL_LABEL } from '../../courses/types'
import { fetchKnowledgeTree } from '../../knowledge-graph/api/knowledgeGraphApi'
import { useAdminResource } from '../../lib/useAdminResource'
import { cefrForBand, courseKnowledgeLevels, courseKnowledgeOptions } from '../lib/courseKnowledgeOptions'
import { CourseKnowledgeDialog } from './CourseKnowledgeDialog'

/**
 * The knowledge points of a course request. The form lists what is picked in a table with a remove button per row;
 * choosing happens in a dialog, so the list is never squeezed into a few visible rows inside the form.
 */
export function CourseKnowledgePicker({ value, onChange, bandLevel, skills, limit }: {
  value: readonly string[]; onChange: (next: string[]) => void; bandLevel: number; skills: readonly string[]; limit: number
}) {
  const tree = useAdminResource('course-knowledge-options', (signal) => fetchKnowledgeTree({}, signal))
  const [open, setOpen] = useState(false)
  const title = <h3>Điểm kiến thức<span aria-hidden="true" className="adm-required" /> <span className="adm-kp-field__count">{value.length}/{limit}</span></h3>
  if (tree.status === 'loading') return <div className="adm-kp-field"><div className="adm-kp-field__bar">{title}</div><AdminLoading label="Đang tải danh sách điểm kiến thức…" /></div>
  if (tree.status === 'error') return <div className="adm-kp-field"><div className="adm-kp-field__bar">{title}</div><AdminError message={tree.error ?? 'Không tải được điểm kiến thức.'} onRetry={tree.reload} /></div>

  const all = tree.data?.nodes ?? []
  const offered = courseKnowledgeOptions(all, bandLevel, skills)
  const byId = new Map(all.map((node) => [node.id, node]))
  const picked = value.map((id) => byId.get(id)).filter((node) => !!node)
  const level = cefrForBand(bandLevel)
  const levels = courseKnowledgeLevels(bandLevel)
  const skillText = skills.map((skill) => SKILL_LABEL[skill as keyof typeof SKILL_LABEL] ?? skill).join(', ') || 'chưa chọn kỹ năng'
  const scope = `band ${bandLevel.toFixed(1)} · ${skillText} · cấp ${levels.join(' và ') || '—'}`
  const levelEmpty = !!level && !all.some((node) => node.cefrLevel === level)

  return <div className="adm-kp-field">
    <div className="adm-kp-field__bar">
      <div className="adm-kp-field__title">
        {title}
        <p className="adm-muted">{offered.length} điểm phù hợp · {scope}{levelEmpty ? <span className="adm-kp-field__warn"> · cấp {level} chưa có điểm kiến thức</span> : null}</p>
      </div>
      <button className="adm-btn adm-btn--primary" onClick={() => setOpen(true)} type="button">{value.length ? 'Sửa lựa chọn' : 'Chọn điểm kiến thức'}</button>
    </div>
    <div className="adm-table-wrap adm-kp-table">
      <table aria-label="Điểm kiến thức đã chọn" className="adm-table">
        <thead><tr><th className="adm-stt" scope="col">STT</th><th scope="col">Mã</th><th scope="col">Điểm kiến thức</th><th scope="col">Kỹ năng</th><th scope="col">Cấp</th><th aria-label="Bỏ chọn" scope="col" /></tr></thead>
        <tbody>{picked.length === 0 ? <tr><td className="adm-muted adm-kp-table__empty" colSpan={6}>Chưa chọn điểm kiến thức nào.</td></tr> : picked.map((node, index) => <tr key={node.id}>
          <td className="adm-stt">{index + 1}</td><td><code>{node.code}</code></td>
          <td>{node.name}</td>
          <td className="adm-muted">{node.skill && node.skill !== 'ALL' ? SKILL_LABEL[node.skill as keyof typeof SKILL_LABEL] ?? node.skill : 'Chung'}</td>
          <td>{node.cefrLevel ? <span className="adm-badge">{node.cefrLevel}</span> : null}</td>
          <td className="adm-kp-table__remove"><button aria-label={`Bỏ chọn ${node.code}`} onClick={() => onChange(value.filter((id) => id !== node.id))} type="button"><X aria-hidden="true" size={16} /></button></td>
        </tr>)}</tbody>
      </table>
    </div>
    {open ? <CourseKnowledgeDialog description={scope} limit={limit} offered={offered} onChange={onChange} onClose={() => setOpen(false)} picked={value} /> : null}
  </div>
}
