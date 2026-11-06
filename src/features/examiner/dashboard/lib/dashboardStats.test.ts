import { describe, expect, it } from 'vitest'
import type { CompletedItem } from '../../grading/types'
import { averageBand, bandColumns, countBy, deadlineSlices, intakeSlices, lastDays, openJobs } from './dashboardStats'

const done = (band: number, overrides: Partial<CompletedItem> = {}): CompletedItem => ({
  jobId: '60000000-0000-4000-8000-000000001000', source: 'PRACTICE', skill: 'WRITING', task: 'TASK_2', band, completedAt: null, ...overrides,
})
const values = (slices: { value: number }[]) => slices.map((slice) => slice.value)

describe('deadlineSlices', () => {
  it('splits the open jobs into on time, late soon and late without overlap', () => {
    const slices = deadlineSlices({ queued: 6, processing: 2, dueSoon: 3, overdue: 1 })
    expect(values(slices)).toEqual([4, 3, 1])
    expect(slices.reduce((total, slice) => total + slice.value, 0)).toBe(openJobs({ queued: 6, processing: 2 }))
  })

  it('never goes below zero when the counts were read a moment apart', () => {
    expect(values(deadlineSlices({ queued: 1, processing: 0, dueSoon: 3, overdue: 2 }))).toEqual([0, 0, 1])
    expect(values(deadlineSlices({ queued: 0, processing: 0, dueSoon: 0, overdue: 0 }))).toEqual([0, 0, 0])
  })
})

describe('intakeSlices', () => {
  it('splits the daily limit into taken and left', () => {
    expect(values(intakeSlices({ receivedToday: 7, dailyLimit: 10 }) ?? [])).toEqual([7, 3])
  })

  it('caps what was taken at the limit and gives nothing when the limit is unknown', () => {
    expect(values(intakeSlices({ receivedToday: 12, dailyLimit: 10 }) ?? [])).toEqual([10, 0])
    expect(intakeSlices({ receivedToday: 7, dailyLimit: null })).toBeNull()
  })
})

describe('lastDays', () => {
  const now = new Date(2026, 9, 28, 12, 0)

  it('counts the finished jobs per day, oldest first, with the days without any as zero', () => {
    const items = [
      done(6, { completedAt: new Date(2026, 9, 28, 9, 0).toISOString() }),
      done(6, { completedAt: new Date(2026, 9, 28, 23, 30).toISOString() }),
      done(6, { completedAt: new Date(2026, 9, 26, 8, 0).toISOString() }),
      done(6, { completedAt: new Date(2026, 9, 1, 8, 0).toISOString() }),
      done(6, { completedAt: null }),
    ]
    const days = lastDays(items, 7, now)
    expect(days.map((day) => day.label)).toEqual(['22/10', '23/10', '24/10', '25/10', '26/10', '27/10', '28/10'])
    expect(values(days)).toEqual([0, 0, 0, 0, 1, 0, 2])
  })

  it('crosses a month boundary', () => {
    expect(lastDays([], 3, new Date(2026, 10, 1, 8, 0)).map((day) => day.label)).toEqual(['30/10', '31/10', '01/11'])
  })

  it('skips a date it cannot read', () => {
    expect(values(lastDays([done(6, { completedAt: 'not a date' })], 2, now))).toEqual([0, 0])
  })
})

describe('bandColumns', () => {
  it('groups the low and the high ends and keeps each half band between', () => {
    const columns = bandColumns([done(4), done(5), done(5.5), done(6.5), done(6.5), done(7.5), done(8), done(9)])
    expect(columns.map((column) => column.label)).toEqual(['≤5.0', '5.5', '6.0', '6.5', '7.0', '7.5', '≥8.0'])
    expect(values(columns)).toEqual([2, 1, 0, 2, 0, 1, 2])
  })
})

describe('averageBand', () => {
  it('is the mean band, or null with nothing graded', () => {
    expect(averageBand([done(7), done(6)])).toBe(6.5)
    expect(averageBand([])).toBeNull()
  })
})

describe('countBy', () => {
  it('puts the biggest group first and breaks a tie alphabetically', () => {
    const rows = countBy([done(6, { task: 'TASK_2' }), done(6, { task: 'TASK_1' }), done(6, { task: 'TASK_2' }), done(6, { task: 'TASK_3' })], (item) => item.task ?? '')
    expect(rows.map((row) => [row.label, row.value])).toEqual([['TASK_2', 2], ['TASK_1', 1], ['TASK_3', 1]])
  })
})
