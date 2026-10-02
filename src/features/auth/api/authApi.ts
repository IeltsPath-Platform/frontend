import { apiRequest } from '@/lib/httpClient'
import type { AuthTokenResponse, MessageResponse, UserResponse } from './types'

export const authApi = {
  login: (body: { email: string; password: string }) =>
    apiRequest<AuthTokenResponse>('/auth/login', { method: 'POST', body }),

  register: (body: { email: string; password: string; fullName: string; phoneNumber?: string }) =>
    apiRequest<UserResponse>('/api/users/register', { method: 'POST', body }),

  logout: () =>
    apiRequest<MessageResponse>('/auth/logout', { method: 'POST', body: {} }),

  me: () => apiRequest<UserResponse>('/api/users/me', { auth: true }),
}
