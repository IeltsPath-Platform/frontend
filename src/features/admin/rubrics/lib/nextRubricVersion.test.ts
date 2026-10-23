import { describe, expect, it } from 'vitest'
import type { RubricVersion } from '../types'
import { nextRubricVersion } from './nextRubricVersion'

const version = (number: number, status: RubricVersion['status'] = 'DRAFT'): RubricVersion => ({ code: 'IELTS_WRITING_T2', task: 'TASK_2', version: number, status })

describe('nextRubricVersion', () => {
  it('starts at one for an empty history', () => {
    expect(nextRubricVersion([])).toBe(1)
  })
  it('uses the largest version in an unsorted history without changing the list', () => {
    const history = [version(4), version(9, 'ACTIVE'), version(2)]
    expect(nextRubricVersion(history)).toBe(10)
    expect(history.map((item) => item.version)).toEqual([4, 9, 2])
  })
  it('includes retired versions in the maximum', () => {
    expect(nextRubricVersion([version(8, 'RETIRED'), version(3, 'ACTIVE'), version(4)])).toBe(9)
  })
  it('handles a history containing only retired versions', () => {
    expect(nextRubricVersion([version(7, 'RETIRED'), version(2, 'RETIRED')])).toBe(8)
  })
})
