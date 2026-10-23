import { z } from 'zod'
import { apiRequest } from '@/lib/httpClient'
import { qualitySchema, queueEntrySchema, queuePageSchema, reviewEssaySchema, reviewSchema, type ReviewBody } from '../types'

const QA = '/api/assessments/qa-reviews'
const PAGE_SIZE = 20

function pageQuery(page: number) {
  return new URLSearchParams({ page: String(z.int().nonnegative().parse(page)), size: String(PAGE_SIZE) })
}

export const REVIEW_PAGE_SIZE = PAGE_SIZE

export async function listReviewQueue(page = 0, signal?: AbortSignal) {
  return queuePageSchema.parse(await apiRequest<unknown>(`${QA}/queue?${pageQuery(page)}`, { auth: true, signal }))
}

/** The essays the caller claimed and has not reviewed yet. */
export async function listMyReviews(page = 0, signal?: AbortSignal) {
  return queuePageSchema.parse(await apiRequest<unknown>(`${QA}/mine?${pageQuery(page)}`, { auth: true, signal }))
}

export async function claimReview(jobId: string) {
  return queueEntrySchema.parse(await apiRequest<unknown>(`${QA}/${z.guid().parse(jobId)}/claim`, { auth: true, method: 'POST' }))
}

export async function getReviewEssay(jobId: string, signal?: AbortSignal) {
  return reviewEssaySchema.parse(await apiRequest<unknown>(`${QA}/${z.guid().parse(jobId)}/essay`, { auth: true, signal }))
}

export async function submitReview(body: ReviewBody) {
  await apiRequest<unknown>(QA, { auth: true, method: 'POST', body: reviewSchema.parse(body) })
}

export async function listExaminerQuality(signal?: AbortSignal) {
  return z.array(qualitySchema).parse(await apiRequest<unknown>('/api/assessments/admin/examiner-quality', { auth: true, signal }))
}
