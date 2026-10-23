import { z } from 'zod'
import { apiRequest } from '@/lib/httpClient'
import { WORK_KINDS, WORK_STATUSES, workItemSchema, type WorkItem, type WorkKind, type WorkStatus, type WorkUpdate } from '../types'

const BASE = '/api/learning/admin/work-items'

/** The R&D queue, optionally narrowed to one kind or one status. */
export async function listWorkItems(filter: { kind?: WorkKind; status?: WorkStatus } = {}, signal?: AbortSignal): Promise<WorkItem[]> {
  const params = new URLSearchParams({ queue: 'CONTENT_AUTHOR' })
  if (filter.kind) params.set('kind', z.enum(WORK_KINDS).parse(filter.kind))
  if (filter.status) params.set('status', z.enum(WORK_STATUSES).parse(filter.status))
  return z.array(workItemSchema).parse(await apiRequest<unknown>(`${BASE}?${params}`, { auth: true, signal }))
}

/** Takes, returns or finishes an item. Only the fields given are sent. */
export async function updateWorkItem(id: string, update: WorkUpdate): Promise<void> {
  const body: Record<string, string> = {}
  if (update.status) body.status = z.enum(WORK_STATUSES).parse(update.status)
  for (const key of ['action', 'result', 'note'] as const) {
    const value = update[key]?.trim()
    if (value) body[key] = value
  }
  await apiRequest<unknown>(`${BASE}/${z.uuid().parse(id)}`, { auth: true, method: 'PATCH', body })
}
