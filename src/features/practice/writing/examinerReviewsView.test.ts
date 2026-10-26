import { describe, expect, it } from 'vitest'
import { averageBand, countReviews, dateText, joinReviews, sourceText, taskText, viewReviews } from './examinerReviewsView'
import type { ExaminerReviewItem } from './examinerReviewsApi'
import type { MyGradingJob } from './gradingJobApi'

const id = (n: number) => `30000000-0000-4000-8000-${String(n).padStart(12, '0')}`
const item = (n: number, requestedAt: string): ExaminerReviewItem => ({
  submissionId: id(n), reviewSubmissionId: id(100 + n), source: 'FREE_WRITING', task: 'TASK_2', promptPreview: `Prompt ${n}`, wordCount: 250, requestedAt,
})
const job = (n: number, overrides: Partial<MyGradingJob> = {}): MyGradingJob => ({
  id: id(200 + n), reviewSubmissionId: id(100 + n), skill: 'WRITING', source: 'PRACTICE', state: 'WAITING', examinerId: id(9),
  requestedAt: '2026-10-25T01:00:00Z', deadline: '2026-10-27T01:00:00Z', canChoose: false, changesLeft: 2, createdAt: '2026-10-25T01:00:00Z', ...overrides,
})

describe('the learner list of essays sent to a teacher', () => {
  const items = [item(1, '2026-10-20T01:00:00Z'), item(2, '2026-10-22T01:00:00Z'), item(3, '2026-10-24T01:00:00Z')]
  const jobs = [
    job(1, { state: 'COMPLETED', band: 6.5, completedAt: '2026-10-21T01:00:00Z' }),
    job(2, { state: 'COMPLETED', band: 7, completedAt: '2026-10-23T01:00:00Z' }),
  ]

  it('joins each essay with its job by the review id: graded ones carry the band, the rest wait', () => {
    const rows = joinReviews(items, jobs)

    expect(rows.map((row) => [row.done, row.band])).toEqual([[true, 6.5], [true, 7], [false, null]])
    expect(rows[2].job).toBeNull()
  })

  it('treats an essay as waiting when its job is not in the list, and ignores a band of a job that is not finished', () => {
    const rows = joinReviews([item(4, '2026-10-24T01:00:00Z')], [job(4, { state: 'WAITING', band: 5 })])

    expect(rows[0].done).toBe(false)
    expect(rows[0].band).toBeNull()
  })

  it('shows graded essays first, the newest grade first, then the waiting ones', () => {
    const rows = joinReviews(items, jobs)

    expect(viewReviews(rows, 'ALL').map((row) => row.submissionId)).toEqual([id(2), id(1), id(3)])
    expect(viewReviews(rows, 'DONE').map((row) => row.submissionId)).toEqual([id(2), id(1)])
    expect(viewReviews(rows, 'WAITING').map((row) => row.submissionId)).toEqual([id(3)])
    expect(countReviews(rows)).toEqual({ ALL: 3, DONE: 2, WAITING: 1 })
  })

  it('averages the teacher bands to the nearest half band, and has no average while nothing is graded', () => {
    const rows = joinReviews(items, jobs)

    expect(averageBand(rows)).toBe(7)
    expect(averageBand(joinReviews(items, [job(1, { state: 'COMPLETED', band: 6, completedAt: '2026-10-21T01:00:00Z' }), job(2, { state: 'COMPLETED', band: 6.5, completedAt: '2026-10-21T01:00:00Z' })]))).toBe(6.5)
    expect(averageBand(joinReviews(items, []))).toBeNull()
  })

  it('names the task and the source in the learner words', () => {
    expect(taskText('TASK_1')).toBe('Task 1')
    expect(taskText(null)).toBe('Writing')
    expect(sourceText('FREE_WRITING')).toBe('Luyện viết tự do')
    expect(sourceText('LESSON_BLOCK')).toBe('Bài học')
    expect(sourceText(undefined)).toBe('Bài viết')
    expect(dateText('not a date')).toBe('')
  })
})
