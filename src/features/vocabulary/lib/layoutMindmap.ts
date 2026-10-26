import type { MindmapNode, MindmapEdge } from '../api/notebookApi'

export interface PositionedNode extends MindmapNode {
  position: { x: number; y: number }
}

/**
 * Deterministically computes (x, y) coordinates for mindmap nodes
 * if positions are not already assigned by the API.
 * Layout organizes the tree radially / hierarchically outward from the root.
 */
export function layoutMindmap(
  nodes: MindmapNode[],
  edges: MindmapEdge[]
): { nodes: PositionedNode[]; edges: MindmapEdge[] } {
  if (nodes.length === 0) {
    return { nodes: [], edges }
  }

  // If all nodes already have positions, keep them
  const allHavePosition = nodes.every(
    (n) => n.position && typeof n.position.x === 'number' && typeof n.position.y === 'number'
  )
  if (allHavePosition) {
    return { nodes: nodes as PositionedNode[], edges }
  }

  // Find root node (node that is not the target of any edge, or first node)
  const targetIds = new Set(edges.map((e) => e.target))
  const sourceIds = new Set(edges.map((e) => e.source))
  let root = nodes.find((n) => !targetIds.has(n.id) && sourceIds.has(n.id))
  if (!root) {
    root = nodes[0]
  }

  // Build adjacency list
  const childrenMap = new Map<string, string[]>()
  for (const edge of edges) {
    const list = childrenMap.get(edge.source) || []
    list.push(edge.target)
    childrenMap.set(edge.source, list)
  }

  const positions = new Map<string, { x: number; y: number }>()
  const centerX = 500
  const centerY = 350
  positions.set(root.id, { x: centerX, y: centerY })

  const level1 = childrenMap.get(root.id) || []
  const l1Count = level1.length

  level1.forEach((childId, idx) => {
    // Arrange level 1 nodes in an ellipse around the center
    const angle = (idx / Math.max(1, l1Count)) * 2 * Math.PI - Math.PI / 2
    const radiusX = 280
    const radiusY = 200
    const x = centerX + radiusX * Math.cos(angle)
    const y = centerY + radiusY * Math.sin(angle)
    positions.set(childId, { x, y })

    // Level 2 nodes (grandchildren)
    const level2 = childrenMap.get(childId) || []
    const l2Count = level2.length
    level2.forEach((gcId, gcIdx) => {
      // Fan out in the same general direction as the parent
      const spreadAngle = l2Count > 1 ? (gcIdx - (l2Count - 1) / 2) * 0.45 : 0
      const subAngle = angle + spreadAngle
      const subRadius = 180
      const subX = x + subRadius * Math.cos(subAngle)
      const subY = y + subRadius * Math.sin(subAngle)
      positions.set(gcId, { x: subX, y: subY })
    })
  })

  // Assign any remaining unplaced nodes a default grid position
  let unplacedIndex = 0
  const positionedNodes: PositionedNode[] = nodes.map((node) => {
    if (node.position && typeof node.position.x === 'number' && typeof node.position.y === 'number') {
      return { ...node, position: node.position }
    }
    const computed = positions.get(node.id)
    if (computed) {
      return { ...node, position: computed }
    }
    const fallbackX = 100 + (unplacedIndex % 4) * 220
    const fallbackY = 700 + Math.floor(unplacedIndex / 4) * 120
    unplacedIndex++
    return { ...node, position: { x: fallbackX, y: fallbackY } }
  })

  return { nodes: positionedNodes, edges }
}

