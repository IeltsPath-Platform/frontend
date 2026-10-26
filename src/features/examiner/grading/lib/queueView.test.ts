import { describe, expect, it } from 'vitest'
import type { GradingEntry } from '../types'
import { countByTab, deadlineText, jobCode, pageCount, viewCompleted, viewQueue, type QueueFilters } from './queueView'

const entry = (id: string, overrides: Partial<GradingEntry> = {}): GradingEntry => ({
  id, attemptId: null, attemptType: null, source: 'PRACTICE', skill: 'WRITING', task: 'TASK_2', status: 'QUEUED',
  claimedAt: null, createdAt: '2026-10-21T01:00:00Z', waitSeconds: 3600, overdue: false, hasDraft: false, ...overrides,
})
const all: QueueFilters = { tab: 'ALL', source: '', search: '', sort: 'DUE_FIRST' }
const ids = (rows: GradingEntry[]) => rows.map((row) => row.id)

const a = '10000000-0000-4000-8000-00000000000a'
const b = '20000000-0000-4000-8000-00000000000b'
const c = '30000000-0000-4000-8000-00000000000c'

describe('viewQueue', () => {
  const jobs = [
    entry(a, { waitSeconds: 3600 }),
    entry(b, { waitSeconds: 90000, status: 'PROCESSING', source: 'LESSON' }),
    entry(c, { waitSeconds: 200000, overdue: true, attemptType: 'MOCK' }),
  ]

  it('puts the job closest to its deadline first, or last', () => {
    expect(ids(viewQueue(jobs, all))).toEqual([c, b, a])
    expect(ids(viewQueue(jobs, { ...all, sort: 'DUE_LAST' }))).toEqual([a, b, c])
  })

  it('keeps one state per tab', () => {
    expect(ids(viewQueue(jobs, { ...all, tab: 'QUEUED' }))).toEqual([c, a])
    expect(ids(viewQueue(jobs, { ...all, tab: 'PROCESSING' }))).toEqual([b])
  })

  it('filters by source, where an exam attempt counts by its type', () => {
    expect(ids(viewQueue(jobs, { ...all, source: 'MOCK' }))).toEqual([c])
    expect(ids(viewQueue(jobs, { ...all, source: 'LESSON' }))).toEqual([b])
  })

  it('searches the job code with or without the hash, in any case', () => {
    expect(jobCode(b)).toBe('#200000')
    expect(ids(viewQueue(jobs, { ...all, search: '#2000' }))).toEqual([b])
    expect(ids(viewQueue(jobs, { ...all, search: ' 30000 ' }))).toEqual([c])
    expect(viewQueue(jobs, { ...all, search: 'zzz' })).toEqual([])
  })

  it('does not reorder the list it was given', () => {
    const before = ids(jobs)
    viewQueue(jobs, all)
    expect(ids(jobs)).toEqual(before)
  })
})

describe('viewCompleted', () => {
  const done = (jobId: string, source: string) => ({ jobId, source, skill: 'WRITING', task: 'TASK_2', band: 6.5, completedAt: '2026-10-26T03:30:00Z' })
  const items = [done(a, 'PRACTICE'), done(b, 'LESSON'), done(c, 'PRACTICE')]

  it('keeps the order the server sent (newest first) and narrows by source and job code', () => {
    expect(viewCompleted(items, { source: '', search: '' }).map((item) => item.jobId)).toEqual([a, b, c])
    expect(viewCompleted(items, { source: 'PRACTICE', search: '' }).map((item) => item.jobId)).toEqual([a, c])
    expect(viewCompleted(items, { source: '', search: '#2000' }).map((item) => item.jobId)).toEqual([b])
    expect(viewCompleted(items, { source: 'LESSON', search: '3000' })).toEqual([])
  })
})

describe('queue labels', () => {
  it('counts each tab', () => {
    expect(countByTab([entry(a), entry(b, { status: 'PROCESSING' }), entry(c)])).toEqual({ ALL: 3, QUEUED: 2, PROCESSING: 1 })
  })

  it('puts a job with a saved draft under "Đang chấm" even though it is still queued', () => {
    const jobs = [entry(a), entry(b, { hasDraft: true }), entry(c)]
    expect(countByTab(jobs)).toEqual({ ALL: 3, QUEUED: 2, PROCESSING: 1 })
    expect(ids(viewQueue(jobs, { ...all, tab: 'PROCESSING' }))).toEqual([b])
    expect(ids(viewQueue(jobs, { ...all, tab: 'QUEUED' }))).not.toContain(b)
  })

  it('says how long is left, or how late', () => {
    expect(deadlineText({ overdue: false, waitSeconds: 7200 })).toBe('Còn 2 ngày')
    expect(deadlineText({ overdue: false, waitSeconds: 46 * 3600 })).toBe('Còn 2 giờ')
    expect(deadlineText({ overdue: true, waitSeconds: 51 * 3600 })).toBe('Quá hạn 3 giờ')
  })

  it('has at least one page, ten jobs to a page', () => {
    expect([pageCount(0), pageCount(10), pageCount(11)]).toEqual([1, 1, 2])
  })
})
