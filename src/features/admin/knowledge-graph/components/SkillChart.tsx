import { useMemo, useState, type ComponentType } from 'react'
import { BookOpen, ChevronDown, ChevronRight, Headphones, Languages, Mic, PenLine, Shapes } from 'lucide-react'
import { KnowledgeOrgChart } from '../../components/KnowledgeOrgChart'
import { foldRows, foldableIds, hiddenCounts } from '../lib/chartFold'
import type { ChartSection } from '../lib/chartModel'
import type { SkillKey } from '../lib/skills'
import type { TreeNode } from '../types'
import { PointBox } from './PointBox'

/** A skill with more points than this starts with its goals folded: unfolded, it is too wide to be read at once. */
const FOLD_ABOVE = 20

const SKILL_ICON: Record<SkillKey, ComponentType<{ size?: number; 'aria-hidden'?: boolean | 'true' }>> = {
  LISTENING: Headphones, READING: BookOpen, WRITING: PenLine, SPEAKING: Mic, ALL: Languages, OTHER: Shapes,
}

/**
 * The chart of one skill: a large box in the skill's colour at the top, from it the goals of the skill, and beneath each
 * goal what it needs taught first. The chart is fitted to its frame when first drawn and can be panned and zoomed; any
 * branch can be folded to its goal, which makes a wide skill narrower. A skill of more than `FOLD_ABOVE` points starts
 * folded to its goals. Folding or opening the whole chart fits it to its frame again; folding one branch leaves the view alone.
 */
export function SkillChart({ section, selectedId, onSelect, warnings, isDimmed }: {
  section: ChartSection
  selectedId: string | null
  onSelect: (id: string) => void
  /** Why a point has a warning, by point id. */
  warnings: ReadonlyMap<string, string>
  isDimmed: (node: TreeNode) => boolean
}) {
  const [folded, setFolded] = useState<ReadonlySet<string>>(
    () => new Set(section.points > FOLD_ABOVE ? section.rows.filter((row) => row.children.length).map((row) => row.node.id) : []),
  )
  // Counts the times the whole chart was folded or opened at once: each one fits the chart to its frame again.
  const [wholeChanges, setWholeChanges] = useState(0)
  const shown = useMemo(() => foldRows(section.rows, folded), [section.rows, folded])
  const hidden = useMemo(() => hiddenCounts(section.rows), [section.rows])
  const foldable = useMemo(() => foldableIds(section.rows), [section.rows])
  const Icon = SKILL_ICON[section.skill]

  function setAll(next: ReadonlySet<string>) {
    setFolded(next)
    setWholeChanges((count) => count + 1)
  }

  function toggle(id: string) {
    setFolded((current) => { const next = new Set(current); if (!next.delete(id)) next.add(id); return next })
  }

  return <section aria-label={`Sơ đồ ${section.label}`} className={`kg-section kg-section--${section.skill.toLowerCase()}`}>
    <div className="kg-section__tools">
      <button className="adm-btn adm-btn--small" disabled={folded.size === 0} onClick={() => setAll(new Set())} type="button">Mở tất cả</button>
      <button className="adm-btn adm-btn--small" disabled={folded.size >= foldable.length} onClick={() => setAll(new Set(foldable))} type="button">Thu gọn tất cả</button>
    </div>
    <KnowledgeOrgChart
      fitAgain={wholeChanges}
      highlightId={selectedId}
      label={`Đồ thị ${section.label}`}
      renderBox={(row, box) => {
        const { node } = row
        const count = hidden.get(node.id)
        const isFolded = folded.has(node.id)
        return <div className="kg-node">
          <PointBox box={box} dimmed={isDimmed(node)} node={node} onSelect={onSelect} selected={node.id === selectedId} warning={warnings.get(node.id) ?? null} />
          {count ? <button aria-expanded={!isFolded} aria-label={`${isFolded ? 'Mở' : 'Thu gọn'} nhánh ${node.code}`} className="kg-fold" onClick={() => toggle(node.id)} type="button">
            {isFolded ? <><ChevronRight aria-hidden="true" size={13} />+{count}</> : <ChevronDown aria-hidden="true" size={13} />}
          </button> : null}
        </div>
      }}
      root={<><Icon aria-hidden="true" size={22} /><span><strong>{section.label}</strong><small>{section.points} điểm kiến thức</small></span></>}
      rows={shown}
    />
  </section>
}
