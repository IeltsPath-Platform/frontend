import { apiRequest } from '@/lib/httpClient'

export interface PointsBalance {
  userId: string
  balance: number
  totalCredited: number
  totalDebited: number
  updatedAt?: string
}

export const accessApi = {
  getMyPoints: () => apiRequest<PointsBalance>('/api/access/me/points', { auth: true }),
}
