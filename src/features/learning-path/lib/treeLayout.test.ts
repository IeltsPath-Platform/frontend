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

  it('links what is needed to what needs it, and puts the second one to the right of the first', () => {
    const layout = layoutTree([point('a'), point('b', ['a'])])
    expect(layout.links).toEqual([{ key: 'a>b', from: 'a', to: 'b' }])
    expect(at(layout, 'b').x).toBeGreaterThan(at(layout, 'a').x + BOX_WIDTH)
  })

  describe('with points of another skill that the skill builds on', () => {
    const grammar = point('grammar')
    const points = [point('a', ['grammar']), point('b', ['a'])]

    it('draws them in a column before the first step, with a line into the point that builds on them', () => {
      const layout = layoutTree(points, [grammar])
      const outside = at(layout, 'grammar')
      expect(outside).toMatchObject({ context: true, column: 0, x: CHART_PADDING })
      expect(at(layout, 'a').x).toBeGreaterThan(outside.x + BOX_WIDTH)
      expect(layout.links.map((link) => `${link.from}>${link.to}`)).toEqual(['grammar>a', 'a>b'])
      expect(layout.columns.map((column) => [column.context === true, column.number])).toEqual([[true, 1], [false, 1], [false, 2]])
    })

    it('puts what they build on before them, so the order of learning reads across the context too', () => {
      const sentence = point('sentence')
      const linking = point('linking', ['sentence'])
      const layout = layoutTree([point('a', ['linking'])], [linking, sentence])
      expect(['sentence', 'linking'].map((id) => at(layout, id).column)).toEqual([0, 1])
      expect(at(layout, 'linking').x).toBeGreaterThan(at(layout, 'sentence').x + BOX_WIDTH)
      expect(at(layout, 'a').x).toBeGreaterThan(at(layout, 'linking').x + BOX_WIDTH)
      expect(layout.links.map((link) => `${link.from}>${link.to}`).sort()).toEqual(['linking>a', 'sentence>linking'])
      expect(layout.columns.map((column) => [column.context === true, column.number])).toEqual([[true, 1], [true, 2], [false, 1]])
    })

    it('draws no line from a point of the skill back into a point of another skill', () => {
      const layout = layoutTree([point('a', ['g'])], [point('g', ['a'])])
      expect(layout.links.map((link) => `${link.from}>${link.to}`)).toEqual(['g>a'])
    })

    it('leaves the steps of the skill as they are: the first step is still step 1', () => {
      const without = layoutTree(points)
      const withContext = layoutTree(points, [grammar])
      expect(['a', 'b'].map((id) => at(withContext, id).column)).toEqual(['a', 'b'].map((id) => at(without, id).column))
      expect(withContext.width).toBeGreaterThan(without.width + BOX_WIDTH)
    })

    it('stacks several of them without overlap and keeps a line level where it can', () => {
      const layout = layoutTree([point('a', ['g1', 'g2'])], [point('g1'), point('g2')])
      expect(at(layout, 'g1').y).toBe(top)
      expect(at(layout, 'g2').y - at(layout, 'g1').y).toBeGreaterThanOrEqual(BOX_HEIGHT)
    })

    it('adds no column when there is nothing outside', () => {
      expect(layoutTree(points, []).columns.map((column) => column.number)).toEqual([1, 2])
    })
  })

  describe('with reviews that hold the learner back', () => {
    const slot = { id: 'review-1', after: 'a' }

    it('puts the review in a column of its own right after the step of its point, level with it, with a line from the point', () => {
      const layout = layoutTree([point('a'), point('b', ['a'])], [], [slot])
      const review = at(layout, 'review-1')
      expect(review).toMatchObject({ review: true })
      expect(review.x).toBeGreaterThan(at(layout, 'a').x + BOX_WIDTH)
      expect(review.y).toBe(at(layout, 'a').y)
      expect(layout.links).toContainEqual({ key: 'a>review-1', from: 'a', to: 'review-1', review: true })
    })

    it('runs the lines that left the point from the review instead, so what builds on the point comes after the review', () => {
      const layout = layoutTree([point('a'), point('b', ['a']), point('c', ['a'])], [], [slot])
      expect(layout.links.map((link) => link.key).sort()).toEqual(['a>review-1', 'review-1>b', 'review-1>c'])
      expect(layout.links.find((link) => link.key === 'review-1>b')).toMatchObject({ from: 'review-1', to: 'b', review: true })
      expect(at(layout, 'b').x).toBeGreaterThan(at(layout, 'review-1').x + BOX_WIDTH)
      // Level with the review, so the line from it to the first point that builds on it is straight.
      expect(at(layout, 'b').y).toBe(at(layout, 'review-1').y)
    })

    it('keeps the numbers of the steps and of the points: the review column is not a step', () => {
      const without = layoutTree([point('a'), point('b', ['a'])])
      const withReview = layoutTree([point('a'), point('b', ['a'])], [], [slot])
      expect(['a', 'b'].map((id) => at(withReview, id).column)).toEqual(['a', 'b'].map((id) => at(without, id).column))
      expect(withReview.columns.map((column) => [column.number, column.review === true])).toEqual([[1, false], [0, true], [2, false]])
      expect(withReview.width).toBe(without.width + BOX_WIDTH + 44)
    })

    it('puts a review after a point of the last step in a column at the end, with nothing after it', () => {
      const layout = layoutTree([point('a')], [], [slot])
      expect(layout.columns.map((column) => [column.number, column.review === true])).toEqual([[1, false], [0, true]])
      expect(layout.columns[1]!.x).toBe(at(layout, 'review-1').x)
      expect(layout.links).toEqual([{ key: 'a>review-1', from: 'a', to: 'review-1', review: true }])
    })

    it('shares one column of reviews between the points of a step, stacked without overlap', () => {
      const layout = layoutTree([point('a'), point('a2'), point('b', ['a'])], [], [slot, { id: 'review-2', after: 'a2' }])
      expect(layout.columns.filter((column) => column.review)).toHaveLength(1)
      expect(at(layout, 'review-2').x).toBe(at(layout, 'review-1').x)
      expect(Math.abs(at(layout, 'review-2').y - at(layout, 'review-1').y)).toBeGreaterThanOrEqual(BOX_HEIGHT)
    })

    it('puts the review of a point of another skill after that point among the columns of the context', () => {
      const layout = layoutTree([point('a', ['g'])], [point('g')], [{ id: 'review-g', after: 'g' }])
      expect(at(layout, 'g')).toMatchObject({ context: true, column: 0 })
      expect(at(layout, 'review-g')).toMatchObject({ review: true, context: true })
      expect(at(layout, 'review-g').x).toBeGreaterThan(at(layout, 'g').x + BOX_WIDTH)
      expect(at(layout, 'a').x).toBeGreaterThan(at(layout, 'review-g').x + BOX_WIDTH)
      expect(layout.links.map((link) => link.key).sort()).toEqual(['g>review-g', 'review-g>a'])
    })

    describe('that is only suggested', () => {
      const suggested = { id: 'review-s', after: 'a', gate: false }

      it('hangs it off the point one row under it, in the column of reviews, and keeps the lines of the point as they were', () => {
        const layout = layoutTree([point('a'), point('b', ['a'])], [], [suggested])
        const review = at(layout, 'review-s')
        expect(review).toMatchObject({ review: true })
        expect(review.x).toBeGreaterThan(at(layout, 'a').x + BOX_WIDTH)
        expect(review.y - at(layout, 'a').y).toBeGreaterThanOrEqual(BOX_HEIGHT)
        // What builds on the point is not held back: its line still runs from the point, and no line runs out of the review.
        expect(layout.links.map((link) => link.key).sort()).toEqual(['a>b', 'a>review-s'])
        expect(layout.links.find((link) => link.key === 'a>b')?.review).toBeUndefined()
        expect(layout.links.find((link) => link.key === 'a>review-s')?.review).toBe(true)
      })

      it('shares the column of reviews with a review that holds the learner back, without overlap', () => {
        const layout = layoutTree([point('a'), point('a2'), point('b', ['a'])], [], [suggested, { id: 'review-g', after: 'a2' }])
        expect(layout.columns.filter((column) => column.review)).toHaveLength(1)
        expect(at(layout, 'review-s').x).toBe(at(layout, 'review-g').x)
        expect(Math.abs(at(layout, 'review-s').y - at(layout, 'review-g').y)).toBeGreaterThanOrEqual(BOX_HEIGHT)
      })
    })

    it('ignores a review whose point is not in the chart', () => {
      const layout = layoutTree([point('a')], [], [{ id: 'review-x', after: 'elsewhere' }])
      expect(layout.boxes.map((box) => box.id)).toEqual(['a'])
      expect(layout.links).toEqual([])
    })
  })


  it('draws no line to a point outside the skill, and copes with no points', () => {
    expect(layoutTree([point('a', ['elsewhere'])]).links).toEqual([])
    const empty = layoutTree([])
    expect(empty.boxes).toEqual([])
    expect(empty.width).toBeGreaterThan(0)
  })
})
