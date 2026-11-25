import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { API_BASE_URL } from './env'
import { HttpError, apiRequest, clearAccessToken, onSessionExpired, setAccessToken } from './httpClient'

const fetchMock = vi.fn<typeof fetch>()
const REFRESH_URL = `${API_BASE_URL}/auth/refresh`

function json(value: unknown, status: number) {
  return new Response(JSON.stringify(value), { status, headers: { 'Content-Type': 'application/json' } })
}

function bearerOf(init: RequestInit | undefined): string | undefined {
  const headers = init?.headers as Record<string, string> | undefined
  return headers?.Authorization
}

/** Expired token → 401; the refresh endpoint hands out `second-token`; anything with a fresh token succeeds. */
function serveWithExpiredFirstToken(refreshStatus = 200) {
  fetchMock.mockImplementation(async (input, init) => {
    const url = String(input)
    if (url === REFRESH_URL) {
      return refreshStatus === 200
        ? json({ accessToken: 'second-token' }, 200)
        : json({ message: 'Refresh token không hợp lệ' }, refreshStatus)
    }
    if (bearerOf(init) === 'Bearer first-token') return json({ message: 'expired' }, 401)
    return json({ ok: true, url }, 200)
  })
}

function refreshCalls() {
  return fetchMock.mock.calls.filter(([input]) => String(input) === REFRESH_URL).length
}

describe('apiRequest session refresh', () => {
  beforeEach(() => {
    fetchMock.mockReset()
    vi.stubGlobal('fetch', fetchMock)
    setAccessToken('first-token')
  })
  afterEach(() => {
    clearAccessToken()
    onSessionExpired(null)
    vi.unstubAllGlobals()
  })

  it('refreshes once on 401 and retries the same request with the new token', async () => {
    serveWithExpiredFirstToken()

    const result = await apiRequest<{ ok: boolean }>('/api/users/me/sessions', { auth: true })

    expect(result.ok).toBe(true)
    expect(refreshCalls()).toBe(1)
    const retry = fetchMock.mock.calls.at(-1)?.[1]
    expect(bearerOf(retry)).toBe('Bearer second-token')
  })

  it('shares one refresh between concurrent requests that all got 401', async () => {
    serveWithExpiredFirstToken()

    const results = await Promise.all([
      apiRequest<{ ok: boolean }>('/api/a', { auth: true }),
      apiRequest<{ ok: boolean }>('/api/b', { auth: true }),
      apiRequest<{ ok: boolean }>('/api/c', { auth: true }),
    ])

    expect(results.every((result) => result.ok)).toBe(true)
    expect(refreshCalls()).toBe(1)
  })

  it('ends the session and rejects with 401 when the refresh itself is refused', async () => {
    serveWithExpiredFirstToken(401)
    const expired = vi.fn()
    onSessionExpired(expired)

    const failure = await apiRequest('/api/users/me/sessions', { auth: true }).catch((reason: unknown) => reason)

    expect(failure).toBeInstanceOf(HttpError)
    expect((failure as HttpError).status).toBe(401)
    expect(expired).toHaveBeenCalled()
  })
})
