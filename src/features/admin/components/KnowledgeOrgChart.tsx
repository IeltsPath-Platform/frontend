import { useCallback, useEffect, useMemo, useState, type ReactNode, type Ref } from 'react'
import { Maximize2, ZoomIn, ZoomOut } from 'lucide-react'
import type { KnowledgeTreeRow } from '../course-drafts/lib/courseKnowledgeTree'
import { ZOOM_HOME, ZOOM_STEPS, type ChartZoom } from '../lib/chartZoom'
import './knowledge-org-chart.css'

/** Zoom out, back to 100%, zoom in; and, when `onFit` is given, a button that makes the chart fit its frame. */
export function ChartZoomControls({ zoom, onFit }: { zoom: ChartZoom; onFit?: () => void }) {
  const { step, setStep } = zoom
  return <div aria-label="Thu phóng sơ đồ" className="adm-kp-chart__zoom" role="group">
    <button aria-label="Thu nhỏ" className="adm-btn adm-btn--small adm-btn--icon" disabled={step === 0} onClick={() => setStep(step - 1)} title="Thu nhỏ" type="button"><ZoomOut aria-hidden="true" size={16} /></button>
    <button aria-label={`Đặt lại về 100% (đang ${Math.round(zoom.zoom * 100)}%)`} className="adm-btn adm-btn--small adm-kp-chart__zoom-value" disabled={step === ZOOM_HOME} onClick={() => setStep(ZOOM_HOME)} type="button">{Math.round(zoom.zoom * 100)}%</button>
    <button aria-label="Phóng to" className="adm-btn adm-btn--small adm-btn--icon" disabled={step === ZOOM_STEPS.length - 1} onClick={() => setStep(step + 1)} title="Phóng to" type="button"><ZoomIn aria-hidden="true" size={16} /></button>
    {onFit ? <button aria-label="Vừa khung" className="adm-btn adm-btn--small adm-btn--icon" onClick={onFit} title="Vừa khung" type="button"><Maximize2 aria-hidden="true" size={16} /></button> : null}
  </div>
}

/** How far from the edge of a row a cross link runs in the gap between rows, and how far a bracket stands off a column. */
const GAP_RUN = 11
const SIDE_RUN = 12
/** Size of the arrowhead at the end of a cross link, in pixels. */
const ARROW_LENGTH = 9
const ARROW_WIDTH = 5

/** A point that serves a second point besides the one it hangs beneath: a line from the first to the second. */
interface Link { key: string; from: string; to: string }
/** `start` is where the line leaves the point that is needed; `arrow` is the head where it reaches the point that needs it. */
interface DrawnLink { key: string; from: string; to: string; tone: number; path: string; arrow: string; start: [number, number] }
/** Cross links take turns among this many colours, so lines that meet or cross can still be told apart. */
const LINK_TONES = 3
interface Box { x: number; y: number; width: number; height: number }

/** Every cross link of the tree. */
function crossLinks(rows: readonly KnowledgeTreeRow[]): Link[] {
  return rows.flatMap((row) => [
    ...row.alsoFor.map((other) => ({ key: `${row.node.id}>${other.id}`, from: row.node.id, to: other.id })),
    ...crossLinks(row.children),
  ])
}

/** Where an element sits inside `tree`, read from the layout alone so the zoom of the chart does not change it. */
function placeIn(element: HTMLElement, tree: HTMLElement) {
  let x = 0
  let y = 0
  for (let current: HTMLElement | null = element; current && current !== tree; current = current.offsetParent as HTMLElement | null) {
    x += current.offsetLeft
    y += current.offsetTop
  }
  return { x, y, width: element.offsetWidth, height: element.offsetHeight }
}

/**
 * A straight-edged line from a point to a second point that also needs it, as an SVG path. Rows of boxes sit at the
 * same heights across the chart, so a line can run in the gap between two rows without touching a box:
 * - in the same column, a bracket beside the column, from the side of one box to the side of the other;
 * - when the second point is above, up into the gap above the point, across to the other column, and up to it;
 * - otherwise (the same row, or lower), down into the gap below the lower of the two, across, and up to the second point.
 * The line ends with an arrowhead on the point that needs the other one.
 */
function routeBetween(shared: Box, other: Box): Pick<DrawnLink, 'path' | 'arrow' | 'start'> {
  const sharedX = shared.x + shared.width / 2
  const otherX = other.x + other.width / 2
  const points: Array<[number, number]> = []
  const bracket = Math.abs(sharedX - otherX) < shared.width / 2
  if (bracket) {
    const edge = Math.max(shared.x + shared.width, other.x + other.width) + SIDE_RUN
    points.push([shared.x + shared.width, shared.y + shared.height / 2], [edge, shared.y + shared.height / 2], [edge, other.y + other.height / 2], [other.x + other.width, other.y + other.height / 2])
  } else if (other.y + other.height <= shared.y - 2) {
    const run = shared.y - GAP_RUN
    points.push([sharedX, shared.y], [sharedX, run], [otherX, run], [otherX, other.y + other.height])
  } else {
    const run = Math.max(shared.y + shared.height, other.y + other.height) + GAP_RUN
    points.push([sharedX, shared.y + shared.height], [sharedX, run], [otherX, run], [otherX, other.y + other.height])
  }
  const [tipX, tipY] = points[points.length - 1]!
  // A bracket ends going left into the side of the box; every other route ends going up into its bottom edge.
  const arrow = bracket
    ? `M ${tipX} ${tipY} L ${tipX + ARROW_LENGTH} ${tipY - ARROW_WIDTH} L ${tipX + ARROW_LENGTH} ${tipY + ARROW_WIDTH} Z`
    : `M ${tipX} ${tipY} L ${tipX - ARROW_WIDTH} ${tipY + ARROW_LENGTH} L ${tipX + ARROW_WIDTH} ${tipY + ARROW_LENGTH} Z`
  return { path: points.map(([x, y], index) => `${index === 0 ? 'M' : 'L'} ${x} ${y}`).join(' '), arrow, start: points[0]! }
}

/** What a box must carry so the chart can measure it and light its links when it is hovered or focused. */
export interface ChartBoxProps {
  className: string
  ref: (element: HTMLElement | null) => void
  onMouseEnter: () => void
  onMouseLeave: () => void
  onFocus: () => void
  onBlur: () => void
}

/**
 * A prerequisite tree drawn as an organisation chart. One large box at the top (`root`); from it a line runs to each
 * root row, and beneath a row are the rows it needs taught first, joined by lines, as deep as they go.
 *
 * Every point is drawn once, beneath the first point that needs it. A point that other points need too is joined to each
 * of them by a straight-edged line that runs behind the boxes, so the chart shows every link without drawing the point
 * twice. A box is drawn by `renderBox`, which must spread the given props on its one element: the chart measures that
 * element to route the links, and lights the links of the box under the pointer, or of `highlightId` when none is.
 */
export function KnowledgeOrgChart({ rows, zoom, label, root, renderBox, highlightId = null, onSize, containerRef }: {
  rows: readonly KnowledgeTreeRow[]
  zoom: number
  label: string
  /** The inside of the large box at the top. */
  root: ReactNode
  renderBox: (row: KnowledgeTreeRow, box: ChartBoxProps) => ReactNode
  highlightId?: string | null
  /** Told the size of the chart before zoom, each time it changes. */
  onSize?: (size: { width: number; height: number }) => void
  /** The element that holds the chart, for a caller that scrolls it or fits the chart to it. */
  containerRef?: Ref<HTMLDivElement>
}) {
  const links = useMemo(() => crossLinks(rows), [rows])
  // The chart may be mounted inside a portal after its parent first renders, so it is held in state: the measuring below
  // runs when the element appears.
  const [tree, setTree] = useState<HTMLDivElement | null>(null)
  // The boxes by point, filled as they mount. A map held in state, not a ref: nothing reads it while drawing.
  const [boxes] = useState(() => new Map<string, HTMLElement>())
  // The chart's size before zoom, to size the frame that scrolls; and the cross links, measured from the real boxes.
  const [size, setSize] = useState<{ width: number; height: number } | null>(null)
  const [drawn, setDrawn] = useState<DrawnLink[]>([])
  // The point under the pointer or the keyboard: its cross links stand out and the others fade.
  const [hovered, setHovered] = useState<string | null>(null)
  const active = hovered ?? highlightId

  const measure = useCallback(() => {
    if (!tree) return
    const next = { width: tree.offsetWidth, height: tree.offsetHeight }
    setSize(next)
    onSize?.(next)
    const lines: DrawnLink[] = []
    for (const [index, link] of links.entries()) {
      const shared = boxes.get(link.from)
      const dependent = boxes.get(link.to)
      if (!shared || !dependent) continue
      lines.push({ key: link.key, from: link.from, to: link.to, tone: index % LINK_TONES, ...routeBetween(placeIn(shared, tree), placeIn(dependent, tree)) })
    }
    setDrawn(lines)
  }, [boxes, links, onSize, tree])
  // A ResizeObserver reports the first size as soon as it starts watching, before the next paint, so this measures once
  // the chart is laid out and again whenever its size changes.
  useEffect(() => {
    if (!tree || typeof ResizeObserver === 'undefined') return
    const watch = new ResizeObserver(measure)
    watch.observe(tree)
    return () => watch.disconnect()
  }, [measure, tree])

  /** A plain function, not a component, so a box keeps its focus when the chart is drawn again. */
  function renderBranch(lines: readonly KnowledgeTreeRow[]) {
    return <ul>{lines.map((row) => {
      const id = row.node.id
      const box: ChartBoxProps = {
        className: 'adm-kp-chart__box',
        ref: (element) => { if (element) boxes.set(id, element); else boxes.delete(id) },
        onMouseEnter: () => setHovered(id),
        onMouseLeave: () => setHovered(null),
        onFocus: () => setHovered(id),
        onBlur: () => setHovered(null),
      }
      return <li key={id}>
        {renderBox(row, box)}
        {row.children.length ? renderBranch(row.children) : null}
      </li>
    })}</ul>
  }

  return <div aria-label={label} className="adm-kp-chart" ref={containerRef} role="group">
    <div className="adm-kp-chart__frame" style={size ? { width: size.width * zoom, height: size.height * zoom } : undefined}>
      <div className="adm-kp-chart__tree" ref={setTree} style={{ transform: `scale(${zoom})` }}>
        <svg aria-hidden="true" className="adm-kp-chart__links">
          {drawn.map((link) => <g className={`adm-kp-chart__link adm-kp-chart__link--${link.tone}${active ? (link.from === active || link.to === active ? ' is-active' : ' is-dim') : ''}`} key={link.key}>
            <path className="adm-kp-chart__line" d={link.path} />
            <circle cx={link.start[0]} cy={link.start[1]} r={3.5} />
            <path d={link.arrow} />
          </g>)}
        </svg>
        <ul><li>
          <div className="adm-kp-chart__root">{root}</div>
          {renderBranch(rows)}
        </li></ul>
      </div>
    </div>
  </div>
}
