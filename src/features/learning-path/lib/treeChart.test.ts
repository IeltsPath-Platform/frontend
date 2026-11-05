import { describe, expect, it } from 'vitest'
import type { TreePoint } from '~types/learningPath'
import { defaultSelection, dependentsOf, learningOrder } from './treeChart'

function point(id: string, prerequisiteIds: string[] = [], over: Partial<TreePoint> = {}): TreePoint {
  return {
    knowledgePointId: id, code: id.toUpperCase(), name: id, skill: 'READING', kind: null, cefrLevel: 'B1', canDo: null,
    mastery: null, tier: null, evidenceCount: 0, nextReviewAt: null, prerequisiteIds, practiceAvailable: true, ...over,
  }
}

describe('learningOrder', () => {
  it('counts the order inside each skill, so every skill starts at 1', () => {
    const order = learningOrder([
      point('r1'), point('r2', ['r1']), point('w1', [], { skill: 'WRITING' }), point('w2', ['w1'], { skill: 'WRITING' }),
    ])
    expect([order.get('r1'), order.get('r2'), order.get('w1'), order.get('w2')]).toEqual([1, 2, 1, 2])
  })
})

describe('dependentsOf', () => {
  it('names the points that build directly on each point', () => {
    const dependents = dependentsOf([point('a'), point('b', ['a']), point('c', ['a', 'b'])])
    expect(dependents.get('a')?.map((row) => row.knowledgePointId)).toEqual(['b', 'c'])
    expect(dependents.get('b')?.map((row) => row.knowledgePointId)).toEqual(['c'])
    expect(dependents.has('c')).toBe(false)
  })
})

describe('defaultSelection', () => {
  it('lands on the first point that needs work, else the first point', () => {
    expect(defaultSelection([point('a'), point('b', [], { tier: 'PRIORITY' })])?.knowledgePointId).toBe('b')
    expect(defaultSelection([point('a'), point('b')])?.knowledgePointId).toBe('a')
    expect(defaultSelection([])).toBeUndefined()
  })
})
