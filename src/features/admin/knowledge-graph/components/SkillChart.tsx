import { useCallback, useEffect, useMemo, useRef, useState, type ComponentType } from 'react'
import { BookOpen, ChevronDown, ChevronRight, Headphones, Languages, Mic, PenLine, Shapes } from 'lucide-react'
import { ChartZoomControls, KnowledgeOrgChart } from '../../components/KnowledgeOrgChart'
import { ZOOM_HOME, ZOOM_STEPS, stepToFit, useChartZoom } from '../../lib/chartZoom'
import { foldRows, foldableIds, hiddenCounts } from '../lib/chartFold'
import type { ChartSection } from '../lib/chartModel'
import type { SkillKey } from '../lib/skills'
import type { TreeNode } from '../types'
import { PointBox } from './PointBox'

/** A chart wider than its frame is first drawn no smaller than this step (60%), so the boxes stay readable and the frame scrolls. */
const SMALLEST_FIRST_STEP = ZOOM_STEPS.indexOf(0.6)

/** A skill with more points than this starts with its goals folded: unfolded, it is too wide to be read at once. */
const FOLD_ABOVE = 20

const SKILL_ICON: Record<SkillKey, ComponentType<{ size?: number; 'aria-hidden'?: boolean | 'true' }>> = {
  LISTENING: Headphones, READING: BookOpen, WRITING: PenLine, SPEAKING: Mic, ALL: Languages, OTHER: Shapes,
}

/**
 * The chart of one skill: a large box in the skill's colour at the top, from it the goals of the skill, and beneath each
 * goal what it needs taught first. The chart is fitted to its frame when first drawn (no smaller than readable, no
 * larger than life); it can be zoomed, and any branch can be folded to its goal, which makes a wide skill narrower. A
 * skill of more than `FOLD_ABOVE` points starts folded to its goals.
 */
export function SkillChart({ section, selectedId, onSelect, warnings, isDimmed }: {
  section: ChartSection
  selectedId: string | null
  onSelect: (id: string) => void
  /** Why a point has a warning, by point id. */
  warnings: ReadonlyMap<string, string>
  isDimmed: (node: TreeNode) => boolean
}) {
  const zoom = useChartZoom()
  const { setStep } = zoom
  const frame = useRef<HTMLDivElement | null>(null)
  const chartSize = useRef<{ width: number; height: number } | null>(null)
  const fitted = useRef(false)
  // Set when the whole chart is folded or opened at once, so the next measure fits the chart to its frame again.
  const refit = useRef(false)
  const [folded, setFolded] = useState<ReadonlySet<string>>(
    () => new Set(section.points > FOLD_ABOVE ? section.rows.filter((row) => row.children.length).map((row) => row.node.id) : []),
  )
  const shown = useMemo(() => foldRows(section.rows, folded), [section.rows, folded])
  const hidden = useMemo(() => hiddenCounts(section.rows), [section.rows])
  const foldable = useMemo(() => foldableIds(section.rows), [section.rows])
  const Icon = SKILL_ICON[section.skill]

  /** Zooms to the largest step at which a chart of this width fits the frame as it is now, within `smallest` and 100%. */
  const fit = useCallback((width: number, smallest = 0) => {
    const room = frame.current?.clientWidth
    if (room) setStep(Math.min(Math.max(stepToFit(width, room), smallest), ZOOM_HOME))
  }, [setStep])
  // Told the chart's size each time it changes; the first time, and after the whole chart is folded or opened, the chart is
  // fitted to its frame.
  const onSize = useCallback((size: { width: number; height: number }) => {
    chartSize.current = size
    if (fitted.current && !refit.current) return
    fitted.current = true
    refit.current = false
    fit(size.width, SMALLEST_FIRST_STEP)
  }, [fit])

  // A point chosen from elsewhere (a link from a work item) may sit outside the frame: bring it into view.
  useEffect(() => {
    if (!selectedId) return
    frame.current?.querySelector<HTMLElement>(`[data-kp="${CSS.escape(selectedId)}"]`)?.scrollIntoView?.({ block: 'nearest', inline: 'nearest' })
  }, [selectedId])

  function setAll(next: ReadonlySet<string>) {
    refit.current = true
    setFolded(next)
  }

  function toggle(id: string) {
    setFolded((current) => { const next = new Set(current); if (!next.delete(id)) next.add(id); return next })
  }

  return <section aria-label={`Sơ đồ ${section.label}`} className={`kg-section kg-section--${section.skill.toLowerCase()}`}>
    <div className="kg-section__tools">
      <button className="adm-btn adm-btn--small" disabled={folded.size === 0} onClick={() => setAll(new Set())} type="button">Mở tất cả</button>
      <button className="adm-btn adm-btn--small" disabled={folded.size >= foldable.length} onClick={() => setAll(new Set(foldable))} type="button">Thu gọn tất cả</button>
      <ChartZoomControls onFit={() => { if (chartSize.current) fit(chartSize.current.width) }} zoom={zoom} />
    </div>
    <KnowledgeOrgChart
      containerRef={frame}
      highlightId={selectedId}
      label={`Đồ thị ${section.label}`}
      onSize={onSize}
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
      zoom={zoom.zoom}
    />
  </section>
}
