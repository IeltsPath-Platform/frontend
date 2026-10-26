import { z } from 'zod'
import { apiRequest } from '@/lib/httpClient'
import { errorTypeSchema } from '@/features/admin/error-types/types'
import {
  completedPageSchema, completionSchema, draftSchema, gradedReviewSchema, gradingEntrySchema, gradingEssaySchema, gradingPageSchema,
  type Completion,
} from '../types'

const JOBS = '/api/assessments/grading-jobs'
export const GRADING_PAGE_SIZE = 20
const MAX_LIST_SIZE = 100

/** Jobs a learner chose this examiner for: waiting (`QUEUED`) or taken and being graded (`PROCESSING`). */
export type QueueStatus = 'QUEUED' | 'PROCESSING'

export async function listMyGradingJobs(status: QueueStatus, page = 0, signal?: AbortSignal, size = GRADING_PAGE_SIZE) {
  const query = new URLSearchParams({ mode: 'HUMAN', status, page: String(z.int().nonnegative().parse(page)), size: String(z.int().positive().max(MAX_LIST_SIZE).parse(size)) })
  return gradingPageSchema.parse(await apiRequest<unknown>(`${JOBS}?${query}`, { auth: true, signal }))
}

/**
 * Everything the examiner has open, waiting and being graded together, for a screen that filters and pages on its own.
 * Each list holds at most 100 jobs (the server's page limit); `truncated` says one was cut off.
 */
export async function listMyOpenGradingJobs(signal?: AbortSignal) {
  const [queued, processing] = await Promise.all(
    (['QUEUED', 'PROCESSING'] as const).map((status) => listMyGradingJobs(status, 0, signal, MAX_LIST_SIZE)),
  )
  return {
    entries: [...queued.content, ...processing.content],
    truncated: queued.totalElements > queued.content.length || processing.totalElements > processing.content.length,
  }
}

const COMPLETED = '/api/assessments/examiners/me/completed'

/** What this examiner finished, newest first. */
export async function listMyCompletedReviews(page = 0, signal?: AbortSignal, size = GRADING_PAGE_SIZE) {
  const query = new URLSearchParams({ page: String(z.int().nonnegative().parse(page)), size: String(z.int().positive().max(MAX_LIST_SIZE).parse(size)) })
  return completedPageSchema.parse(await apiRequest<unknown>(`${COMPLETED}?${query}`, { auth: true, signal }))
}

/** One finished job to read again: the grade, the marked errors and the essay. Only the examiner who graded it may read it. */
export async function getMyGradedReview(jobId: string, signal?: AbortSignal) {
  return gradedReviewSchema.parse(await apiRequest<unknown>(`${COMPLETED}/${z.guid().parse(jobId)}`, { auth: true, signal }))
}

/** Taking the job again by the same examiner is harmless; anyone else is refused with 409. */
export async function claimGradingJob(jobId: string) {
  return gradingEntrySchema.parse(await apiRequest<unknown>(`${JOBS}/${z.guid().parse(jobId)}/claim`, { auth: true, method: 'POST' }))
}

export async function getGradingEssay(jobId: string, signal?: AbortSignal) {
  return gradingEssaySchema.parse(await apiRequest<unknown>(`${JOBS}/${z.guid().parse(jobId)}/essay`, { auth: true, signal }))
}

/** The saved draft, or null when none was saved (204). */
export async function getGradingDraft(jobId: string, signal?: AbortSignal) {
  const body = await apiRequest<unknown>(`${JOBS}/${z.guid().parse(jobId)}/human-review/draft`, { auth: true, signal })
  return body == null ? null : draftSchema.parse(body)
}

export async function saveGradingDraft(jobId: string, payload: Record<string, unknown>) {
  await apiRequest<unknown>(`${JOBS}/${z.guid().parse(jobId)}/human-review/draft`, { auth: true, method: 'PUT', body: payload })
}

export async function completeGrading(jobId: string, body: Completion) {
  await apiRequest<unknown>(`${JOBS}/${z.guid().parse(jobId)}/human-review`, { auth: true, method: 'POST', body: completionSchema.parse(body) })
}

/** The codes an examiner may mark with. Reviewed or not, any active code is accepted; learners only see approved ones. */
export async function fetchActiveErrorTypes(signal?: AbortSignal) {
  return z.array(errorTypeSchema).parse(await apiRequest<unknown>('/api/content/error-types?activeOnly=true', { auth: true, signal }))
}
