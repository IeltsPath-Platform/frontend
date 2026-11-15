import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react'
import { Controls, Position, ReactFlow, useReactFlow, useStore, type FitViewOptions, type NodeMouseHandler } from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import { Network } from 'lucide-react'
import type { TreePoint } from '~types/learningPath'
import { kindOf, reviewNodeId, type BlockingReviewInfo } from '../lib/blockingReviews'
import { BOX_HEIGHT, BOX_WIDTH, CHART_PADDING, layoutTree } from '../lib/treeLayout'
import {
  TreeFocusContext,
  type LinkFlowEdge,
  type PointFlowNode,
  type TreeFlowNode,
  type TreeFocus,
} from '../lib/treeFlow'
import { ContextNode, HeadingNode, LinkEdge, PointNode, ReviewNode } from './KnowledgeTreeNodes'
import styles from './KnowledgeTreeChart.module.css'

/** The chart shrinks to fit its frame but never below this, so a box stays readable; past it the frame pans. */
const SMALLEST_SCALE = 0.5
/** Room kept clear above the tree for the zoom buttons, so they never sit over a column's name or a box. */
const CONTROLS_STRIP = 52
const FIT: FitViewOptions = {
  padding: { top: `${CONTROLS_STRIP}px`, right: '2%', bottom: '2%', left: '2%' },
  minZoom: SMALLEST_SCALE,
  maxZoom: 1,
  duration: 0,
}
const MIN_HEIGHT = 240
const MAX_HEIGHT = 600
/** Height of the name of a step above its column. */
const HEADING_ROW = 24
/** How far past the tree the view may be panned, so the tree is never lost off screen. */
const PAN_MARGIN = 24

/** Defined once: React Flow redraws every box when these change identity. */
const nodeTypes = { point: PointNode, context: ContextNode, heading: HeadingNode, review: ReviewNode }
const edgeTypes = { link: LinkEdge }
/** Nothing here is selected, dragged, connected or deleted by React Flow: the tree only reads. */
const READ_ONLY = { draggable: false, selectable: false, focusable: false, connectable: false, deletable: false } as const
/**
 * Boxes sit above every line, the lit ones included (those are at 10): a line that has to cross a box goes behind it instead of
 * running over its text. React Flow puts a line above the boxes whenever its layer is the higher.
 */
const BOX_LAYER = 20

/**
 * Where a line meets a box: the middle of its left edge, where the line that comes in ends, and of its right edge, where the
 * lines that go out start. Given to React Flow up front because a box that already has its size is not measured, and without
 * the spot there is nothing to draw a line to.
 */
const ENDS = [
  { type: 'target', position: Position.Left, x: 0, y: BOX_HEIGHT / 2 - 0.5, width: 1, height: 1 },
  { type: 'source', position: Position.Right, x: BOX_WIDTH - 1, y: BOX_HEIGHT / 2 - 0.5, width: 1, height: 1 },
] as const satisfies PointFlowNode['handles']

/** React Flow's own labels are English; these are what the controls say. */
const ARIA_LABELS = {
  'controls.ariaLabel': 'Điều khiển sơ đồ',
  'controls.zoomIn.ariaLabel': 'Phóng to',
  'controls.zoomOut.ariaLabel': 'Thu nhỏ',
  'controls.fitView.ariaLabel': 'Xem toàn bộ sơ đồ',
} as const

/** Fits the whole tree into the frame again whenever the frame changes size or the tree changes shape. */
function FitToFrame({ shape }: { shape: string }) {
  const { fitView } = useReactFlow()
  const size = useStore((state) => `${state.width}x${state.height}`)
  useEffect(() => {
    void fitView(FIT)
  }, [fitView, size, shape])
  return null
}

/**
 * The points of one skill drawn as a tree that grows left to right in the order they are learnt: a column for each step,
 * and a line from every point to the points that build on it. The first column is where to start, so reading across is
 * reading the order of learning. A box is a button that selects the point; the chart is for finding your way and the
 * panel under it is for acting. The point under the pointer, or else the selected one, lights its own lines and fades
 * the rest.
 *
 * {@link layoutTree} decides where every box goes; React Flow draws the boxes and lines and gives the frame its panning
 * and zooming. The page keeps scrolling with the wheel: zooming needs the buttons, a pinch, or the wheel with Ctrl held.
 */
export function KnowledgeTreeChart({ points, context = [], reviews = [], note, selectedId, onSelect }: {
  points: readonly TreePoint[]
  /**
   * Points of other skills, or of lower courses, that these points build on, drawn faded in columns before the first step
   * so the line from what is needed first is not lost. They cannot be selected: they belong to another chart.
   */
  context?: readonly TreePoint[]
  /**
   * The blocking reviews of the points above (or of the context), pending or finished: each is a node of its own, drawn between its
   * point and what builds on it, and stays on the map once it is done. A review is selected like a point.
   */
  reviews?: readonly BlockingReviewInfo[]
  /** The skill the chart shows, named above it. */
  note: string
  selectedId: string | null
  onSelect: (id: string) => void
}) {
  const layout = useMemo(
    () => layoutTree(points, context, reviews.map((review) => ({ id: reviewNodeId(review), after: review.knowledgePointId, gate: review.blocking }))),
    [points, context, reviews],
  )
  const [hovered, setHovered] = useState<string | null>(null)
  const active = hovered ?? selectedId
  const markerId = useId()

  const nodes = useMemo<TreeFlowNode[]>(() => {
    const byId = new Map([...context, ...points].map((point) => [point.knowledgePointId, point]))
    const reviewByNode = new Map(reviews.map((review) => [reviewNodeId(review), review]))
    const headings: TreeFlowNode[] = layout.columns.map((column) => ({
      // A step is told by its place, since several columns of reviews have the same number (none).
      id: `heading-${column.review ? 'review' : column.context ? 'context' : 'step'}-${column.x}`,
      type: 'heading',
      position: { x: column.x, y: CHART_PADDING },
      width: BOX_WIDTH,
      height: HEADING_ROW,
      data: { number: column.number, context: column.context === true, review: column.review === true },
      ...READ_ONLY,
    }))
    const boxes = layout.boxes.flatMap((placed): TreeFlowNode[] => {
      const frame = { id: placed.id, position: { x: placed.x, y: placed.y }, width: BOX_WIDTH, height: BOX_HEIGHT, zIndex: BOX_LAYER, handles: [...ENDS], ...READ_ONLY }
      if (placed.review) {
        const review = reviewByNode.get(placed.id)
        const point = review ? byId.get(review.knowledgePointId) : undefined
        return review && point ? [{ ...frame, type: 'review', data: { review, point } }] : []
      }
      const point = byId.get(placed.id)
      if (!point) return []
      const data = { point, column: placed.column }
      return [placed.context ? { ...frame, type: 'context', data } : { ...frame, type: 'point', data }]
    })
    return [...headings, ...boxes]
  }, [layout, points, context, reviews])

  const edges = useMemo<LinkFlowEdge[]>(() => {
    // The whole way through a review lights with its point: the line into the review and the lines out of it are one path.
    const byNode = new Map(reviews.map((review) => [reviewNodeId(review), review]))
    return layout.links.map((link) => {
      // A line through a review has the review at one end: the review the line runs into, or out of.
      const through = link.review === true ? byNode.get(link.to) ?? byNode.get(link.from) : undefined
      const lit = active !== null && (
        link.from === active || link.to === active || (through !== undefined && through.knowledgePointId === active)
      )
      return {
        id: link.key,
        type: 'link',
        source: link.from,
        target: link.to,
        selectable: false,
        focusable: false,
        zIndex: lit ? 10 : 0,
        data: { state: lit ? 'lit' : active ? 'faded' : 'quiet', markerId, review: through ? kindOf(through) : null },
      }
    })
  }, [layout, active, markerId, reviews])

  const focus = useMemo<TreeFocus>(() => {
    const related = new Set<string>()
    if (active) {
      for (const link of layout.links) {
        if (link.from === active) related.add(link.to)
        if (link.to === active) related.add(link.from)
      }
    }
    return { selectedId, related, focus: setHovered }
  }, [active, layout, selectedId])

  // React Flow reports the pointer, and a box only receives it once something listens for it. Only a point of the skill and a
  // review react: the quiet points of other charts are for reading.
  const pick = useCallback<NodeMouseHandler<TreeFlowNode>>((_event, node) => {
    if (node.type === 'point' || node.type === 'review') onSelect(node.id)
  }, [onSelect])
  const enter = useCallback<NodeMouseHandler<TreeFlowNode>>((_event, node) => {
    if (node.type === 'point' || node.type === 'review') setHovered(node.id)
  }, [])
  const leave = useCallback<NodeMouseHandler<TreeFlowNode>>(() => setHovered(null), [])

  // The frame's width decides how tall it needs to be for the tree to fit it. Where the browser cannot tell (a test), the
  // tree is taken at full size.
  const frame = useRef<HTMLDivElement>(null)
  const [frameWidth, setFrameWidth] = useState(0)
  useEffect(() => {
    const element = frame.current
    if (!element || typeof ResizeObserver === 'undefined') return
    const watch = new ResizeObserver(() => setFrameWidth(element.clientWidth))
    watch.observe(element)
    return () => watch.disconnect()
  }, [])
  const scale = frameWidth > 0 ? Math.min(1, Math.max(SMALLEST_SCALE, frameWidth / layout.width)) : 1
  const height = Math.round(Math.min(MAX_HEIGHT, Math.max(MIN_HEIGHT, (layout.height + CHART_PADDING * 2) * scale + CONTROLS_STRIP)))

  return (
    <div className={styles.chart}>
      <p className={styles.root}>
        <Network aria-hidden="true" size={16} />
        <strong>{note}</strong>
      </p>

      <div aria-label={`Sơ đồ cây kiến thức ${note}`} className={styles.stage} ref={frame} role="region" style={{ blockSize: height }}>
        {/* The arrowheads the lines point with: drawn once here, outside React Flow's own layers, so they never pan or zoom. */}
        <svg aria-hidden="true" className={styles.defs} focusable="false">
          <defs>
            <marker id={`${markerId}-quiet`} markerHeight="7" markerWidth="7" orient="auto" refX="6" refY="3.5"><path className={styles.arrowQuiet} d="M 0 0 L 7 3.5 L 0 7 Z" /></marker>
            <marker id={`${markerId}-lit`} markerHeight="7" markerWidth="7" orient="auto" refX="6" refY="3.5"><path className={styles.arrowLit} d="M 0 0 L 7 3.5 L 0 7 Z" /></marker>
            <marker id={`${markerId}-review`} markerHeight="7" markerWidth="7" orient="auto" refX="6" refY="3.5"><path className={styles.arrowReview} d="M 0 0 L 7 3.5 L 0 7 Z" /></marker>
            <marker id={`${markerId}-done`} markerHeight="7" markerWidth="7" orient="auto" refX="6" refY="3.5"><path className={styles.arrowDone} d="M 0 0 L 7 3.5 L 0 7 Z" /></marker>
            <marker id={`${markerId}-suggested`} markerHeight="7" markerWidth="7" orient="auto" refX="6" refY="3.5"><path className={styles.arrowSuggested} d="M 0 0 L 7 3.5 L 0 7 Z" /></marker>
          </defs>
        </svg>
        <TreeFocusContext.Provider value={focus}>
          <ReactFlow<TreeFlowNode, LinkFlowEdge>
            ariaLabelConfig={ARIA_LABELS}
            deleteKeyCode={null}
            disableKeyboardA11y
            edges={edges}
            edgesFocusable={false}
            edgeTypes={edgeTypes}
            elementsSelectable={false}
            fitView
            fitViewOptions={FIT}
            maxZoom={1.6}
            minZoom={SMALLEST_SCALE}
            multiSelectionKeyCode={null}
            nodes={nodes}
            onNodeClick={pick}
            onNodeMouseEnter={enter}
            onNodeMouseLeave={leave}
            nodesConnectable={false}
            nodesDraggable={false}
            nodesFocusable={false}
            nodeTypes={nodeTypes}
            preventScrolling={false}
            selectionKeyCode={null}
            translateExtent={[[-PAN_MARGIN, -PAN_MARGIN], [layout.width + PAN_MARGIN, layout.height + PAN_MARGIN]]}
            zoomOnDoubleClick={false}
            zoomOnScroll={false}
          >
            <Controls orientation="horizontal" position="top-right" showInteractive={false} />
            <FitToFrame shape={`${layout.width}x${layout.height}`} />
          </ReactFlow>
        </TreeFocusContext.Provider>
      </div>
    </div>
  )
}
