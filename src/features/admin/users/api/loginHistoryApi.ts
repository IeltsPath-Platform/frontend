import { apiRequest } from '@/lib/httpClient'
import { loginHistoryPageSchema, type LoginHistoryPage } from '../loginHistoryTypes'

export async function listLoginHistory(userId: string, page: number, size: number, signal?: AbortSignal): Promise<LoginHistoryPage> {
  const query = new URLSearchParams({ page: String(page), size: String(size) })
  return loginHistoryPageSchema.parse(
    await apiRequest<unknown>(`/api/users/${encodeURIComponent(userId)}/login-history?${query}`, { auth: true, signal }),
  )
}
