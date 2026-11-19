import { createContext, memo, useCallback, useContext, useEffect, useId, useMemo, useRef, useState, type ReactNode } from 'react'
import {
  Controls, Position, ReactFlow, getSmoothStepPath, useReactFlow, useStore, useStoreApi,
  type Edge, type EdgeProps, type FitViewOptions, type Node, type NodeMouseHandler, type NodeProps,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import type { KnowledgeTreeRow } from '../course-drafts/lib/courseKnowledgeTree'
import { BOX_HEIGHT, BOX_WIDTH, ORG_ROOT_ID, ROOT_HEIGHT, ROOT_WIDTH, layoutOrgChart } from '../lib/orgChartLayout'
import './knowledge-org-chart.css'

/** What a box must carry so the chart can light the links of the point under the pointer or the keyboard. */
export interface ChartBoxProps {
  className: string
  onMouseEnter: () => void
  onMouseLeave: () => void
  onFocus: () => void
  onBlur: () => void
}

type PointNode = Node<{ row: KnowledgeTreeRow }, 'point'>
type RootNode = Node<Record<string, never>, 'root'>
type OrgNode = PointNode | RootNode
type BranchEdge = Edge<Record<string, never>, 'branch'>
type LinkState = 'quiet' | 'active' | 'dim'
type LinkEdge = Edge<{ tone: number; state: LinkState; markerId: string }, 'link'>

/** Cross links take turns among this many colours, so lines that meet or cross can still be told apart. */
const LINK_TONES = 3
/** Where a line meets a box. A handle is given to React Flow up front (a box that already has its size is not measured). */
const end = (id: string, type: 'source' | 'target', position: Position, x: number, y: number) => ({ id, type, position, x, y, width: 1, height: 1 }) as const
const POINT_ENDS = [
  end('up', 'target', Position.Top, BOX_WIDTH / 2 - 0.5, 0),
  end('down', 'source', Position.Bottom, BOX_WIDTH / 2 - 0.5, BOX_HEIGHT - 1),
  end('out-left', 'source', Position.Left, 0, BOX_HEIGHT / 2 - 0.5),
  end('out-right', 'source', Position.Right, BOX_WIDTH - 1, BOX_HEIGHT / 2 - 0.5),
  end('in-left', 'target', Position.Left, 0, BOX_HEIGHT / 2 - 0.5),
  end('in-right', 'target', Position.Right, BOX_WIDTH - 1, BOX_HEIGHT / 2 - 0.5),
]
const ROOT_ENDS = [end('down', 'source', Position.Bottom, ROOT_WIDTH / 2 - 0.5, ROOT_HEIGHT - 1)]
/** Nothing here is dragged, connected, selected or deleted by React Flow: the chart only reads. */
const READ_ONLY = { draggable: false, selectable: false, focusable: false, connectable: false, deletable: false } as const

const FIT: FitViewOptions = { padding: 0.04, minZoom: 0.4, maxZoom: 1, duration: 0 }
const ARIA_LABELS = {
  'controls.ariaLabel': 'Điều khiển sơ đồ',
  'controls.zoomIn.ariaLabel': 'Phóng to',
  'controls.zoomOut.ariaLabel': 'Thu nhỏ',
  'controls.fitView.ariaLabel': 'Vừa khung',
} as const

interface OrgChartContext {
  root: ReactNode
  renderBox: (row: KnowledgeTreeRow, box: ChartBoxProps) => ReactNode
  hover: (id: string | null) => void
}
const OrgChartScope = createContext<OrgChartContext>({ root: null, renderBox: () => null, hover: () => undefined })

/** One point, drawn by the caller. The box props light the point's links; the size is the layout's, so the box must match it. */
const PointView = memo(function PointView({ data }: NodeProps<PointNode>) {
  const { renderBox, hover } = useContext(OrgChartScope)
  const id = data.row.node.id
  const box: ChartBoxProps = {
    className: 'adm-kp-chart__box',
    onMouseEnter: () => hover(id), onMouseLeave: () => hover(null), onFocus: () => hover(id), onBlur: () => hover(null),
  }
  return renderBox(data.row, box)
})

const RootView = memo(function RootView() {
  const { root } = useContext(OrgChartScope)
  return <div className="adm-kp-chart__root">{root}</div>
})

const nodeTypes = { point: PointView, root: RootView }

/** A plain line from a point to what it needs taught first. */
function BranchView({ sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition }: EdgeProps<BranchEdge>) {
  const [path] = getSmoothStepPath({ sourceX, sourceY, sourcePosition, targetX, targetY, targetPosition, borderRadius: 7 })
  return <path className="adm-kp-chart__branch" d={path} />
}

/** A point that serves a second point too: a line with a dot where it leaves the first and an arrow where it reaches the second. */
function LinkView({ sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition, data }: EdgeProps<LinkEdge>) {
  const [path] = getSmoothStepPath({ sourceX, sourceY, sourcePosition, targetX, targetY, targetPosition, borderRadius: 6, offset: 14 })
  const tone = data?.tone ?? 0
  const state = data?.state ?? 'quiet'
  return <g className={`adm-kp-chart__link adm-kp-chart__link--${tone}${state === 'active' ? ' is-active' : state === 'dim' ? ' is-dim' : ''}`}>
    <path className="adm-kp-chart__line" d={path} markerEnd={`url(#${data?.markerId}-${tone})`} />
    <circle cx={sourceX} cy={sourceY} r={3.5} />
  </g>
}
const edgeTypes = { branch: BranchView, link: LinkView }

/** Fits the whole chart into the frame when it first appears, when the frame changes size, and when `again` changes. */
function FitToFrame({ again }: { again: unknown }) {
  const { fitView } = useReactFlow()
  const size = useStore((state) => `${state.width}x${state.height}`)
  useEffect(() => { void fitView(FIT) }, [fitView, size, again])
  return null
}

/** Brings the highlighted point into view when it is outside the frame (it may have been picked from elsewhere). */
function Reveal({ id, places }: { id: string | null; places: ReadonlyMap<string, { x: number; y: number }> }) {
  const store = useStoreApi()
  const { setCenter } = useReactFlow()
  const latest = useRef(places)
  useEffect(() => { latest.current = places })
  useEffect(() => {
    const spot = id ? latest.current.get(id) : undefined
    if (!spot) return
    const { transform: [tx, ty, zoom], width, height } = store.getState()
    if (width === 0 || height === 0) return
    const left = spot.x * zoom + tx
    const top = spot.y * zoom + ty
    if (left < 0 || top < 0 || left + BOX_WIDTH * zoom > width || top + BOX_HEIGHT * zoom > height) {
      void setCenter(spot.x + BOX_WIDTH / 2, spot.y + BOX_HEIGHT / 2, { zoom, duration: 0 })
    }
  }, [id, setCenter, store])
  return null
}

/**
 * A prerequisite tree drawn as an organisation chart on React Flow. One large box at the top (`root`); from it a line runs to
 * each goal, and beneath a point are the points it needs taught first, as deep as they go. {@link layoutOrgChart} decides where
 * every box goes; React Flow draws the boxes and lines and gives the frame its panning and zoom (the buttons, a pinch, or the
 * wheel with Ctrl held: the page keeps scrolling with the wheel).
 *
 * Every point is drawn once, beneath the first point that needs it. A point that other points need too is joined to each of
 * them by a coloured line (a dot where it leaves the first point, an arrow where it reaches the second), so the chart shows
 * every link without drawing the point twice. The lines of the point under the pointer, or of `highlightId` when none is, stand
 * out and the others fade. A box is drawn by `renderBox`, which must spread the given props on its one element and match the
 * layout's box size.
 */
export function KnowledgeOrgChart({ rows, label, root, renderBox, highlightId = null, fitAgain }: {
  rows: readonly KnowledgeTreeRow[]
  label: string
  /** The inside of the large box at the top. */
  root: ReactNode
  renderBox: (row: KnowledgeTreeRow, box: ChartBoxProps) => ReactNode
  highlightId?: string | null
  /** Fits the chart to its frame again whenever this value changes (when it is folded or opened as a whole, say). */
  fitAgain?: unknown
}) {
  const layout = useMemo(() => layoutOrgChart(rows), [rows])
  const [hovered, setHovered] = useState<string | null>(null)
  const active = hovered ?? highlightId
  const markerId = useId()

  const nodes = useMemo<OrgNode[]>(() => [
    { id: ORG_ROOT_ID, type: 'root', position: layout.root, width: ROOT_WIDTH, height: ROOT_HEIGHT, handles: [...ROOT_ENDS], data: {}, ...READ_ONLY },
    ...layout.rows.map((placed): PointNode => ({
      id: placed.id, type: 'point', position: { x: placed.x, y: placed.y }, width: BOX_WIDTH, height: BOX_HEIGHT,
      handles: [...POINT_ENDS], data: { row: placed.row }, ...READ_ONLY,
    })),
  ], [layout])

  const edges = useMemo<Array<BranchEdge | LinkEdge>>(() => {
    const at = new Map(layout.rows.map((placed) => [placed.id, placed]))
    const branches = layout.rows.map((placed): BranchEdge => ({
      id: `branch-${placed.parent}>${placed.id}`, type: 'branch', source: placed.parent, target: placed.id,
      sourceHandle: 'down', targetHandle: 'up', selectable: false, focusable: false, data: {},
    }))
    const links = layout.crossLinks.flatMap((link, index): LinkEdge[] => {
      const from = at.get(link.from)
      const to = at.get(link.to)
      if (!from || !to) return []
      // A point set directly over (or under) the other is joined by a bracket on its right; otherwise the line leaves the side
      // that faces the other point.
      const bracket = Math.abs(from.x - to.x) < BOX_WIDTH / 2
      const toTheRight = to.x >= from.x
      const state: LinkState = active === null ? 'quiet' : link.from === active || link.to === active ? 'active' : 'dim'
      return [{
        id: `link-${link.key}`, type: 'link', source: link.from, target: link.to, selectable: false, focusable: false,
        sourceHandle: bracket || toTheRight ? 'out-right' : 'out-left', targetHandle: bracket ? 'in-right' : toTheRight ? 'in-left' : 'in-right',
        zIndex: state === 'active' ? 10 : 0, data: { tone: index % LINK_TONES, state, markerId },
      }]
    })
    return [...branches, ...links]
  }, [layout, active, markerId])

  const scope = useMemo<OrgChartContext>(() => ({ root, renderBox, hover: setHovered }), [root, renderBox])
  const places = useMemo(() => new Map(layout.rows.map((placed) => [placed.id, { x: placed.x, y: placed.y }])), [layout])
  // React Flow gives a box the pointer only once something listens for it; the boxes light their own links through their props.
  const ignore = useCallback<NodeMouseHandler<OrgNode>>(() => undefined, [])

  return <div aria-label={label} className="adm-kp-chart" role="group">
    {/* The arrowheads the lines point with: defined here once, outside React Flow's own layers, so they never pan or zoom. */}
    <svg aria-hidden="true" className="adm-kp-chart__defs" focusable="false">
      <defs>{Array.from({ length: LINK_TONES }, (_, tone) => <marker id={`${markerId}-${tone}`} key={tone} markerHeight="9" markerWidth="9" orient="auto" refX="8" refY="4.5">
        <path className={`adm-kp-chart__arrow adm-kp-chart__arrow--${tone}`} d="M 0 0 L 9 4.5 L 0 9 Z" />
      </marker>)}</defs>
    </svg>
    <OrgChartScope.Provider value={scope}>
      <ReactFlow<OrgNode, BranchEdge | LinkEdge>
        ariaLabelConfig={ARIA_LABELS}
        deleteKeyCode={null}
        disableKeyboardA11y
        edges={edges}
        edgesFocusable={false}
        edgeTypes={edgeTypes}
        elementsSelectable={false}
        fitView
        fitViewOptions={FIT}
        maxZoom={2}
        minZoom={0.2}
        multiSelectionKeyCode={null}
        nodes={nodes}
        nodesConnectable={false}
        nodesDraggable={false}
        nodesFocusable={false}
        nodeTypes={nodeTypes}
        onNodeClick={ignore}
        onNodeMouseEnter={ignore}
        onNodeMouseLeave={ignore}
        preventScrolling={false}
        selectionKeyCode={null}
        translateExtent={[[-40, -40], [layout.width + 40, layout.height + 40]]}
        zoomOnDoubleClick={false}
        zoomOnScroll={false}
      >
        <Controls orientation="horizontal" position="top-right" showInteractive={false} />
        <FitToFrame again={fitAgain} />
        <Reveal id={highlightId} places={places} />
      </ReactFlow>
    </OrgChartScope.Provider>
  </div>
}
