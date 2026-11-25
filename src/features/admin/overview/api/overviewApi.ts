import { z } from 'zod'
import { apiRequest } from '@/lib/httpClient'
import type { PageResult } from '../../lib/useInfiniteList'
import {
  contentOverviewSchema,
  questionLabelsSchema,
  questionStatsSchema,
  workItemSchema,
  type ContentOverview,
  type QuestionLabel,
  type QuestionStat,
  type WorkItem,
} from '../types'

export async function fetchContentOverview(signal?: AbortSignal): Promise<ContentOverview> {
  return contentOverviewSchema.parse(await apiRequest<unknown>('/api/content/admin/overview', { auth: true, signal }))
}

/** The R&D queue only; finished items stay out of the list. */
export async function fetchAuthorWorkItems(signal?: AbortSignal): Promise<PageResult<WorkItem>> {
  const params = new URLSearchParams({ queue: 'CONTENT_AUTHOR', status: 'ACTIVE', page: '0', size: '100' })
  const pageSchema = z.object({ content: z.array(workItemSchema), page: z.number(), size: z.number(), totalElements: z.number(), totalPages: z.number() })
  return pageSchema.parse(await apiRequest<unknown>(`/api/learning/admin/work-items?${params}`, { auth: true, signal }))
}

/** The start of the stem of each question version, so a list of statistics can name its questions. */
export async function fetchQuestionLabels(questionVersionIds: readonly string[], signal?: AbortSignal): Promise<QuestionLabel[]> {
  if (questionVersionIds.length === 0) return []
  const raw = await apiRequest<unknown>(`/api/content/admin/overview/question-labels?ids=${questionVersionIds.map(encodeURIComponent).join(',')}`, { auth: true, signal })
  return questionLabelsSchema.parse(raw)
}

export async function fetchQuestionStats(minAttempts = 20, signal?: AbortSignal): Promise<QuestionStat[]> {
  const raw = await apiRequest<unknown>(`/api/learning/admin/question-stats?minAttempts=${minAttempts}`, { auth: true, signal })
  return questionStatsSchema.parse(raw).questions
}
