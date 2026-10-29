import type { MindmapEdge, MindmapNode } from '../api/notebookApi'

export interface PositionedNode extends MindmapNode {
  position: { x: number; y: number }
  /** The word a collocation/synonym hangs from; null for the topic and the words. */
  parentId: string | null
  /** Collocations and synonyms attached to a word; 0 for every other node. */
  childCount: number
  /** Ring index of a word (0 is the closest to the topic); used to stagger the entry animation. */
  ring: number
}

export interface MindmapLayout {
  nodes: PositionedNode[]
  edges: MindmapEdge[]
  rootId: string | null
}

/** Radius of the first ring of words around the topic. */
const FIRST_RING = 250
/** Distance between two rings of words. */
const RING_GAP = 170
/** Arc length kept free for one word chip so neighbours do not overlap. */
const WORD_ARC = 150
/** Distance from a word to its collocations and synonyms. */
const CHILD_DISTANCE = 165
/** Widest fan (radians) the children of one word may use. */
const MAX_FAN = 1.6

/** How many words fit on ring `index` without overlapping. */
const ringCapacity = (index: number) => Math.max(6, Math.floor((2 * Math.PI * (FIRST_RING + index * RING_GAP)) / WORD_ARC))

/**
 * Lays the API graph out as a real mind map: the topic sits in the centre, its words on concentric rings, and each
 * word's collocations and synonyms fan outwards from that word, away from the centre, so every link points outward
 * and branches of different words do not cross. Edges naming unknown nodes are dropped. Deterministic: the same
 * graph always gets the same positions.
 */
export function layoutMindmap(nodes: readonly MindmapNode[], edges: readonly MindmapEdge[]): MindmapLayout {
  if (nodes.length === 0) return { nodes: [], edges: [], rootId: null }

  const byId = new Map(nodes.map((node) => [node.id, node]))
  const validEdges = edges.filter((edge) => byId.has(edge.from) && byId.has(edge.to) && edge.from !== edge.to)
  const children = new Map<string, string[]>()
  for (const edge of validEdges) {
    const list = children.get(edge.from) ?? []
    list.push(edge.to)
    children.set(edge.from, list)
  }

  const root = nodes.find((node) => node.type === 'TOPIC') ?? null
  // A topic map lists its words as the topic's children; a word map has no topic, so its words are the roots.
  const wordIds = root
    ? (children.get(root.id) ?? []).filter((id) => byId.get(id)?.type === 'WORD')
    : nodes.filter((node) => node.type === 'WORD').map((node) => node.id)

  const placed = new Map<string, Omit<PositionedNode, keyof MindmapNode>>()
  if (root) placed.set(root.id, { position: { x: 0, y: 0 }, parentId: null, childCount: 0, ring: 0 })

  let ring = 0
  let start = 0
  while (start < wordIds.length) {
    const onRing = wordIds.slice(start, start + ringCapacity(ring))
    const radius = FIRST_RING + ring * RING_GAP
    // Odd rings are rotated half a step so their words sit in the gaps of the ring inside them.
    const offset = ring % 2 === 1 ? Math.PI / onRing.length : 0
    onRing.forEach((wordId, index) => {
      const angle = -Math.PI / 2 + offset + (index / onRing.length) * 2 * Math.PI
      const x = radius * Math.cos(angle)
      const y = radius * Math.sin(angle)
      const branch = (children.get(wordId) ?? []).filter((id) => !placed.has(id) && id !== root?.id)
      placed.set(wordId, { position: { x, y }, parentId: null, childCount: branch.length, ring })

      const fan = Math.min(MAX_FAN, Math.max(0, branch.length - 1) * 0.38)
      branch.forEach((childId, childIndex) => {
        const childAngle = branch.length > 1 ? angle - fan / 2 + (childIndex / (branch.length - 1)) * fan : angle
        placed.set(childId, {
          position: { x: x + CHILD_DISTANCE * Math.cos(childAngle), y: y + CHILD_DISTANCE * Math.sin(childAngle) },
          parentId: wordId,
          childCount: 0,
          ring,
        })
      })
    })
    start += onRing.length
    ring += 1
  }

  // Anything the edges did not reach (bad data) still shows up, on one more ring outside the rest.
  const orphans = nodes.filter((node) => !placed.has(node.id))
  const outer = FIRST_RING + ring * RING_GAP + CHILD_DISTANCE
  orphans.forEach((node, index) => {
    const angle = -Math.PI / 2 + (index / orphans.length) * 2 * Math.PI
    placed.set(node.id, { position: { x: outer * Math.cos(angle), y: outer * Math.sin(angle) }, parentId: null, childCount: 0, ring })
  })

  return {
    nodes: nodes.map((node) => ({ ...node, ...placed.get(node.id)! })),
    edges: validEdges,
    rootId: root?.id ?? null,
  }
}
