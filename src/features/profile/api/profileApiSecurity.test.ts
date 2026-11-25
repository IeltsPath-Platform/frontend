import { beforeEach, describe, expect, it, vi } from 'vitest'

const requestMock = vi.hoisted(() => vi.fn())
vi.mock('@/lib/httpClient', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/httpClient')>()),
  apiRequest: requestMock,
}))

import { profileApi } from './profileApi'

describe('profileApi security endpoints', () => {
  beforeEach(() => {
    requestMock.mockReset()
  })

  it('sends the reauth token in X-Reauth-Token when unlinking, and nothing extra without it', async () => {
    requestMock.mockResolvedValue(undefined)

    await profileApi.unlinkOAuthIdentity('google', 'reauth-token')
    expect(requestMock).toHaveBeenLastCalledWith('/api/users/me/oauth/google', expect.objectContaining({
      method: 'DELETE',
      headers: { 'X-Reauth-Token': 'reauth-token' },
    }))

    await profileApi.unlinkOAuthIdentity('google')
    expect(requestMock.mock.calls.at(-1)?.[1].headers).toBeUndefined()
  })

  it('posts a password or a Google ID token to reauth and parses the token it returns', async () => {
    requestMock.mockResolvedValue({ reauthToken: 'tok', expiresInSeconds: 300, method: 'PASSWORD' })

    const result = await profileApi.reauth({ currentPassword: 'current-pass' })

    expect(requestMock).toHaveBeenCalledWith('/api/users/me/reauth', expect.objectContaining({
      method: 'POST',
      body: { currentPassword: 'current-pass' },
    }))
    expect(result.reauthToken).toBe('tok')
  })

  it('rejects a reauth response without a token', async () => {
    requestMock.mockResolvedValue({ expiresInSeconds: 300, method: 'GOOGLE' })

    await expect(profileApi.reauth({ googleIdToken: 'id-token' })).rejects.toThrow()
  })

  it('sends the initial password with the reauth token in its header', async () => {
    requestMock.mockResolvedValue(undefined)

    await profileApi.setInitialPassword('New-pass-2026', 'tok')

    expect(requestMock).toHaveBeenCalledWith('/api/users/me/password/initial', expect.objectContaining({
      method: 'POST',
      body: { newPassword: 'New-pass-2026' },
      headers: { 'X-Reauth-Token': 'tok' },
    }))
  })

  it('reads the first page of the user\'s own security events', async () => {
    requestMock.mockResolvedValue({
      items: [{ id: 'e1', eventType: 'PASSWORD_CHANGED', ipAddress: '203.0.113.x', userAgent: null, createdAt: '2026-11-25T10:00:00', detail: {} }],
      page: 0, size: 50, total: 1,
    })

    const events = await profileApi.listSecurityEvents()

    expect(requestMock).toHaveBeenCalledWith('/api/users/me/security-events?page=0', expect.objectContaining({ auth: true }))
    expect(events).toEqual([expect.objectContaining({ id: 'e1', eventType: 'PASSWORD_CHANGED', ipAddress: '203.0.113.x' })])
  })

  it('rejects a security events response without items', async () => {
    requestMock.mockResolvedValue({ page: 0 })

    await expect(profileApi.listSecurityEvents()).rejects.toThrow()
  })

  it('lists sessions and ends one or all other sessions', async () => {
    requestMock.mockResolvedValueOnce([{ sessionId: 'family-1', current: null, userAgent: 'Chrome' }])
    const sessions = await profileApi.listSessions()
    expect(sessions[0].sessionId).toBe('family-1')

    requestMock.mockResolvedValueOnce(undefined)
    await profileApi.revokeSession('family/1')
    expect(requestMock).toHaveBeenLastCalledWith('/api/users/me/sessions/family%2F1', expect.objectContaining({ method: 'DELETE' }))

    requestMock.mockResolvedValueOnce(undefined)
    await profileApi.revokeOtherSessions()
    expect(requestMock).toHaveBeenLastCalledWith('/api/users/me/sessions?exceptCurrent=true', expect.objectContaining({ method: 'DELETE' }))
  })
})
