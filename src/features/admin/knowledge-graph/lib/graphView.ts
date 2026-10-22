import { MarkerType, type Edge, type Node } from '@xyflow/react'
import type { KnowledgeTree, KnowledgeTreeHealth, TreeNode } from '../types'
import { NODE_HEIGHT, NODE_WIDTH, layoutGraph } from './layout'

export interface KpNodeData extends Record<string, unknown> {
  node: TreeNode
  selected: boolean
  dimmed: boolean
  isolated: boolean
  missingMetadata: boolean
  onSelect: (id: string) => void
}
export interface LaneData extends Record<string, unknown> { label: string; width: number; height: number }
export interface ColumnData extends Record<string, unknown> { label: string; width: number }

export type KpFlowNode = Node<KpNodeData, 'kp'>
export type LaneFlowNode = Node<LaneData, 'lane'>
export type ColumnFlowNode = Node<ColumnData, 'column'>
export type GraphFlowNode = KpFlowNode | LaneFlowNode | ColumnFlowNode

/** Marker colours mirror the `--adm-*` tokens; an SVG marker cannot read a CSS variable. */
const EDGE_COLOR = '#7f93b0'
const EDGE_ACTIVE_COLOR = '#8e9bff'
const EDGE_VIOLATION_COLOR = '#ff7a7a'

export interface FlowInput {
  tree: KnowledgeTree
  health: KnowledgeTreeHealth | null
  selectedId: string | null
  /** Lower-cased text; points that do not contain it are dimmed. */
  query: string
  onlyFlagged: boolean
  onSelect: (id: string) => void
}

export function matchesQuery(node: TreeNode, query: string): boolean {
  if (!query) return true
  return [node.code, node.name, node.canDo].some((text) => text?.toLowerCase().includes(query))
}

export function flagsOf(health: KnowledgeTreeHealth | null) {
  return {
    isolated: new Set(health?.isolatedIds ?? []),
    missing: new Set(health?.missingMetadataIds ?? []),
    violations: new Set((health?.levelViolations ?? []).map((edge) => `${edge.from}->${edge.to}`)),
  }
}

export function buildFlow(input: FlowInput): { nodes: GraphFlowNode[]; edges: Edge[] } {
  const { tree, health, selectedId, query, onlyFlagged, onSelect } = input
  const layout = layoutGraph(tree.nodes)
  const flags = flagsOf(health)

  const kpNodes: KpFlowNode[] = tree.nodes.map((node) => {
    const isolated = flags.isolated.has(node.id)
    const missingMetadata = flags.missing.has(node.id)
    const flagged = isolated || missingMetadata
    return {
      id: node.id,
      type: 'kp',
      position: layout.positions[node.id],
      draggable: false,
      selectable: false,
      zIndex: 1,
      width: NODE_WIDTH,
      height: NODE_HEIGHT,
      data: {
        node,
        selected: node.id === selectedId,
        dimmed: !matchesQuery(node, query) || (onlyFlagged && !flagged),
        isolated,
        missingMetadata,
        onSelect,
      },
    }
  })

  const laneNodes: LaneFlowNode[] = layout.lanes.map((lane) => ({
    id: `lane-${lane.key}`,
    type: 'lane',
    position: { x: 0, y: lane.y },
    draggable: false,
    selectable: false,
    focusable: false,
    zIndex: -1,
    data: { label: lane.label, width: layout.width, height: lane.height },
  }))

  const columnNodes: ColumnFlowNode[] = layout.columns.map((column) => ({
    id: `column-${column.key}`,
    type: 'column',
    position: { x: column.x, y: 0 },
    draggable: false,
    selectable: false,
    focusable: false,
    zIndex: -1,
    data: { label: column.label, width: column.width },
  }))

  const known = new Set(tree.nodes.map((node) => node.id))
  const edges: Edge[] = tree.edges
    .filter((edge) => known.has(edge.from) && known.has(edge.to))
    .map((edge) => {
      const violation = flags.violations.has(`${edge.from}->${edge.to}`)
      const incident = selectedId !== null && (edge.from === selectedId || edge.to === selectedId)
      const dim = selectedId !== null && !incident && !violation
      const color = violation ? EDGE_VIOLATION_COLOR : incident ? EDGE_ACTIVE_COLOR : EDGE_COLOR
      return {
        id: `${edge.from}->${edge.to}`,
        source: edge.from,
        target: edge.to,
        type: 'smoothstep',
        focusable: false,
        className: `kg-edge${violation ? ' kg-edge--violation' : ''}${incident ? ' kg-edge--active' : ''}${dim ? ' kg-edge--dim' : ''}`,
        markerEnd: { type: MarkerType.ArrowClosed, color, width: 16, height: 16 },
      }
    })

  return { nodes: [...columnNodes, ...laneNodes, ...kpNodes], edges }
}
