import { z } from 'zod'
import { HttpError, apiRequest } from '@/lib/httpClient'

/** Where a learner's job stands: waiting for the chosen examiner, late (48 hours), finished or closed (human-review-v1). */
export const jobStateSchema = z.enum(['AWAITING_CHOICE', 'WAITING', 'OVERDUE', 'COMPLETED', 'CLOSED'])
export type JobState = z.infer<typeof jobStateSchema>

export const myGradingJobSchema = z.object({
  id: z.guid(),
  /** The review id Learning holds for a Practice or Lesson essay; absent for exam attempts. */
  reviewSubmissionId: z.guid().nullish(),
  skill: z.string().nullish(),
  source: z.string().nullish(),
  state: jobStateSchema,
  examinerId: z.guid().nullish(),
  requestedAt: z.string().nullish(),
  deadline: z.string().nullish(),
  canChoose: z.boolean(),
  /** How many more times the learner may replace the examiner; starts at 2. */
  changesLeft: z.number().int().nonnegative(),
  createdAt: z.string(),
  /** The examiner's band and when they finished; only there once the job is COMPLETED. */
  band: z.number().nullish(),
  completedAt: z.string().nullish(),
})
export type MyGradingJob = z.infer<typeof myGradingJobSchema>

export async function getMyGradingJobs(signal?: AbortSignal) {
  return z.array(myGradingJobSchema).parse(await apiRequest<unknown>('/api/assessments/grading-jobs/mine', { auth: true, signal }))
}

/** The learner's job for a Practice or Lesson essay, found by the review id; null when there is none. */
export async function findJobOfReview(reviewSubmissionId: string, signal?: AbortSignal) {
  return (await getMyGradingJobs(signal)).find((job) => job.reviewSubmissionId === reviewSubmissionId) ?? null
}

/** Replaces the examiner of a late job. The learner keeps the Premium credit already spent: nothing more is charged. */
export async function changeExaminer(jobId: string, examinerId: string) {
  return myGradingJobSchema.parse(await apiRequest<unknown>(`/api/assessments/grading-jobs/${z.guid().parse(jobId)}/examiner`, {
    auth: true, method: 'POST', body: { examinerId },
  }))
}

const CHANGE_REFUSED: Record<string, string> = {
  NOT_OVERDUE: 'Chưa quá 48 giờ nên chưa đổi được giáo viên.',
  LIMIT_REACHED: 'Bạn đã dùng hết 2 lần đổi giáo viên cho bài này.',
  SAME_EXAMINER: 'Hãy chọn một giáo viên khác với giáo viên hiện tại.',
}

/** What to tell the learner when replacing the examiner did not work. */
export function changeExaminerMessage(cause: unknown) {
  if (!(cause instanceof HttpError)) return 'Chưa đổi được giáo viên. Hãy thử lại.'
  if (cause.code === 'EXAMINER_UNAVAILABLE') return 'Giáo viên này vừa đủ bài hôm nay hoặc đang tắt nhận bài. Hãy chọn giáo viên khác.'
  if (cause.code === 'EXAMINER_CHANGE_NOT_ALLOWED') {
    const reason = (cause.body as { details?: { reason?: string } } | null)?.details?.reason ?? ''
    return CHANGE_REFUSED[reason] ?? cause.message
  }
  if (cause.status === 409) return 'Bài này đã được chấm xong, không đổi giáo viên được nữa.'
  return cause.message
}
