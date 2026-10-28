import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { GraduationCap, ZoomIn, ZoomOut } from 'lucide-react'
import { AdminModal } from '../../components/AdminLayer'
import type { TreeEdge, TreeNode } from '../../knowledge-graph/types'
import { courseKnowledgeTree, type KnowledgeTreeRow } from '../lib/courseKnowledgeTree'

/** The sizes the chart can be drawn at; a wide chart is made smaller to see it whole, a small one larger to read it. */
const ZOOM_STEPS = [0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1, 1.15, 1.3, 1.5, 2] as const
const ZOOM_HOME = ZOOM_STEPS.indexOf(1)
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

/**
 * The knowledge points of a course request drawn as an organisation chart. One large box at the top stands for the course
 * band; from it a line runs to each goal, and beneath a goal are the points it needs taught first, joined by lines, as
 * deep as they go. Every other box has a checkbox that works like the one in the chooser, so a pick can be made or
 * undone from here; ticking a point brings its prerequisites, which then show ticked beneath it.
 *
 * Every point is drawn once, beneath the first point that needs it. A point that other points need too is joined to each
 * of them by a straight-edged line that runs behind the boxes, so the chart shows every link without drawing the point
 * twice.
 */
export function CourseKnowledgeChartDialog({ nodes, edges, picked, limit, description, root, onChange, onClose }: {
  nodes: readonly TreeNode[]; edges: readonly TreeEdge[]; picked: readonly string[]; limit: number; description: string
  /** The course the chart hangs from: its band as the title, and its skills as the note. */
  root: { title: string; note: string }
  onChange: (next: string[]) => void; onClose: () => void
}) {
  const rows = useMemo(() => courseKnowledgeTree(nodes, edges), [nodes, edges])
  const links = useMemo(() => crossLinks(rows), [rows])
  const atLimit = picked.length >= limit
  const [step, setStep] = useState(ZOOM_HOME)
  const zoom = ZOOM_STEPS[step]!
  // The chart is mounted inside the dialog's portal, after this component first renders, so it is held in state: the
  // measuring below runs when the element appears.
  const [tree, setTree] = useState<HTMLDivElement | null>(null)
  const boxes = useRef(new Map<string, HTMLElement>())
  // The chart's size before zoom, to size the frame that scrolls; and the cross links, measured from the real boxes.
  const [size, setSize] = useState<{ width: number; height: number } | null>(null)
  const [drawn, setDrawn] = useState<DrawnLink[]>([])
  // The point under the pointer or the keyboard: its cross links stand out and the others fade.
  const [active, setActive] = useState<string | null>(null)

  const measure = useCallback(() => {
    if (!tree) return
    setSize({ width: tree.offsetWidth, height: tree.offsetHeight })
    const next: DrawnLink[] = []
    for (const [index, link] of links.entries()) {
      const shared = boxes.current.get(link.from)
      const dependent = boxes.current.get(link.to)
      if (!shared || !dependent) continue
      next.push({ key: link.key, from: link.from, to: link.to, tone: index % LINK_TONES, ...routeBetween(placeIn(shared, tree), placeIn(dependent, tree)) })
    }
    setDrawn(next)
  }, [links, tree])
  // A ResizeObserver reports the first size as soon as it starts watching, before the next paint, so this measures once
  // the chart is laid out and again whenever its size changes.
  useEffect(() => {
    if (!tree || typeof ResizeObserver === 'undefined') return
    const watch = new ResizeObserver(measure)
    watch.observe(tree)
    return () => watch.disconnect()
  }, [measure, tree])

  /** Ticks every point in the chart, as many as the limit leaves room for. */
  function selectAll() {
    const fresh = nodes.map((node) => node.id).filter((id) => !picked.includes(id))
    onChange([...picked, ...fresh.slice(0, Math.max(0, limit - picked.length))])
  }

  function toggle(id: string, checked: boolean) {
    onChange(checked ? [...picked, id] : picked.filter((item) => item !== id))
  }

  /** A plain function, not a component, so a tick keeps the focus on the checkbox that was used. */
  function renderBranch(lines: readonly KnowledgeTreeRow[]) {
    return <ul>{lines.map((row) => {
      const { node } = row
      const checked = picked.includes(node.id)
      return <li key={node.id}>
        <label className="adm-kp-chart__box" onBlur={() => setActive(null)} onFocus={() => setActive(node.id)} onMouseEnter={() => setActive(node.id)} onMouseLeave={() => setActive(null)} ref={(element) => { if (element) boxes.current.set(node.id, element); else boxes.current.delete(node.id) }}>
          <input checked={checked} disabled={!checked && atLimit} onChange={(event) => toggle(node.id, event.target.checked)} type="checkbox" />
          <span className="adm-kp-chart__text">
            <span className="adm-kp-chart__head"><code>{node.code}</code>{node.cefrLevel ? <span className="adm-badge">{node.cefrLevel}</span> : null}</span>
            <span className="adm-kp-chart__name" title={node.name}>{node.name}</span>
            {row.alsoFor.length ? <span className="adm-sr-only">Cũng là tiên quyết của {row.alsoFor.map((other) => other.code).join(', ')}</span> : null}
          </span>
        </label>
        {row.children.length ? renderBranch(row.children) : null}
      </li>
    })}</ul>
  }

  return <AdminModal title="Sơ đồ điểm kiến thức" description={description} size="xl" stacked onClose={onClose}>
    {(close) => <>
      <div className="adm-kp-dialog__bar adm-kp-chart__hint">
        <p className="adm-muted">Điểm nằm dưới phải học trước điểm ngay trên nó. Đường kẻ màu đi từ chấm tròn (điểm tiên quyết) tới mũi tên (điểm khác cũng cần nó); rê chuột vào một ô để làm nổi đường nối của nó.</p>
        <div aria-label="Thu phóng sơ đồ" className="adm-kp-chart__zoom" role="group">
          <button aria-label="Thu nhỏ" className="adm-btn adm-btn--small adm-btn--icon" disabled={step === 0} onClick={() => setStep(step - 1)} title="Thu nhỏ" type="button"><ZoomOut aria-hidden="true" size={16} /></button>
          <button aria-label={`Đặt lại về 100% (đang ${Math.round(zoom * 100)}%)`} className="adm-btn adm-btn--small adm-kp-chart__zoom-value" disabled={step === ZOOM_HOME} onClick={() => setStep(ZOOM_HOME)} type="button">{Math.round(zoom * 100)}%</button>
          <button aria-label="Phóng to" className="adm-btn adm-btn--small adm-btn--icon" disabled={step === ZOOM_STEPS.length - 1} onClick={() => setStep(step + 1)} title="Phóng to" type="button"><ZoomIn aria-hidden="true" size={16} /></button>
        </div>
      </div>
      <div className="adm-kp-dialog__list">
        {rows.length
          ? <div aria-label="Sơ đồ điểm kiến thức" className="adm-kp-chart" role="group">
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
                  <div className="adm-kp-chart__root"><GraduationCap aria-hidden="true" size={20} /><span><strong>{root.title}</strong><small>{root.note}</small></span></div>
                  {renderBranch(rows)}
                </li></ul>
              </div>
            </div>
          </div>
          : <p className="adm-muted adm-kp-dialog__empty">Chưa có điểm kiến thức nào để hiển thị.</p>}
      </div>
      <footer className="adm-kp-dialog__footer">
        <span aria-live="polite" className="adm-muted">{picked.length}/{limit} đã chọn{atLimit ? ' · đã đạt tối đa' : ''}</span>
        <div className="adm-kp-dialog__actions">
          <button className="adm-btn" disabled={atLimit || nodes.every((node) => picked.includes(node.id))} onClick={selectAll} type="button">Chọn tất cả</button>
          <button className="adm-btn" disabled={!picked.length} onClick={() => onChange([])} type="button">Bỏ chọn tất cả</button>
          <button className="adm-btn adm-btn--primary" onClick={close} type="button">Lưu</button>
        </div>
      </footer>
    </>}
  </AdminModal>
}
