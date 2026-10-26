import { z } from 'zod'
import { apiRequest } from '@/lib/httpClient'
import type { WritingSubmission } from './writingApi'

const certificateSchema = z.object({
  name: z.string(),
  issuer: z.string().nullish(),
  year: z.number().nullish(),
  score: z.string().nullish(),
})

/** What a learner sees of an examiner when choosing who grades: name, photo, band, certificates. No workload limit. */
export const examinerSchema = z.object({
  id: z.guid(),
  displayName: z.string(),
  avatarUrl: z.string().nullish(),
  bio: z.string().nullish(),
  ieltsBand: z.number().nullish(),
  certificates: z.array(certificateSchema),
  acceptingSubmissions: z.boolean(),
})
export type Examiner = z.infer<typeof examinerSchema>

const availabilitySchema = z.array(z.object({ examinerId: z.guid(), full: z.boolean() }))
const MAX_AVAILABILITY_IDS = 50

/** The examiners who take new submissions. */
export async function listExaminers(signal?: AbortSignal) {
  return z.array(examinerSchema).parse(await apiRequest<unknown>('/api/users/examiners', { auth: true, signal }))
}

export async function getExaminer(examinerId: string, signal?: AbortSignal) {
  return examinerSchema.parse(await apiRequest<unknown>(`/api/users/examiners/${z.guid().parse(examinerId)}`, { auth: true, signal }))
}

/** Which of the examiners cannot take another submission today (their daily limit is reached, or they stopped taking work). */
export async function getFullExaminers(ids: string[], signal?: AbortSignal): Promise<Set<string>> {
  if (ids.length === 0) return new Set()
  const unique = [...new Set(ids)].slice(0, MAX_AVAILABILITY_IDS)
  const query = new URLSearchParams({ ids: unique.join(',') })
  const rows = availabilitySchema.parse(await apiRequest<unknown>(`/api/assessments/examiners/availability?${query}`, { auth: true, signal }))
  return new Set(rows.filter((row) => row.full).map((row) => row.examinerId))
}

export interface ExaminerSubmissionInput {
  requestId: string
  packageVersionId: string
  questionVersionId: string
  essayText: string
  examinerId: string
}

/** Sends the essay to the chosen examiner instead of the AI. Needs Premium with a grading credit left. */
export function submitToExaminer(input: ExaminerSubmissionInput) {
  return apiRequest<WritingSubmission>('/api/learning/free-writing/examiner-submissions', { method: 'POST', auth: true, body: input })
}

const pendingSchema = z.object({ pending: z.boolean(), submissionId: z.guid().nullish() })

/**
 * The learner's last essay for this prompt that went to a teacher who has not graded it yet, or null. Asked before writing
 * again, so the learner hears it before spending time on an essay that cannot be sent.
 */
export async function getPendingExaminerSubmission(questionVersionId: string, signal?: AbortSignal) {
  const query = new URLSearchParams({ questionVersionId: z.guid().parse(questionVersionId) })
  const answer = pendingSchema.parse(await apiRequest<unknown>(`/api/learning/free-writing/examiner-submissions/pending?${query}`, { auth: true, signal }))
  return answer.pending ? answer.submissionId ?? null : null
}

const annotationSchema = z.object({
  excerpt: z.string(),
  start: z.number().int(),
  end: z.number().int(),
  errorCode: z.string().nullish(),
  suggestion: z.string().nullish(),
})

/** The examiner's review of an essay: PENDING until they finish; the grade fields are only there when DONE. */
export const humanReviewSchema = z.object({
  reviewSubmissionId: z.guid(),
  examinerId: z.guid().nullish(),
  status: z.enum(['PENDING', 'DONE']),
  band: z.number().nullish(),
  criteria: z.array(z.object({ criterion: z.string(), band: z.number(), comment: z.string().nullish() })).nullish(),
  errorCodes: z.array(z.string()).nullish(),
  feedback: z.string().nullish(),
  annotations: z.array(annotationSchema).nullish(),
})
export type HumanReview = z.infer<typeof humanReviewSchema>
export type ReviewAnnotation = z.infer<typeof annotationSchema>

export async function getHumanReview(submissionId: string, signal?: AbortSignal) {
  return humanReviewSchema.parse(await apiRequest<unknown>(`/api/learning/writing-submissions/${z.guid().parse(submissionId)}/human-review`, { auth: true, signal }))
}
