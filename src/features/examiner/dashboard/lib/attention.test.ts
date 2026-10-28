import { describe, expect, it } from 'vitest'
import type { GradingEntry } from '../../grading/types'
import { needsAttention, reasonOf, whyText } from './attention'

const entry = (n: number, overrides: Partial<GradingEntry> = {}): GradingEntry => ({
  id: `10000000-0000-4000-8000-${String(n).padStart(12, '0')}`, submissionId: null, attemptId: null, attemptItemId: null, attemptType: null,
  source: 'PRACTICE', skill: 'WRITING', task: 'TASK_2', status: 'QUEUED', reason: 'HUMAN_CREDIT', assignedExaminerId: null, claimedAt: null,
  createdAt: '2026-10-21T01:00:00Z', waitSeconds: 3600, overdue: false, requestedExaminerId: null, hasDraft: false, ...overrides,
} as GradingEntry)

const HOUR = 3600

describe('the jobs that need attention now', () => {
  it('says why a job is on the list: late, late soon, or started and left, and nothing for one that only waits', () => {
    expect(reasonOf(entry(1, { overdue: true, waitSeconds: 50 * HOUR }))).toBe('OVERDUE')
    expect(reasonOf(entry(2, { waitSeconds: 40 * HOUR }))).toBe('DUE_SOON')
    expect(reasonOf(entry(3, { hasDraft: true }))).toBe('IN_PROGRESS')
    expect(reasonOf(entry(4, { status: 'PROCESSING' }))).toBe('IN_PROGRESS')
    expect(reasonOf(entry(5))).toBeNull()
  })

  it('puts late jobs first, then ones that will be late soon, then started ones, the longest wait first in each group', () => {
    const list = needsAttention([
      entry(1, { hasDraft: true, waitSeconds: 30 * HOUR }),
      entry(2, { waitSeconds: 37 * HOUR }),
      entry(3, { overdue: true, waitSeconds: 49 * HOUR }),
      entry(4, { overdue: true, waitSeconds: 60 * HOUR }),
      entry(5, { waitSeconds: 2 * HOUR }),
      entry(6, { waitSeconds: 45 * HOUR }),
    ])

    expect(list.map((item) => [item.entry.id.slice(-1), item.reason])).toEqual([
      ['4', 'OVERDUE'], ['3', 'OVERDUE'], ['6', 'DUE_SOON'], ['2', 'DUE_SOON'], ['1', 'IN_PROGRESS'],
    ])
  })

  it('treats a late job that was also started as late, the more urgent of the two', () => {
    expect(needsAttention([entry(1, { overdue: true, hasDraft: true, waitSeconds: 50 * HOUR })])[0].reason).toBe('OVERDUE')
  })

  it('explains each reason in a line that tells the examiner what to do', () => {
    const late = whyText({ entry: entry(1, { overdue: true, waitSeconds: 56 * HOUR }), reason: 'OVERDUE' })
    expect(late).toContain('Quá hạn')
    expect(late).toContain('học viên đổi giáo viên')
    expect(whyText({ entry: entry(2, { waitSeconds: 40 * HOUR }), reason: 'DUE_SOON' })).toContain('Còn')
    expect(whyText({ entry: entry(3, { hasDraft: true }), reason: 'IN_PROGRESS' })).toContain('lưu nháp')
    expect(whyText({ entry: entry(4, { status: 'PROCESSING' }), reason: 'IN_PROGRESS' })).toContain('chưa chấm xong')
  })
})
