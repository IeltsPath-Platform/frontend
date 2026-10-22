import { apiRequest } from '@/lib/httpClient'
import { activityStatsSchema, serviceSnapshotSchema, type ActivityStats, type DateRange, type ServiceSnapshot } from '../types'

export async function fetchServiceSnapshot(signal?: AbortSignal): Promise<ServiceSnapshot> {
  return serviceSnapshotSchema.parse(await apiRequest<unknown>('/api/admin/system/services', { auth: true, signal }))
}

export async function fetchActivityStats(range: DateRange, signal?: AbortSignal): Promise<ActivityStats> {
  const params = new URLSearchParams({ from: range.from, to: range.to })
  return activityStatsSchema.parse(await apiRequest<unknown>(`/api/learning/admin/activity-stats?${params}`, { auth: true, signal }))
}

