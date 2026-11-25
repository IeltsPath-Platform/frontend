import { describe, expect, it } from 'vitest'
import type { TreeNode } from '../../knowledge-graph/types'
import { missingPrerequisites, prerequisiteSelection } from './knowledge-prerequisites'

const point = (id: string, code: string): TreeNode => ({
  id, code, name: `Tên ${code}`, kind: 'STRATEGY', status: 'ACTIVE', skill: 'READING', learningType: null,
  band: null, courseId: null, topicId: null, lessonIds: [], cefrLevel: null, canDo: null, scopeIn: null, scopeOut: null,
})

describe('knowledge prerequisites', () => {
  const a = point('a', 'R_A')
  const b = point('b', 'R_B')
  const c = point('c', 'R_C')
  const d = point('d', 'R_D')

  it('returns no warning without edges, when prerequisites are selected, or when the dependent point is not selected', () => {
    expect(missingPrerequisites(['b'], [], [a, b, c])).toEqual([])
    expect(missingPrerequisites(['b'], [{ from: 'a', to: 'b' }], [a, b, c])).toEqual([{ point: b, missing: [a] }])
    expect(missingPrerequisites(['a', 'b'], [{ from: 'a', to: 'b' }], [a, b, c])).toEqual([])
    expect(missingPrerequisites(['a'], [{ from: 'a', to: 'b' }], [a, b, c])).toEqual([])
  })

  it('deduplicates prerequisites and sorts them by code', () => {
    const groups = missingPrerequisites(['c', 'd'], [
      { from: 'b', to: 'c' }, { from: 'a', to: 'c' }, { from: 'a', to: 'd' },
    ], [a, b, c, d])
    expect(groups).toEqual([{ point: c, missing: [a, b] }, { point: d, missing: [a] }])
    expect(prerequisiteSelection(['c', 'd'], groups)).toEqual(['c', 'd', 'a', 'b'])
  })

  it('adds only as many missing points as fit under the limit', () => {
    const value = Array.from({ length: 49 }, (_, index) => `selected-${index}`)
    expect(prerequisiteSelection(value, [{ point: c, missing: [a, b] }])).toHaveLength(50)
    expect(prerequisiteSelection(value, [{ point: c, missing: [a, b] }])).toContain('a')
    expect(prerequisiteSelection(value, [{ point: c, missing: [a, b] }])).not.toContain('b')
  })
})
