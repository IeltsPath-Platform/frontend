import { API_BASE_URL, OAUTH_ENABLED } from '@/lib/env'
import { apiRequest } from '@/lib/httpClient'
import type { AuthTokenResponse, MessageResponse, SocialProvider, UserResponse } from './types'

/** Map UI provider label → future BE path segment. */
const OAUTH_PROVIDER_PATH: Record<SocialProvider, string> = {
  Google: 'google',
}

export const authApi = {
  login: (body: { email: string; password: string }) =>
    apiRequest<AuthTokenResponse>('/auth/login', { method: 'POST', body }),

  register: (body: { email: string; password: string; fullName: string; phoneNumber?: string }) =>
    apiRequest<UserResponse>('/api/users/register', { method: 'POST', body }),

  logout: () =>
    apiRequest<MessageResponse>('/auth/logout', { method: 'POST', body: {} }),

  me: () => apiRequest<UserResponse>('/api/users/me', { auth: true }),

  forgotPassword: (email: string) =>
    apiRequest<MessageResponse>('/auth/forgot-password', { method: 'POST', body: { email } }),

  resetPassword: (body: { token: string; newPassword: string }) =>
    apiRequest<MessageResponse>('/auth/reset-password', { method: 'POST', body }),

  /**
   * Begin OAuth redirect. No-op BE yet — only navigates when `VITE_OAUTH_ENABLED=true`.
   * When BE lands, point `authorizeUrl` at the real authorize endpoint; keep AuthPage unchanged.
   */
  startOAuth(provider: SocialProvider): void {
    if (!OAUTH_ENABLED) {
      throw new Error(`Đăng nhập với ${provider} chưa được hỗ trợ.`)
    }
    const path = OAUTH_PROVIDER_PATH[provider]
    const redirectUri = `${window.location.origin}/auth/oauth/callback`
    const authorizeUrl = `${API_BASE_URL}/auth/oauth/${path}/authorize?redirect_uri=${encodeURIComponent(redirectUri)}`
    window.location.assign(authorizeUrl)
  },

  /**
   * Exchange OAuth callback params for session tokens.
   * Stub: never invents tokens. Wire to BE when available.
   */
  async handleOAuthCallback(params: URLSearchParams): Promise<AuthTokenResponse> {
    void params
    if (!OAUTH_ENABLED) {
      throw new Error('Đăng nhập mạng xã hội chưa được hỗ trợ.')
    }
    // When BE is ready: exchange code/state → AuthTokenResponse (never invent tokens client-side).
    throw new Error('OAuth callback chưa nối backend. Bật endpoint rồi cập nhật authApi.handleOAuthCallback.')
  },
}
