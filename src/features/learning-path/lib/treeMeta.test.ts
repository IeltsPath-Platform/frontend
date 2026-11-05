import { describe, expect, it } from 'vitest'
import type { TreePoint } from '~types/learningPath'
import { countByTierGroup, prerequisiteSteps, tierGroup } from './treeMeta'

function point(id: string, prerequisiteIds: string[] = [], over: Partial<TreePoint> = {}): TreePoint {
  return {
    knowledgePointId: id, code: id.toUpperCase(), name: id, skill: 'WRITING', kind: null, cefrLevel: null, canDo: null,
    mastery: null, tier: null, evidenceCount: 0, nextReviewAt: null, prerequisiteIds, practiceAvailable: true, ...over,
  }
}

const ids = (steps: ReturnType<typeof prerequisiteSteps>) => steps.map((step) => step.points.map((row) => row.knowledgePointId))

describe('prerequisiteSteps', () => {
  it('puts what builds on nothing first and every point one step after the latest thing it builds on', () => {
    // paragraph -> opinion -> cohesion -> both-views, and both-views also needs paragraph directly.
    const steps = prerequisiteSteps([
      point('both', ['cohesion', 'paragraph']), point('cohesion', ['opinion']), point('opinion', ['paragraph']), point('paragraph'),
    ])
    expect(ids(steps)).toEqual([['paragraph'], ['opinion'], ['cohesion'], ['both']])
    expect(steps.map((step) => step.number)).toEqual([1, 2, 3, 4])
  })

  it('lets several points share a step and keeps those that build on the same earlier point together', () => {
    const steps = prerequisiteSteps([
      point('a'), point('b'), point('a2', ['a']), point('b2', ['b']), point('a3', ['a']),
    ])
    expect(ids(steps)).toEqual([['a', 'b'], ['a2', 'a3', 'b2']])
  })

  it('orders the points of a step by the chặng that teaches them, then by lesson, not by code', () => {
    const taught = (id: string, chapter: number, lesson = 1) => point(id, [], {
      topic: { topicId: `t${chapter}`, name: `Chặng ${chapter}`, position: chapter },
      lessons: [{ lessonId: `${id}-l`, title: id, position: lesson, topicId: `t${chapter}`, topicName: `Chặng ${chapter}`, topicPosition: chapter }],
    })
    // Codes sort a < b < c < d, but the course teaches d first, then b and c in the same chặng by lesson, then a.
    const steps = prerequisiteSteps([taught('a', 5), taught('b', 3, 2), taught('c', 3, 1), taught('d', 1), point('z')])
    expect(ids(steps)).toEqual([['d', 'c', 'b', 'a', 'z']])
  })

  it('ignores what a point builds on outside this skill', () => {
    const steps = prerequisiteSteps([point('w1', ['grammar-elsewhere']), point('w2', ['w1'])])
    expect(ids(steps)).toEqual([['w1'], ['w2']])
  })

  it('still draws every point when the data loops', () => {
    const steps = prerequisiteSteps([point('a', ['b']), point('b', ['a']), point('c')])
    expect(steps.flatMap((step) => step.points.map((row) => row.knowledgePointId)).sort()).toEqual(['a', 'b', 'c'])
  })

  it('returns no step for no points', () => {
    expect(prerequisiteSteps([])).toEqual([])
  })
})

describe('tier groups', () => {
  it('treats a point with no tier and one with too little data as not yet learnt', () => {
    expect(tierGroup(point('x'))).toBe('PENDING')
    expect(tierGroup(point('x', [], { tier: 'INSUFFICIENT' }))).toBe('PENDING')
    expect(tierGroup(point('x', [], { tier: 'PRIORITY' }))).toBe('PRIORITY')
  })

  it('counts each group', () => {
    expect(countByTierGroup([point('a', [], { tier: 'MAINTAIN' }), point('b'), point('c', [], { tier: 'MAINTAIN' })]))
      .toEqual({ MAINTAIN: 2, CONSOLIDATE: 0, PRIORITY: 0, PENDING: 1 })
  })
})
