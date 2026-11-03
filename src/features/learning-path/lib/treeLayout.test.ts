import { describe, expect, it } from 'vitest'
import type { TreePoint } from '~types/learningPath'
import { BOX_HEIGHT, BOX_WIDTH, CHART_PADDING, HEADING_HEIGHT, layoutTree } from './treeLayout'

function point(id: string, prerequisiteIds: string[] = []): TreePoint {
  return {
    knowledgePointId: id, code: id.toUpperCase(), name: id, skill: 'READING', kind: null, cefrLevel: null, canDo: null,
    mastery: null, tier: null, evidenceCount: 0, nextReviewAt: null, prerequisiteIds, practiceAvailable: true,
  }
}

const at = (layout: ReturnType<typeof layoutTree>, id: string) => layout.boxes.find((box) => box.id === id)!
const top = CHART_PADDING + HEADING_HEIGHT

describe('layoutTree', () => {
  it('puts what builds on nothing in the first column and each point one column after what it builds on', () => {
    const layout = layoutTree([point('c', ['b']), point('b', ['a']), point('a'), point('d', ['a', 'c'])])
    expect(['a', 'b', 'c', 'd'].map((id) => at(layout, id).column)).toEqual([0, 1, 2, 3])
    expect(layout.columns.map((column) => column.number)).toEqual([1, 2, 3, 4])
    expect(at(layout, 'b').x).toBeGreaterThan(at(layout, 'a').x + BOX_WIDTH)
  })

  it('is as wide as the number of steps, however many points share a step', () => {
    const wide = layoutTree([point('a'), point('b'), point('c'), point('d'), point('e'), point('f', ['a'])])
    const narrow = layoutTree([point('a'), point('f', ['a'])])
    expect(wide.width).toBe(narrow.width)
    expect(wide.height).toBeGreaterThan(narrow.height)
  })

  it('stacks the points of a column without overlap and keeps them below the step headings', () => {
    const layout = layoutTree([point('a'), point('b'), point('c')])
    const ys = ['a', 'b', 'c'].map((id) => at(layout, id).y)
    expect(ys[0]).toBe(top)
    expect(ys[1]! - ys[0]!).toBeGreaterThanOrEqual(BOX_HEIGHT)
    expect(ys[2]! - ys[1]!).toBeGreaterThanOrEqual(BOX_HEIGHT)
  })

  it('sits a point level with what it builds on, so the line between them is straight', () => {
    const layout = layoutTree([point('a'), point('b'), point('a2', ['b'])])
    expect(at(layout, 'a2').y).toBe(at(layout, 'b').y)
  })

  it('draws a line from the right edge of what is needed to the left edge of what needs it', () => {
    const layout = layoutTree([point('a'), point('b', ['a'])])
    const [link] = layout.links
    expect(layout.links).toHaveLength(1)
    expect(link).toMatchObject({ from: 'a', to: 'b' })
    expect(link!.path.startsWith(`M ${at(layout, 'a').x + BOX_WIDTH} `)).toBe(true)
    expect(link!.path.endsWith(` ${at(layout, 'b').x} ${at(layout, 'b').y + BOX_HEIGHT / 2}`)).toBe(true)
  })

  it('draws no line to a point outside the skill, and copes with no points', () => {
    expect(layoutTree([point('a', ['elsewhere'])]).links).toEqual([])
    const empty = layoutTree([])
    expect(empty.boxes).toEqual([])
    expect(empty.width).toBeGreaterThan(0)
  })
})
