import { z } from 'zod'
import { apiRequest } from '@/lib/httpClient'
import {
  contentOverviewSchema,
  questionStatsSchema,
  workItemSchema,
  type ContentOverview,
  type QuestionStat,
  type WorkItem,
} from '../types'

export async function fetchContentOverview(signal?: AbortSignal): Promise<ContentOverview> {
  return contentOverviewSchema.parse(await apiRequest<unknown>('/api/content/admin/overview', { auth: true, signal }))
}

/** The R&D queue only; finished items stay out of the list. */
export async function fetchAuthorWorkItems(signal?: AbortSignal): Promise<WorkItem[]> {
  const raw = await apiRequest<unknown>('/api/learning/admin/work-items?queue=CONTENT_AUTHOR', { auth: true, signal })
  return z.array(workItemSchema).parse(raw).filter((item) => item.status !== 'DONE')
}

export async function fetchQuestionStats(minAttempts = 20, signal?: AbortSignal): Promise<QuestionStat[]> {
  const raw = await apiRequest<unknown>(`/api/learning/admin/question-stats?minAttempts=${minAttempts}`, { auth: true, signal })
  return questionStatsSchema.parse(raw).questions
}
