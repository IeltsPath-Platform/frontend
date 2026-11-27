import { z } from 'zod'
import { apiRequest } from '@/lib/httpClient'

export type AiGradingSubmissionType = 'WRITING' | 'SPEAKING'
export type AiGradingReportStatus = 'OPEN' | 'REVIEWED' | 'DISMISSED'

/** Longest reason the server accepts. */
export const AI_GRADING_REPORT_REASON_MAX = 1000

const reportSchema = z.object({
  id: z.string(),
  userId: z.string(),
  submissionId: z.string(),
  submissionType: z.enum(['WRITING', 'SPEAKING']),
  reason: z.string(),
  status: z.enum(['OPEN', 'REVIEWED', 'DISMISSED']),
  createdAt: z.string(),
})
export type AiGradingReport = z.infer<typeof reportSchema>

const reportPageSchema = z.object({
  content: z.array(reportSchema),
  page: z.number(),
  size: z.number(),
  totalElements: z.number(),
  totalPages: z.number(),
})
export type AiGradingReportPage = z.infer<typeof reportPageSchema>

export const aiGradingReportApi = {
  /** One report per learner and submission; sending again returns the report already filed. */
  submit: async (body: { submissionId: string; submissionType: AiGradingSubmissionType; reason: string }) =>
    reportSchema.parse(await apiRequest('/api/learning/ai-grading-reports', { method: 'POST', auth: true, body })),

  /** Examiner queue, newest first. */
  list: async (filters: { status?: AiGradingReportStatus; submissionType?: AiGradingSubmissionType; page?: number; size?: number }) => {
    const params = new URLSearchParams({ page: String(filters.page ?? 0), size: String(filters.size ?? 20) })
    if (filters.status) params.set('status', filters.status)
    if (filters.submissionType) params.set('submissionType', filters.submissionType)
    return reportPageSchema.parse(await apiRequest(`/api/learning/admin/ai-grading-reports?${params}`, { auth: true }))
  },
}
