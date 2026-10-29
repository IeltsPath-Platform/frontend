import { AdminModal } from '../../components/AdminLayer'
import type { KnowledgeTreeRow } from '../../course-drafts/lib/courseKnowledgeTree'
import type { ChartSection } from '../lib/chartModel'
import { SKILL_LABEL, SKILL_ORDER, skillOf, type SkillKey } from '../lib/skills'
import type { TreeNode } from '../types'
import { SkillChart } from './SkillChart'

/** The skills of the points in the rows, in skill order: a chart of writing also holds grammar. */
function skillsIn(rows: readonly KnowledgeTreeRow[]): SkillKey[] {
  const found = new Set<SkillKey>()
  const visit = (row: KnowledgeTreeRow) => { found.add(skillOf(row.node.skill)); row.children.forEach(visit) }
  rows.forEach(visit)
  return SKILL_ORDER.filter((skill) => found.has(skill))
}

/**
 * The org chart of one skill in a popup of its own, with the colours of the skills it holds. Choosing a point opens its
 * details in a dialog above this one.
 */
export function ChartDialog({ section, selectedId, onSelect, warnings, isDimmed, onClose }: {
  section: ChartSection
  selectedId: string | null
  onSelect: (id: string) => void
  /** Why a point has a warning, by point id. */
  warnings: ReadonlyMap<string, string>
  isDimmed: (node: TreeNode) => boolean
  onClose: () => void
}) {
  return <AdminModal
    description="Điểm nằm dưới phải học trước điểm ngay trên nó. Đường kẻ màu nối một điểm với điểm khác cũng cần nó; rê chuột vào một ô để làm nổi đường nối của nó."
    onClose={onClose}
    size="xl"
    title={`Sơ đồ ${section.label}`}>
    <div className="kg-chart kg-popup">
      <ul aria-label="Màu theo kỹ năng" className="kg-legend">
        {skillsIn(section.rows).map((skill) => <li className={`kg-legend__item kg-legend__item--${skill.toLowerCase()}`} key={skill}>{SKILL_LABEL[skill]}</li>)}
      </ul>
      <div className="kg-popup__main">
        <SkillChart isDimmed={isDimmed} onSelect={onSelect} section={section} selectedId={selectedId} warnings={warnings} />
      </div>
    </div>
  </AdminModal>
}
