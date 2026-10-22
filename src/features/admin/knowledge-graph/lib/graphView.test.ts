import { describe, expect, it, vi } from 'vitest'
import type { KnowledgeTree, KnowledgeTreeHealth, TreeNode } from '../types'
import { buildFlow, flagsOf, matchesQuery, type KpFlowNode } from './graphView'

function node(id: string, overrides: Partial<TreeNode> = {}): TreeNode {
  return {
    id, code: `R55_${id.toUpperCase()}`, name: `Point ${id}`, skill: 'READING', kind: 'STRATEGY', status: 'ACTIVE',
    cefrLevel: 'B1', canDo: `Can do ${id}.`, ...overrides,
  }
}

const tree: KnowledgeTree = {
  nodes: [node('a'), node('b', { cefrLevel: 'C1' }), node('c', { status: 'INACTIVE', skill: 'ALL' })],
  edges: [{ from: 'a', to: 'b' }, { from: 'b', to: 'c' }],
}
const noHealth: KnowledgeTreeHealth | null = null
const base = { tree, health: noHealth, selectedId: null, query: '', onlyFlagged: false, onSelect: vi.fn() }

function kp(result: ReturnType<typeof buildFlow>, id: string): KpFlowNode {
  const found = result.nodes.find((item) => item.id === id)
  if (!found || found.type !== 'kp') throw new Error(`no point ${id}`)
  return found
}

describe('buildFlow', () => {
  it('builds one node per point plus the lane and column frames', () => {
    const { nodes, edges } = buildFlow(base)

    expect(nodes.filter((item) => item.type === 'kp')).toHaveLength(3)
    expect(nodes.filter((item) => item.type === 'column')).toHaveLength(6)
    expect(nodes.filter((item) => item.type === 'lane').map((item) => item.id)).toEqual(['lane-READING', 'lane-ALL'])
    expect(edges.map((edge) => edge.id)).toEqual(['a->b', 'b->c'])
    expect(edges[0]).toMatchObject({ source: 'a', target: 'b' })
  })

  it('marks isolated and metadata-poor points from the health report', () => {
    const health: KnowledgeTreeHealth = { isolatedIds: ['a'], missingMetadataIds: ['b'], levelViolations: [] }
    const result = buildFlow({ ...base, health })

    expect(kp(result, 'a').data).toMatchObject({ isolated: true, missingMetadata: false })
    expect(kp(result, 'b').data).toMatchObject({ isolated: false, missingMetadata: true })
    expect(kp(result, 'c').data).toMatchObject({ isolated: false, missingMetadata: false })
  })

  it('dims the points that do not match the search text', () => {
    const result = buildFlow({ ...base, query: 'point b' })

    expect(kp(result, 'a').data.dimmed).toBe(true)
    expect(kp(result, 'b').data.dimmed).toBe(false)
  })

  it('with onlyFlagged dims every point that has no warning', () => {
    const health: KnowledgeTreeHealth = { isolatedIds: ['a'], missingMetadataIds: [], levelViolations: [] }
    const result = buildFlow({ ...base, health, onlyFlagged: true })

    expect(kp(result, 'a').data.dimmed).toBe(false)
    expect(kp(result, 'b').data.dimmed).toBe(true)
  })

  it('highlights the edges of the selected point, dims the others and flags inverted edges', () => {
    const health: KnowledgeTreeHealth = { isolatedIds: [], missingMetadataIds: [], levelViolations: [{ from: 'b', to: 'c' }] }
    const result = buildFlow({ ...base, health, selectedId: 'a' })
    const [ab, bc] = result.edges

    expect(ab.className).toContain('kg-edge--active')
    expect(bc.className).toContain('kg-edge--violation')
    expect(bc.className).not.toContain('kg-edge--dim')

    const unrelated = buildFlow({ ...base, selectedId: 'c' }).edges[0]
    expect(unrelated.className).toContain('kg-edge--dim')
  })

  it('ignores edges whose end is not in the node list', () => {
    const result = buildFlow({ ...base, tree: { nodes: tree.nodes, edges: [{ from: 'a', to: 'ghost' }] } })
    expect(result.edges).toEqual([])
  })

  it('selects through the callback', () => {
    const onSelect = vi.fn()
    kp(buildFlow({ ...base, onSelect }), 'a').data.onSelect('a')
    expect(onSelect).toHaveBeenCalledWith('a')
  })
})

describe('matchesQuery', () => {
  it('searches code, name and can-do without case', () => {
    const item = node('x', { canDo: 'Scan for dates quickly.' })
    expect(matchesQuery(item, '')).toBe(true)
    expect(matchesQuery(item, 'r55_x')).toBe(true)
    expect(matchesQuery(item, 'point x')).toBe(true)
    expect(matchesQuery(item, 'scan for')).toBe(true)
    expect(matchesQuery(item, 'listening')).toBe(false)
  })
})

describe('flagsOf', () => {
  it('turns the health report into lookup sets', () => {
    const flags = flagsOf({ isolatedIds: ['a'], missingMetadataIds: ['b'], levelViolations: [{ from: 'x', to: 'y' }] })
    expect(flags.isolated.has('a')).toBe(true)
    expect(flags.missing.has('b')).toBe(true)
    expect(flags.violations.has('x->y')).toBe(true)
    expect(flagsOf(null).isolated.size).toBe(0)
  })
})
