import { describe, expect, it } from 'vitest'
import type { TreeNode } from '../types'
import { foldRows, foldableIds, hiddenCounts } from './chartFold'
import { buildChartModel, countPoints } from './chartModel'

function node(id: string, skill: string | null, overrides: Partial<TreeNode> = {}): TreeNode {
  return { id, code: id.toUpperCase(), name: `Point ${id}`, skill, kind: 'STRATEGY', status: 'ACTIVE', cefrLevel: 'B1', ...overrides }
}

describe('buildChartModel', () => {
  const nodes = [
    node('rd-goal', 'READING', { cefrLevel: 'C1' }), node('rd-base', 'READING'),
    node('wr-goal', 'WRITING', { cefrLevel: 'C1' }), node('gram', 'ALL'),
    node('ls-alone', 'LISTENING'), node('wr-alone', 'WRITING'),
  ]
  const edges = [
    { from: 'rd-base', to: 'rd-goal' },
    { from: 'gram', to: 'wr-goal' },
    { from: 'gram', to: 'rd-goal' },
  ]

  it('files the goals by skill, one chart each in skill order, with what they need beneath', () => {
    const { sections } = buildChartModel(nodes, edges)

    expect(sections.map((section) => section.label)).toEqual(['Reading', 'Writing'])
    expect(sections[0]!.rows.map((goal) => goal.node.id)).toEqual(['rd-goal'])
    expect(sections[0]!.rows[0]!.children.map((child) => child.node.id).sort()).toEqual(['gram', 'rd-base'])
  })

  it('draws a prerequisite once, beneath the first goal that needs it, and names the other goals that need it', () => {
    const { sections } = buildChartModel(nodes, edges)
    const drawn = sections.flatMap((section) => section.rows).flatMap((goal) => goal.children).filter((child) => child.node.id === 'gram')

    expect(drawn).toHaveLength(1)
    expect(drawn[0]!.alsoFor).toHaveLength(1)
    expect(sections.map((section) => section.points)).toEqual([3, 1])
  })

  it('sets apart the points no link reaches, in skill order and then by code', () => {
    expect(buildChartModel(nodes, edges).loose.map((item) => item.id)).toEqual(['ls-alone', 'wr-alone'])
  })

  it('counts the points and the links it was given, ignoring a link to a point that is not there', () => {
    const model = buildChartModel(nodes, [...edges, { from: 'ghost', to: 'rd-goal' }, { from: 'rd-goal', to: 'rd-goal' }])

    expect(model.points).toBe(6)
    expect(model.links).toBe(3)
  })

  it('has no chart when nothing is linked, and every point is set apart', () => {
    const model = buildChartModel(nodes, [])

    expect(model.sections).toEqual([])
    expect(model.loose).toHaveLength(6)
  })

  it('puts a point with no skill, or one that is not listed, under "Khác"', () => {
    const { sections } = buildChartModel([node('a', null), node('b', 'MAGIC')], [{ from: 'a', to: 'b' }])

    expect(sections.map((section) => section.label)).toEqual(['Khác'])
  })
})

describe('folding a chart', () => {
  const { sections } = buildChartModel(
    [node('goal', 'READING'), node('mid', 'READING'), node('base', 'READING'), node('other', 'READING')],
    [{ from: 'mid', to: 'goal' }, { from: 'base', to: 'mid' }, { from: 'other', to: 'goal' }],
  )
  const rows = sections[0]!.rows

  it('names the rows that have rows beneath them, and how many points each would hide', () => {
    expect(foldableIds(rows).sort()).toEqual(['goal', 'mid'])
    expect(hiddenCounts(rows).get('goal')).toBe(3)
    expect(hiddenCounts(rows).get('mid')).toBe(1)
    expect(countPoints(rows)).toBe(4)
  })

  it('leaves out what is beneath a folded point and keeps the point itself', () => {
    const folded = foldRows(rows, new Set(['goal']))

    expect(folded.map((row) => row.node.id)).toEqual(['goal'])
    expect(folded[0]!.children).toEqual([])
    expect(foldRows(rows, new Set(['mid']))[0]!.children.map((row) => row.node.id).sort()).toEqual(['mid', 'other'])
    expect(foldRows(rows, new Set())).toEqual(rows)
  })
})
