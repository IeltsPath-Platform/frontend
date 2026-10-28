import { describe, it, expect } from 'vitest'
import { layoutMindmap } from './layoutMindmap'
import type { MindmapNode, MindmapEdge } from '../api/notebookApi'

describe('layoutMindmap', () => {
  it('returns empty array when nodes are empty', () => {
    const res = layoutMindmap([], [])
    expect(res.nodes).toEqual([])
    expect(res.edges).toEqual([])
  })

  it('preserves existing positions when all nodes have valid coordinates', () => {
    const nodes: MindmapNode[] = [
      { id: '1', label: 'Root', position: { x: 10, y: 20 } },
      { id: '2', label: 'Child', position: { x: 50, y: 60 } },
    ]
    const edges: MindmapEdge[] = [{ id: 'e1', source: '1', target: '2' }]

    const res = layoutMindmap(nodes, edges)
    expect(res.nodes[0].position).toEqual({ x: 10, y: 20 })
    expect(res.nodes[1].position).toEqual({ x: 50, y: 60 })
  })

  it('computes deterministic positions when nodes lack coordinates', () => {
    const nodes: MindmapNode[] = [
      { id: 'root', label: 'Environment' },
      { id: 'w1', label: 'Pollution' },
      { id: 'w2', label: 'Conservation' },
      { id: 'c1', label: 'Air pollution' },
    ]
    const edges: MindmapEdge[] = [
      { id: 'e1', source: 'root', target: 'w1' },
      { id: 'e2', source: 'root', target: 'w2' },
      { id: 'e3', source: 'w1', target: 'c1' },
    ]

    const res = layoutMindmap(nodes, edges)
    expect(res.nodes.length).toBe(4)

    const rootNode = res.nodes.find((n) => n.id === 'root')
    expect(rootNode?.position).toEqual({ x: 500, y: 350 })

    const w1Node = res.nodes.find((n) => n.id === 'w1')
    expect(w1Node?.position).toBeDefined()
    expect(typeof w1Node?.position.x).toBe('number')
    expect(typeof w1Node?.position.y).toBe('number')

    const c1Node = res.nodes.find((n) => n.id === 'c1')
    expect(c1Node?.position).toBeDefined()
  })
})

