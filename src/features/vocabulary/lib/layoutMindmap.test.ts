import { describe, it, expect } from 'vitest'
import { layoutMindmap } from './layoutMindmap'
import type { MindmapNode, MindmapEdge } from '../api/notebookApi'

const node = (id: string, type: MindmapNode['type'], label = id, itemId: string | null = null): MindmapNode => ({ id, type, label, itemId })
const distance = (a: { x: number; y: number }, b: { x: number; y: number }) => Math.hypot(a.x - b.x, a.y - b.y)

describe('layoutMindmap', () => {
  it('returns an empty layout for an empty graph', () => {
    expect(layoutMindmap([], [])).toEqual({ nodes: [], edges: [], rootId: null })
  })

  it('reads the API edge shape (from/to) so links are kept and the topic is the root', () => {
    const nodes = [node('t', 'TOPIC', 'Environment'), node('w1', 'WORD', 'pollution', 'i1'), node('w2', 'WORD', 'habitat', 'i2')]
    const edges: MindmapEdge[] = [
      { from: 't', to: 'w1', kind: 'TOPIC_WORD' },
      { from: 't', to: 'w2', kind: 'TOPIC_WORD' },
    ]

    const layout = layoutMindmap(nodes, edges)

    expect(layout.rootId).toBe('t')
    expect(layout.edges).toHaveLength(2)
    const root = layout.nodes.find((n) => n.id === 't')!
    expect(root.position).toEqual({ x: 0, y: 0 })
    const [w1, w2] = ['w1', 'w2'].map((id) => layout.nodes.find((n) => n.id === id)!)
    // Words on the same ring are equally far from the topic.
    expect(distance(w1.position, root.position)).toBeCloseTo(distance(w2.position, root.position))
  })

  it('fans collocations and synonyms outward from their word and counts them on the word', () => {
    const nodes = [node('t', 'TOPIC'), node('w', 'WORD'), node('c', 'COLLOCATION'), node('s', 'SYNONYM')]
    const edges: MindmapEdge[] = [
      { from: 't', to: 'w', kind: 'TOPIC_WORD' },
      { from: 'w', to: 'c', kind: 'COLLOCATION' },
      { from: 'w', to: 's', kind: 'SYNONYM' },
    ]

    const layout = layoutMindmap(nodes, edges)
    const byId = new Map(layout.nodes.map((n) => [n.id, n]))

    expect(byId.get('w')!.childCount).toBe(2)
    for (const id of ['c', 's']) {
      expect(byId.get(id)!.parentId).toBe('w')
      expect(distance(byId.get(id)!.position, { x: 0, y: 0 })).toBeGreaterThan(distance(byId.get('w')!.position, { x: 0, y: 0 }))
    }
  })

  it('spreads many words over several rings without stacking two on one spot', () => {
    const words = Array.from({ length: 40 }, (_, i) => node(`w${i}`, 'WORD'))
    const edges: MindmapEdge[] = words.map((w) => ({ from: 't', to: w.id, kind: 'TOPIC_WORD' }))

    const layout = layoutMindmap([node('t', 'TOPIC'), ...words], edges)
    const placed = layout.nodes.filter((n) => n.type === 'WORD')

    expect(new Set(placed.map((n) => n.ring)).size).toBeGreaterThan(1)
    for (let i = 0; i < placed.length; i++) {
      for (let j = i + 1; j < placed.length; j++) {
        expect(distance(placed[i].position, placed[j].position)).toBeGreaterThan(60)
      }
    }
  })

  it('drops edges to unknown nodes and still positions every node', () => {
    const nodes = [node('t', 'TOPIC'), node('w', 'WORD'), node('lost', 'SYNONYM')]
    const edges: MindmapEdge[] = [
      { from: 't', to: 'w', kind: 'TOPIC_WORD' },
      { from: 'w', to: 'missing', kind: 'SYNONYM' },
    ]

    const layout = layoutMindmap(nodes, edges)

    expect(layout.edges).toHaveLength(1)
    expect(layout.nodes.every((n) => Number.isFinite(n.position.x) && Number.isFinite(n.position.y))).toBe(true)
  })
})
