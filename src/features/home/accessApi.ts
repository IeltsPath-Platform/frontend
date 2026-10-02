import { z } from 'zod'

const count = z.number().int().nonnegative().safe()
const timestamp = z.string().datetime({ offset: true })

const subscriptionSchema = z.object({
  id: z.string(),
  userId: z.string(),
  planId: z.string(),
  planCode: z.string(),
  planName: z.string(),
  status: z.enum(['ACTIVE', 'EXPIRED', 'CANCELLED']),
  startsAt: timestamp,
  endsAt: timestamp.nullable(),
  humanGradingCreditsTotal: count,
  humanGradingCreditsUsed: count,
  remainingCredits: count,
  createdAt: timestamp,
  updatedAt: timestamp,
})

const walletSchema = z.object({
  userId: z.string(),
  balance: count,
  totalCredited: count,
  totalDebited: count,
  updatedAt: timestamp,
})

const activationSchema = z.object({
  activationId: z.string(),
  keyId: z.string(),
  userId: z.string(),
  productType: z.enum(['POINTS', 'PREMIUM']),
  pointsGranted: count,
  premiumDaysGranted: count,
  humanGradingCreditsGranted: count,
  activatedAt: timestamp,
  newBalance: count.nullable(),
  subscriptionEndsAt: timestamp.nullable(),
})

export type Subscription = z.infer<typeof subscriptionSchema>
export type PointWallet = z.infer<typeof walletSchema>
export type ActivationResult = z.infer<typeof activationSchema>

export class AccessApiError extends Error {
  readonly status: number

  constructor(message: string, status: number) {
    super(message)
    this.name = 'AccessApiError'
    this.status = status
  }
}

const KEY_ERROR_MESSAGES: Record<string, string> = {
  'Activation key has already been redeemed': 'Mã này đã được sử dụng.',
  'Activation key has expired': 'Mã kích hoạt đã hết hạn.',
  'Activation key has been revoked': 'Mã kích hoạt đã bị thu hồi.',
  'Mã kích hoạt không hợp lệ': 'Mã kích hoạt không hợp lệ. Vui lòng kiểm tra lại mã.',
}

async function getErrorMessage(response: Response, activating: boolean): Promise<string> {
  if (response.status === 401) return 'Phiên đăng nhập đã hết hạn hoặc chưa hợp lệ. Vui lòng đăng nhập lại.'
  if (response.status === 403) return 'Tài khoản của bạn chưa được phép thực hiện thao tác này.'
  if (response.status === 429) return 'Bạn thao tác quá nhanh. Vui lòng chờ một chút rồi thử lại.'
  if (response.status >= 500) return 'Dịch vụ tạm thời gián đoạn. Vui lòng thử lại sau.'

  const body: unknown = await response.json().catch(() => null)
  const error = z.object({ message: z.string() }).safeParse(body)
  if (activating && error.success && KEY_ERROR_MESSAGES[error.data.message]) {
    return KEY_ERROR_MESSAGES[error.data.message]
  }
  return activating
    ? 'Chưa thể kích hoạt mã. Vui lòng kiểm tra mã và thử lại.'
    : 'Chưa thể tải thông tin gói và ví điểm. Vui lòng thử lại.'
}

export function normalizeActivationKey(rawKey: string): string {
  return rawKey.trim().toUpperCase()
}

/** Requires a real gateway access token; demo login state cannot authorize requests. */
export function createAccessClient({
  baseUrl,
  accessToken,
  fetcher = fetch,
}: { baseUrl: string; accessToken: string; fetcher?: typeof fetch }) {
  const apiBase = baseUrl.replace(/\/+$/, '')

  async function request(path: string, init: RequestInit = {}): Promise<Response> {
    if (!accessToken.trim()) throw new AccessApiError('Vui lòng đăng nhập để sử dụng mã kích hoạt.', 401)
    const response = await fetcher(`${apiBase}/api/access/me/${path}`, {
      ...init,
      cache: 'no-store',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: 'application/json',
        ...(init.body ? { 'Content-Type': 'application/json' } : {}),
      },
    })
    if (!response.ok) throw new AccessApiError(await getErrorMessage(response, path === 'keys/activate'), response.status)
    return response
  }

  async function parse<T>(response: Response, schema: z.ZodType<T>): Promise<T> {
    const body: unknown = await response.json().catch(() => null)
    const parsed = schema.safeParse(body)
    if (!parsed.success) {
      throw new AccessApiError('Dịch vụ trả về dữ liệu chưa hợp lệ. Vui lòng tải lại thông tin trước khi tiếp tục.', response.status)
    }
    return parsed.data
  }

  return {
    async getSubscription(signal?: AbortSignal): Promise<Subscription | null> {
      const response = await request('subscription', { signal })
      return response.status === 204 ? null : parse(response, subscriptionSchema)
    },
    async getWallet(signal?: AbortSignal): Promise<PointWallet> {
      return parse(await request('points', { signal }), walletSchema)
    },
    async activateKey(rawKey: string, idempotencyKey: string): Promise<ActivationResult> {
      const normalizedKey = normalizeActivationKey(rawKey)
      if (!normalizedKey) throw new AccessApiError('Vui lòng nhập mã kích hoạt.', 400)
      if (!idempotencyKey.trim()) throw new AccessApiError('Chưa thể tạo yêu cầu kích hoạt. Vui lòng thử lại.', 400)
      return parse(await request('keys/activate', {
        method: 'POST',
        body: JSON.stringify({ rawKey: normalizedKey, idempotencyKey }),
      }), activationSchema)
    },
  }
}

export type AccessClient = ReturnType<typeof createAccessClient>

export function isActivePremium(subscription: Subscription | null, now = Date.now()): boolean {
  return subscription?.planCode === 'PREMIUM' && subscription.status === 'ACTIVE'
    && (subscription.endsAt === null || Date.parse(subscription.endsAt) > now)
}
