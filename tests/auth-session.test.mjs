import assert from 'node:assert/strict'
import { after, afterEach, before, beforeEach, describe, test } from 'node:test'
import { createServer } from 'vite'

const API_BASE_URL = 'https://auth.example.test'
const credentials = { email: 'learner@example.test', password: 'test-password' }
const user = {
  id: 'test-user',
  email: credentials.email,
  fullName: 'Test Learner',
  phoneNumber: null,
  status: 'ACTIVE',
  roles: [],
}
const points = { userId: user.id, balance: 25, totalCredited: 25, totalDebited: 0 }
let server
let authSession
let httpClient

before(async () => {
  server = await createServer({
    envDir: false,
    define: { 'import.meta.env.VITE_API_BASE_URL': JSON.stringify(API_BASE_URL) },
    server: { middlewareMode: true },
    appType: 'custom',
  })
  httpClient = await server.ssrLoadModule('/src/lib/httpClient.ts')
  authSession = await server.ssrLoadModule('/src/features/auth/authSession.ts')
})

beforeEach(() => authSession.clearAuthSession())
afterEach(() => authSession.clearAuthSession())
after(async () => { await server?.close() })

function mockResponses(t, responses) {
  const calls = []
  t.mock.method(globalThis, 'fetch', async (url, options) => {
    const response = responses[calls.length]
    calls.push({
      path: String(url).replace(API_BASE_URL, ''),
      method: options.method,
      body: options.body === undefined ? undefined : JSON.parse(options.body),
      bearer: new Headers(options.headers).get('Authorization'),
      credentials: options.credentials,
    })
    if (!response) throw new Error(`Unexpected request: ${url}`)
    if (response instanceof Error) throw response
    return Response.json(response.body, { status: response.status ?? 200 })
  })
  return calls
}

function request(path, method = 'GET', body, token) {
  return { path, method, body, bearer: token ? `Bearer ${token}` : null, credentials: 'include' }
}

describe('backend auth session', { concurrency: false }, () => {
  test('password login loads the backend user and points with bearer and cookies', async (t) => {
    const calls = mockResponses(t, [
      { body: { accessToken: 'test-access-token' } },
      { body: user },
      { body: points },
    ])

    assert.deepEqual(await authSession.loginWithPassword(credentials.email, credentials.password), user)
    assert.equal(httpClient.getAccessToken(), 'test-access-token')
    assert.deepEqual(calls, [
      request('/auth/login', 'POST', credentials),
      request('/api/users/me', 'GET', undefined, 'test-access-token'),
      request('/api/access/me/points', 'GET', undefined, 'test-access-token'),
    ])
  })

  test('registration completes before password login and user hydration', async (t) => {
    const input = { ...credentials, fullName: user.fullName }
    const calls = mockResponses(t, [
      { body: user },
      { body: { accessToken: 'test-registered-token' } },
      { body: user },
      { body: points },
    ])

    assert.deepEqual(await authSession.registerWithPassword(input), user)
    assert.equal(httpClient.getAccessToken(), 'test-registered-token')
    assert.deepEqual(calls, [
      request('/api/users/register', 'POST', input),
      request('/auth/login', 'POST', credentials),
      request('/api/users/me', 'GET', undefined, 'test-registered-token'),
      request('/api/access/me/points', 'GET', undefined, 'test-registered-token'),
    ])
  })

  test('rejected credentials propagate the backend error without creating a token', async (t) => {
    const calls = mockResponses(t, [{ status: 401, body: { message: 'Invalid credentials' } }])

    await assert.rejects(
      authSession.loginWithPassword(credentials.email, credentials.password),
      (error) => error instanceof httpClient.HttpError
        && error.status === 401 && error.message === 'Invalid credentials',
    )
    assert.equal(httpClient.getAccessToken(), null)
    assert.deepEqual(calls, [request('/auth/login', 'POST', credentials)])
  })

  test('logout clears the memory token when the backend request fails', async (t) => {
    httpClient.setAccessToken('test-existing-token')
    const calls = mockResponses(t, [new TypeError('Network unavailable')])

    await authSession.logoutSession()

    assert.equal(httpClient.getAccessToken(), null)
    assert.deepEqual(calls, [request('/auth/logout', 'POST', {})])
  })

  test('a protected 401 refreshes with cookies and retries with the refreshed bearer', async (t) => {
    const calls = mockResponses(t, [
      { body: { accessToken: 'test-expired-token' } },
      { status: 401, body: { message: 'Access token expired' } },
      { body: { accessToken: 'test-refreshed-token' } },
      { body: user },
      { body: points },
    ])

    assert.deepEqual(await authSession.loginWithPassword(credentials.email, credentials.password), user)
    assert.equal(httpClient.getAccessToken(), 'test-refreshed-token')
    assert.deepEqual(calls, [
      request('/auth/login', 'POST', credentials),
      request('/api/users/me', 'GET', undefined, 'test-expired-token'),
      request('/auth/refresh', 'POST', {}),
      request('/api/users/me', 'GET', undefined, 'test-refreshed-token'),
      request('/api/access/me/points', 'GET', undefined, 'test-refreshed-token'),
    ])
  })
})
