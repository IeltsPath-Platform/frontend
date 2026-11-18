import { describe, expect, it } from 'vitest'
import type { KnowledgeTreeRow } from '../course-drafts/lib/courseKnowledgeTree'
import type { TreeNode } from '../knowledge-graph/types'
import { BOX_HEIGHT, BOX_WIDTH, ORG_ROOT_ID, ROOT_WIDTH, layoutOrgChart } from './orgChartLayout'

const node = (id: string): TreeNode => ({ id, code: id.toUpperCase(), name: id, skill: 'READING', kind: 'SKILL', status: 'ACTIVE', cefrLevel: 'B1' }) as TreeNode
const row = (id: string, children: KnowledgeTreeRow[] = [], alsoFor: TreeNode[] = []): KnowledgeTreeRow => ({ node: node(id), children, alsoFor })

describe('layoutOrgChart', () => {
  it('draws only the large box when there is nothing beneath it', () => {
    const layout = layoutOrgChart([])
    expect(layout.rows).toEqual([])
    expect(layout.crossLinks).toEqual([])
    expect(layout.width).toBeGreaterThanOrEqual(ROOT_WIDTH)
  })

  it('puts every level on the same height and hangs the goals from the large box', () => {
    const layout = layoutOrgChart([row('a', [row('a1'), row('a2', [row('a21')])]), row('b', [row('b1')])])
    const at = (id: string) => layout.rows.find((box) => box.id === id)!
    expect(at('a').y).toBe(at('b').y)
    expect(at('a1').y).toBe(at('b1').y)
    expect(at('a1').y).toBe(at('a2').y)
    expect(at('a21').y).toBeGreaterThan(at('a2').y)
    expect(at('a').parent).toBe(ORG_ROOT_ID)
    expect(at('a21').parent).toBe('a2')
  })

  it('centres a point between its first and last prerequisite and the large box between the first and last goal', () => {
    const layout = layoutOrgChart([row('a', [row('a1'), row('a2'), row('a3', [row('a31'), row('a32')])]), row('b')])
    const at = (id: string) => layout.rows.find((box) => box.id === id)!
    const middle = (id: string) => at(id).x + BOX_WIDTH / 2
    expect(middle('a')).toBeCloseTo((middle('a1') + middle('a3')) / 2)
    expect(middle('a3')).toBeCloseTo((middle('a31') + middle('a32')) / 2)
    expect(layout.root.x + ROOT_WIDTH / 2).toBeCloseTo((middle('a') + middle('b')) / 2)
  })

  it('keeps a lone goal straight under the large box', () => {
    const layout = layoutOrgChart([row('only')])
    expect(layout.rows[0]!.x + BOX_WIDTH / 2).toBeCloseTo(layout.root.x + ROOT_WIDTH / 2)
  })

  it('never lets two boxes of the same level overlap', () => {
    const layout = layoutOrgChart([row('a', [row('a1'), row('a2'), row('a3')]), row('b', [row('b1')]), row('c')])
    const depths = [...new Set(layout.rows.map((box) => box.y))]
    for (const y of depths) {
      const sorted = layout.rows.filter((box) => box.y === y).sort((left, right) => left.x - right.x)
      sorted.slice(1).forEach((box, index) => expect(box.x).toBeGreaterThanOrEqual(sorted[index]!.x + BOX_WIDTH))
    }
    expect(layout.rows.every((box) => box.x >= 0 && box.x + BOX_WIDTH <= layout.width && box.y + BOX_HEIGHT <= layout.height)).toBe(true)
  })

  it('lists the cross links of the whole tree, one for each point that also serves another', () => {
    const layout = layoutOrgChart([row('a', [row('shared', [], [node('b')])]), row('b')])
    expect(layout.crossLinks).toEqual([{ key: 'shared>b', from: 'shared', to: 'b' }])
  })
})
