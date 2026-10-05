import assert from 'node:assert/strict'
import { test } from 'node:test'
import {
  AccessApiError,
  createAccessClient,
  isActivePremium,
  normalizeActivationKey,
  type Subscription,
} from '../src/features/home/accessApi.ts'

const subscription: Subscription = {
  id: 'test-subscription',
  userId: 'test-user',
  planId: 'test-plan',
  planCode: 'PREMIUM',
  planName: 'Premium',
  status: 'ACTIVE',
  startsAt: '2026-10-01T00:00:00Z',
  endsAt: '2026-10-31T00:00:00Z',
  humanGradingCreditsTotal: 4,
  humanGradingCreditsUsed: 1,
  remainingCredits: 3,
  createdAt: '2026-10-01T00:00:00Z',
  updatedAt: '2026-10-01T00:00:00Z',
}

const pointsActivation = {
  activationId: 'test-activation',
  keyId: 'test-key-id',
  userId: 'test-user',
  productType: 'POINTS',
  pointsGranted: 50,
  premiumDaysGranted: 0,
  humanGradingCreditsGranted: 0,
  activatedAt: '2026-10-01T00:00:00Z',
  newBalance: 75,
  subscriptionEndsAt: null,
}

function setup(response: () => Response, accessToken = 'test-only-access-token') {
  const requests: { url: string; init: RequestInit }[] = []
  const fetcher: typeof fetch = async (input, init = {}) => {
    requests.push({ url: String(input), init })
    return response()
  }
  const client = createAccessClient({ baseUrl: 'https://gateway.example.test///', accessToken, fetcher })
  return { client, requests }
}

function hasApiError(status: number, message?: string) {
  return (error: unknown) => {
    assert.ok(error instanceof AccessApiError)
    assert.equal(error.status, status)
    if (message) assert.equal(error.message, message)
    return true
  }
}

test('subscription and points reads use the gateway routes and bearer authorization', async () => {
  const subscriptionRequest = setup(() => Response.json(subscription))
  assert.deepEqual(await subscriptionRequest.client.getSubscription(), subscription)
  const wallet = {
    userId: 'test-user',
    balance: 75,
    totalCredited: 100,
    totalDebited: 25,
    updatedAt: '2026-10-01T00:00:00Z',
  }
  const walletRequest = setup(() => Response.json(wallet))
  assert.deepEqual(await walletRequest.client.getWallet(), wallet)

  for (const [request, path] of [
    [subscriptionRequest.requests[0], 'subscription'],
    [walletRequest.requests[0], 'points'],
  ] as const) {
    assert.equal(request.url, `https://gateway.example.test/api/access/me/${path}`)
    assert.equal(request.init.method ?? 'GET', 'GET')
    assert.equal(request.init.cache, 'no-store')
    const headers = new Headers(request.init.headers)
    assert.equal(headers.get('Authorization'), 'Bearer test-only-access-token')
    assert.equal(headers.get('Accept'), 'application/json')
    assert.equal(request.init.body, undefined)
  }
})

test('empty access tokens prevent all requests', async () => {
  const { client, requests } = setup(() => Response.json(pointsActivation), ' \t ')
  await assert.rejects(client.getSubscription(), hasApiError(401))
  await assert.rejects(client.getWallet(), hasApiError(401))
  await assert.rejects(client.activateKey('test-key', 'test-retry-id'), hasApiError(401))
  assert.equal(requests.length, 0)
})

test('blank activation codes and blank idempotency keys prevent a POST', async () => {
  const { client, requests } = setup(() => Response.json(pointsActivation))
  await assert.rejects(client.activateKey(' \n\t ', 'test-retry-id'), hasApiError(400))
  await assert.rejects(client.activateKey('test-key', '   '), hasApiError(400))
  assert.equal(requests.length, 0)
})

test('activation accepts legacy and IP keys, preserving internal characters and retry identity', async () => {
  const { client, requests } = setup(() => Response.json(pointsActivation))
  const retryId = ' retry-id-KeepCase '
  for (const [input, normalized] of [
    ['  legacy-key_123  ', 'LEGACY-KEY_123'],
    ['  ip-ab12-cd34  ', 'IP-AB12-CD34'],
    ['  ip-ab 12_cd  ', 'IP-AB 12_CD'],
  ]) {
    assert.equal(normalizeActivationKey(input), normalized)
    assert.deepEqual(await client.activateKey(input, retryId), pointsActivation)
    const request = requests.at(-1)!
    assert.equal(request.url, 'https://gateway.example.test/api/access/me/keys/activate')
    assert.equal(request.init.method, 'POST')
    assert.deepEqual(JSON.parse(String(request.init.body)), { rawKey: normalized, idempotencyKey: retryId })
    const headers = new Headers(request.init.headers)
    assert.equal(headers.get('Authorization'), 'Bearer test-only-access-token')
    assert.equal(headers.get('Content-Type'), 'application/json')
  }
})

test('a retried activation transmits the same caller-provided idempotency key', async () => {
  const { client, requests } = setup(() => Response.json(pointsActivation))
  await client.activateKey('test-key', 'same-retry-id')
  await client.activateKey('test-key', 'same-retry-id')
  assert.equal(requests.length, 2)
  assert.deepEqual(requests[0].init.body, requests[1].init.body)
})

test('204 means no subscription while 401 stays an authentication error', async () => {
  const free = setup(() => new Response(null, { status: 204 }))
  assert.equal(await free.client.getSubscription(), null)
  const unauthorized = setup(() => new Response(null, { status: 401 }))
  await assert.rejects(unauthorized.client.getSubscription(), hasApiError(401))
})

test('used, expired, and revoked keys show translated errors', async () => {
  for (const [backendMessage, translated] of [
    ['Activation key has already been redeemed', 'Mã này đã được sử dụng.'],
    ['Activation key has expired', 'Mã kích hoạt đã hết hạn.'],
    ['Activation key has been revoked', 'Mã kích hoạt đã bị thu hồi.'],
  ]) {
    const { client } = setup(() => Response.json({ message: backendMessage }, { status: 400 }))
    await assert.rejects(client.activateKey('test-key', 'test-retry-id'), hasApiError(400, translated))
  }
})

test('HTML returned with status 200 is rejected by all response boundaries', async () => {
  const { client } = setup(() => new Response('<html>Gateway fallback</html>', {
    status: 200, headers: { 'Content-Type': 'text/html' },
  }))
  await assert.rejects(client.getSubscription(), hasApiError(200))
  await assert.rejects(client.getWallet(), hasApiError(200))
  await assert.rejects(client.activateKey('test-key', 'test-retry-id'), hasApiError(200))
})

test('wrapped or malformed JSON cannot become valid access information', async () => {
  const wrapped = setup(() => Response.json({ data: subscription }))
  await assert.rejects(wrapped.client.getSubscription(), hasApiError(200))
  const wallet = setup(() => Response.json({
    userId: 'test-user',
    balance: -1,
    totalCredited: 0,
    totalDebited: 0,
    updatedAt: '2026-10-01T00:00:00Z',
  }))
  await assert.rejects(wallet.client.getWallet(), hasApiError(200))
  const activation = setup(() => Response.json({ ...pointsActivation, activatedAt: 'invalid-date' }))
  await assert.rejects(activation.client.activateKey('test-key', 'test-retry-id'), hasApiError(200))
})

test('a points activation leaves the authoritative subscription absent', async () => {
  let responses = 0
  const { client } = setup(() => ++responses === 1
    ? Response.json(pointsActivation)
    : new Response(null, { status: 204 }))
  const activated = await client.activateKey('test-points-key', 'test-retry-id')
  assert.equal(activated.productType, 'POINTS')
  assert.equal(activated.premiumDaysGranted, 0)
  assert.equal(activated.humanGradingCreditsGranted, 0)
  assert.equal(activated.subscriptionEndsAt, null)
  assert.equal(isActivePremium(await client.getSubscription()), false)
})

test('Premium eligibility respects status, plan, and the exact expiry boundary', () => {
  const expiration = Date.parse(subscription.endsAt!)
  assert.equal(isActivePremium(subscription, expiration - 1), true)
  assert.equal(isActivePremium(subscription, expiration), false)
  assert.equal(isActivePremium(subscription, expiration + 1), false)
  assert.equal(isActivePremium({ ...subscription, status: 'EXPIRED' }, expiration - 1), false)
  assert.equal(isActivePremium({ ...subscription, status: 'CANCELLED' }, expiration - 1), false)
  assert.equal(isActivePremium({ ...subscription, endsAt: null }, expiration + 1), true)
  assert.equal(isActivePremium({ ...subscription, planCode: 'FREE' }, expiration - 1), false)
  assert.equal(isActivePremium(null, expiration - 1), false)
})

test('subscription and wallet reads forward cancellation without swallowing AbortError', async () => {
  const controller = new AbortController()
  const fetcher: typeof fetch = async (_input, init) => {
    assert.equal(init?.signal, controller.signal)
    return new Promise<Response>((_resolve, reject) => {
      init?.signal?.addEventListener('abort', () => reject(init.signal?.reason), { once: true })
    })
  }
  const client = createAccessClient({ baseUrl: '', accessToken: 'test-only-access-token', fetcher })
  const subscriptionRead = assert.rejects(client.getSubscription(controller.signal), { name: 'AbortError' })
  const walletRead = assert.rejects(client.getWallet(controller.signal), { name: 'AbortError' })
  controller.abort()
  await Promise.all([subscriptionRead, walletRead])
})
