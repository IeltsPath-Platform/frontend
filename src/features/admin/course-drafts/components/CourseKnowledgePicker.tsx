import { useState, type CSSProperties } from 'react'
import { ChevronDown, Network, X } from 'lucide-react'
import { useToast } from '@/components/toast/toastContext'
import { AdminError, AdminLoading } from '../../components/AdminState'
import { SKILL_LABEL } from '../../courses/types'
import { fetchKnowledgeTree } from '../../knowledge-graph/api/knowledgeGraphApi'
import { CEFR_LEVELS, type CefrLevel } from '../../knowledge-graph/types'
import { useAdminResource } from '../../lib/useAdminResource'
import { courseKnowledgeLevels, courseKnowledgeOptions } from '../lib/courseKnowledgeOptions'
import { coursePrerequisites } from '../lib/coursePrerequisites'
import { courseKnowledgeTree, visibleKnowledgeLines } from '../lib/courseKnowledgeTree'
import { CourseKnowledgeDialog } from './CourseKnowledgeDialog'
import { CourseKnowledgeChartDialog } from './CourseKnowledgeChartDialog'

/**
 * The knowledge points of a course request. The form lists what is picked in a table with a remove button per row;
 * choosing happens in a dialog, so the list is never squeezed into a few visible rows inside the form.
 *
 * The table is a tree: each goal on its own line and the prerequisites it needs indented beneath it, which fold shut.
 * Picking a point also picks its prerequisites, and theirs in turn, whatever their level, so the course starts from the
 * earliest one. They are ordinary picks: they sit beneath the point that needs them, stay on offer in the
 * dialog whether ticked or not, and the author removes any of them. Only the points picked are sent to the generator.
 * A second dialog draws the same points as a chart of boxes joined by lines, where they can be ticked and unticked too.
 */
export function CourseKnowledgePicker({ value, onChange, bandLevel, skills, limit }: {
  value: readonly string[]; onChange: (next: string[]) => void; bandLevel: number; skills: readonly string[]; limit: number
}) {
  const tree = useAdminResource('course-knowledge-options', (signal) => fetchKnowledgeTree({}, signal))
  const { toast } = useToast()
  const [open, setOpen] = useState(false)
  const [treeOpen, setTreeOpen] = useState(false)
  const [closed, setClosed] = useState<ReadonlySet<string>>(new Set())
  const title = <h3>Điểm kiến thức<span aria-hidden="true" className="adm-required" /> <span className="adm-kp-field__count">{value.length}/{limit}</span></h3>
  if (tree.status === 'loading') return <div className="adm-kp-field"><div className="adm-kp-field__bar">{title}</div><AdminLoading label="Đang tải danh sách điểm kiến thức…" /></div>
  if (tree.status === 'error') return <div className="adm-kp-field"><div className="adm-kp-field__bar">{title}</div><AdminError message={tree.error ?? 'Không tải được điểm kiến thức.'} onRetry={tree.reload} /></div>

  const all = tree.data?.nodes ?? []
  const edges = tree.data?.edges ?? []
  const suggested = courseKnowledgeOptions(all, bandLevel, skills)
  // What is picked, and the prerequisites of it, stay on offer outside the band's levels so each can be ticked or unticked.
  const suggestedIds = new Set(suggested.map((node) => node.id))
  const related = new Set([...value, ...coursePrerequisites(value, all, edges)])
  const rank = (node: { cefrLevel?: string | null }) => CEFR_LEVELS.indexOf(node.cefrLevel as CefrLevel)
  const offered = [...suggested, ...all.filter((node) => !!node.cefrLevel && related.has(node.id) && !suggestedIds.has(node.id))]
    .sort((left, right) => rank(right) - rank(left))
  const pickedIds = new Set(value)
  const byId = new Map(all.map((node) => [node.id, node]))
  const picked = value.map((id) => byId.get(id)).filter((node) => !!node)
  const treeRows = courseKnowledgeTree(picked, edges)
  const lines = visibleKnowledgeLines(treeRows, closed)
  const fold = (id: string) => setClosed((current) => { const next = new Set(current); if (!next.delete(id)) next.add(id); return next })
  const levels = courseKnowledgeLevels(bandLevel)
  const skillText = skills.map((skill) => SKILL_LABEL[skill as keyof typeof SKILL_LABEL] ?? skill).join(', ') || 'chưa chọn kỹ năng'

  /**
   * Every change of the pick goes through here. Points newly ticked bring their prerequisites with them, deepest first and
   * before them, as far as the limit allows. Points unticked take with them the prerequisites beneath them that nothing
   * else picked needs. A prerequisite stays only while a point that stays picked needs it directly, or through points
   * that stay picked: a chain that runs through an unticked point is broken there, so what hangs below that point goes too.
   */
  function choose(requested: string[]) {
    const requestedSet = new Set(requested)
    const removed = value.filter((id) => !requestedSet.has(id))
    let next = requested
    let dropped: string[] = []
    if (removed.length > 0) {
      const candidates = new Set(coursePrerequisites(removed, all, edges).filter((id) => requestedSet.has(id)))
      if (candidates.size > 0) {
        const dependents = new Map<string, string[]>()
        for (const edge of edges) dependents.set(edge.from, [...(dependents.get(edge.from) ?? []), edge.to])
        const stays = new Set(requested.filter((id) => !candidates.has(id)))
        for (let grew = true; grew;) {
          grew = false
          for (const id of candidates) {
            if (!stays.has(id) && (dependents.get(id) ?? []).some((other) => stays.has(other))) { stays.add(id); grew = true }
          }
        }
        dropped = [...candidates].filter((id) => !stays.has(id))
        next = requested.filter((id) => !dropped.includes(id))
      }
    }
    const added = next.filter((id) => !pickedIds.has(id))
    const extra = coursePrerequisites(added, all, edges).filter((id) => !next.includes(id))
    const room = Math.max(0, limit - next.length)
    const taken = room >= extra.length ? extra : extra.slice(extra.length - room)
    onChange([...next.filter((id) => !added.includes(id)), ...taken, ...added])
    // What was added or dropped shows in the table and the chart at once; only what cannot be seen is said.
    if (taken.length < extra.length) {
      toast({
        title: taken.length ? 'Chưa thêm đủ kiến thức tiên quyết' : 'Chưa thêm được kiến thức tiên quyết',
        description: `Còn ${extra.length - taken.length} điểm chưa thêm vì đã đủ ${limit} điểm.`,
        tone: 'info',
      })
    }
  }

  /** Everything on offer plus the lower-level prerequisites below it, so the chart shows how far each chain goes. */
  function treeNodes() {
    const shown = new Map(offered.map((node) => [node.id, node]))
    for (const id of coursePrerequisites(offered.map((node) => node.id), all, edges)) {
      const node = byId.get(id)
      if (node) shown.set(id, node)
    }
    return [...shown.values()]
  }

  const scope = `band ${bandLevel.toFixed(1)} · ${skillText} · cấp ${levels.join(' và ') || '—'}`

  return <div className="adm-kp-field">
    <div className="adm-kp-field__bar">
      <div className="adm-kp-field__title">
        {title}
      </div>
      <div className="adm-kp-field__actions">
        <button aria-label="Xem sơ đồ" className="adm-btn adm-btn--icon" onClick={() => setTreeOpen(true)} title="Xem sơ đồ" type="button"><Network aria-hidden="true" size={18} /></button>
        <button className="adm-btn adm-btn--primary" onClick={() => setOpen(true)} type="button">{value.length ? 'Sửa lựa chọn' : 'Chọn điểm kiến thức'}</button>
      </div>
    </div>
    <div className="adm-table-wrap adm-kp-table">
      <table aria-label="Điểm kiến thức đã chọn" className="adm-table">
        <thead><tr><th className="adm-stt" scope="col">STT</th><th scope="col">Mã</th><th scope="col">Điểm kiến thức</th><th scope="col">Kỹ năng</th><th scope="col">Cấp</th><th aria-label="Bỏ chọn" scope="col" /></tr></thead>
        <tbody>{picked.length === 0 ? <tr><td className="adm-muted adm-kp-table__empty" colSpan={6}>Chưa chọn điểm kiến thức nào.</td></tr> : lines.map(({ row, depth }, index) => {
          const node = row.node
          const open = !closed.has(node.id)
          return <tr key={`${node.id}-${index}`}>
          <td className="adm-stt">{index + 1}</td>
          <td><span className="adm-kp-treecell" style={{ '--depth': depth } as CSSProperties}>
            {row.children.length
              ? <button aria-expanded={open} aria-label={`${open ? 'Thu gọn' : 'Mở'} ${node.code}`} className="adm-kp-tree__toggle" onClick={() => fold(node.id)} type="button"><ChevronDown aria-hidden="true" size={16} /></button>
              : <span aria-hidden="true" className="adm-kp-tree__spacer" />}
            <code>{node.code}</code>
          </span></td>
          <td>{node.name}</td>
          <td className="adm-muted">{node.skill && node.skill !== 'ALL' ? SKILL_LABEL[node.skill as keyof typeof SKILL_LABEL] ?? node.skill : 'Chung'}</td>
          <td>{node.cefrLevel ? <span className="adm-badge">{node.cefrLevel}</span> : null}</td>
          <td className="adm-kp-table__remove"><button aria-label={`Bỏ chọn ${node.code}`} onClick={() => choose(value.filter((id) => id !== node.id))} type="button"><X aria-hidden="true" size={16} /></button></td>
        </tr>
        })}</tbody>
      </table>
    </div>
    {treeOpen ? <CourseKnowledgeChartDialog description={scope} edges={edges} limit={limit} nodes={treeNodes()} onChange={choose} onClose={() => setTreeOpen(false)} picked={value} root={{ title: `Khóa học band ${bandLevel.toFixed(1)}`, note: skillText }} /> : null}
    {open ? <CourseKnowledgeDialog description={scope} limit={limit} offered={offered} onChange={choose} onClose={() => setOpen(false)} picked={value} /> : null}
  </div>
}
