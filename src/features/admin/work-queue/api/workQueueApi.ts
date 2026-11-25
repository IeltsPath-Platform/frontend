import { z } from 'zod'
import { apiRequest } from '@/lib/httpClient'
import { WORK_KINDS, WORK_STATUSES, workItemSchema, type WorkItem, type WorkKind, type WorkStatus, type WorkUpdate } from '../types'
import type { PageResult } from '../../lib/useInfiniteList'

const BASE = '/api/learning/admin/work-items'

/** The R&D queue, optionally narrowed to one kind or one status. */
export async function listWorkItems(filter: { kind?: WorkKind; status?: WorkStatus | 'ACTIVE'; page: number; size: number }, signal?: AbortSignal): Promise<PageResult<WorkItem>> {
  const params = new URLSearchParams({ queue: 'CONTENT_AUTHOR' })
  params.set('page', String(filter.page))
  params.set('size', String(filter.size))
  if (filter.kind) params.set('kind', z.enum(WORK_KINDS).parse(filter.kind))
  if (filter.status) params.set('status', filter.status === 'ACTIVE' ? 'ACTIVE' : z.enum(WORK_STATUSES).parse(filter.status))
  const pageSchema = z.object({ content: z.array(workItemSchema), page: z.number(), size: z.number(), totalElements: z.number(), totalPages: z.number() })
  return pageSchema.parse(await apiRequest<unknown>(`${BASE}?${params}`, { auth: true, signal }))
}

/** Takes, returns or finishes an item. Only the fields given are sent. */
export async function updateWorkItem(id: string, update: WorkUpdate): Promise<void> {
  const body: Record<string, string> = {}
  if (update.status) body.status = z.enum(WORK_STATUSES).parse(update.status)
  for (const key of ['action', 'result', 'note'] as const) {
    const value = update[key]?.trim()
    if (value) body[key] = value
  }
  await apiRequest<unknown>(`${BASE}/${z.guid().parse(id)}`, { auth: true, method: 'PATCH', body })
}
