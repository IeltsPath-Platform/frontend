import { useEffect, useId, useMemo, useRef, useState } from 'react'
import { Lock, Network } from 'lucide-react'
import type { TreePoint } from '~types/learningPath'
import { TIER_ICON } from '../lib/tierIcon'
import { BOX_HEIGHT, BOX_WIDTH, CHART_PADDING, layoutTree } from '../lib/treeLayout'
import { chapterLabel, masteryPercent, tierGroup, tierMeta } from '../lib/treeMeta'
import styles from './KnowledgeTreeChart.module.css'

/** The chart shrinks to fit its frame but never below this, so a box stays readable; past it the frame pans sideways. */
const SMALLEST_SCALE = 0.7

/**
 * The points of one skill drawn as a tree that grows left to right in the order they are learnt: a column for each step,
 * and a line from every point to the points that build on it. The first column is where to start, so reading across is
 * reading the order of learning. A box is a button that selects the point; the chart is for finding your way and the
 * panel under it is for acting. The point under the pointer, or else the selected one, lights its own lines and fades
 * the rest.
 */
export function KnowledgeTreeChart({ points, title, note, selectedId, onSelect }: {
  points: readonly TreePoint[]
  /** The course, drawn as the root the tree grows from. */
  title: string
  note: string
  selectedId: string | null
  onSelect: (id: string) => void
}) {
  const layout = useMemo(() => layoutTree(points), [points])
  const byId = useMemo(() => new Map(points.map((point) => [point.knowledgePointId, point])), [points])
  const [hovered, setHovered] = useState<string | null>(null)
  const active = hovered ?? selectedId
  const markerId = useId()

  // The frame's width decides the scale. Where the browser cannot tell (a test), the chart is drawn at full size.
  const frame = useRef<HTMLDivElement>(null)
  const [frameWidth, setFrameWidth] = useState(0)
  useEffect(() => {
    const element = frame.current
    if (!element || typeof ResizeObserver === 'undefined') return
    const watch = new ResizeObserver(() => setFrameWidth(element.clientWidth))
    watch.observe(element)
    return () => watch.disconnect()
  }, [])
  const scale = frameWidth > 0 ? Math.min(1, Math.max(SMALLEST_SCALE, (frameWidth - 2) / layout.width)) : 1

  const related = new Set<string>()
  if (active) {
    for (const link of layout.links) {
      if (link.from === active) related.add(link.to)
      if (link.to === active) related.add(link.from)
    }
  }

  return (
    <div className={styles.chart}>
      <div className={styles.bar}>
        <div className={styles.root}>
          <Network aria-hidden="true" size={18} />
          <span><strong>{title}</strong><small>{note}</small></span>
        </div>
        <p className={styles.hint}>
          Đọc từ trái sang phải: cột đầu là điểm nền tảng, mỗi cột sau xây trên cột trước. Đường nối đi từ điểm cần học trước
          đến điểm xây trên nó. Chọn một ô để làm nổi đường nối của nó.
        </p>
      </div>

      <div aria-label={`Sơ đồ cây kiến thức ${note}`} className={styles.scroller} ref={frame} role="region" tabIndex={0}>
        <div className={styles.frame} style={{ inlineSize: layout.width * scale, blockSize: layout.height * scale }}>
          <div className={styles.canvas} style={{ inlineSize: layout.width, blockSize: layout.height, transform: `scale(${scale})` }}>
            <svg aria-hidden="true" className={styles.links} height={layout.height} width={layout.width}>
              <defs>
                <marker id={`${markerId}-quiet`} markerHeight="7" markerWidth="7" orient="auto" refX="6" refY="3.5"><path className={styles.arrowQuiet} d="M 0 0 L 7 3.5 L 0 7 Z" /></marker>
                <marker id={`${markerId}-lit`} markerHeight="7" markerWidth="7" orient="auto" refX="6" refY="3.5"><path className={styles.arrowLit} d="M 0 0 L 7 3.5 L 0 7 Z" /></marker>
              </defs>
              {layout.links.map((link) => {
                const lit = active !== null && (link.from === active || link.to === active)
                return (
                  <path
                    className={`${styles.link}${lit ? ` ${styles.lit}` : active ? ` ${styles.faded}` : ''}`}
                    d={link.path}
                    key={link.key}
                    markerEnd={`url(#${markerId}-${lit ? 'lit' : 'quiet'})`}
                  />
                )
              })}
            </svg>

            {layout.columns.map((column) => (
              <p className={styles.columnName} key={column.number} style={{ insetInlineStart: column.x, insetBlockStart: CHART_PADDING, inlineSize: BOX_WIDTH }}>
                <span aria-hidden="true">{column.number}</span>
                {column.number === 1 ? 'Nền tảng' : `Bước ${column.number}`}
              </p>
            ))}

            {layout.boxes.map((placed) => {
              const point = byId.get(placed.id)
              if (!point) return null
              const group = tierGroup(point)
              const tier = tierMeta(point.tier)
              const TierIcon = point.locked ? Lock : TIER_ICON[group]
              const percent = masteryPercent(point.mastery)
              return (
                <button
                  aria-controls="lp-point-detail"
                  aria-pressed={point.knowledgePointId === selectedId}
                  className={styles.box}
                  data-group={group}
                  data-locked={point.locked ? 'true' : undefined}
                  data-related={related.has(point.knowledgePointId) ? 'true' : undefined}
                  key={point.knowledgePointId}
                  onBlur={() => setHovered(null)}
                  onClick={() => onSelect(point.knowledgePointId)}
                  onFocus={() => setHovered(point.knowledgePointId)}
                  onMouseEnter={() => setHovered(point.knowledgePointId)}
                  onMouseLeave={() => setHovered(null)}
                  style={{ insetInlineStart: placed.x, insetBlockStart: placed.y, inlineSize: BOX_WIDTH, blockSize: BOX_HEIGHT }}
                  type="button"
                >
                  <span className={styles.head}>
                    <span className={styles.origin}>{point.topic && point.topic.position > 0 ? chapterLabel(point.topic.position) : point.code}</span>
                    <span className={styles.badges}>
                      {point.cefrLevel ? <span className={styles.cefr}>{point.cefrLevel}</span> : null}
                      <TierIcon aria-hidden="true" className={styles.tierIcon} size={14} strokeWidth={2.6} />
                    </span>
                  </span>
                  <span className={styles.name} title={point.name}>{point.name}</span>
                  <span aria-hidden="true" className={styles.gauge}>
                    <span className={styles.track}><span style={{ inlineSize: `${percent ?? 0}%` }} /></span>
                    <span>{percent === null ? '—' : `${percent}%`}</span>
                  </span>
                  <span className="lp-sr-only">
                    {tier.label}. Học thứ {placed.column + 1}.{percent !== null ? ` Mức nắm ${percent}%.` : ''}
                  </span>
                </button>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
