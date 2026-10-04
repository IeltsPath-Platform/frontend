import { API_BASE_URL, REQUEST_TIMEOUT_MS } from './env'

type ErrorBody = {
  status?: number
  message?: string
  detail?: string
  code?: string
  path?: string
  details?: Record<string, string> | null
  reviews?: unknown
}

export class HttpError extends Error {
  readonly status: number
  readonly body: unknown
  readonly code: string | null

  constructor(status: number, message: string, body: unknown = null, code: string | null = null) {
    super(message)
    this.name = 'HttpError'
    this.status = status
    this.body = body
    this.code = code
  }

  get isNetworkError() {
    return this.status === 0
  }
}

type RequestOptions = {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'
  body?: unknown
  auth?: boolean
  signal?: AbortSignal
  /** Override default REQUEST_TIMEOUT_MS (e.g. writing grade ≥60s). */
  timeoutMs?: number
}

type TokenPair = { accessToken: string; refreshToken?: string }

const NETWORK_ERROR_MESSAGE = 'Không kết nối được máy chủ. Kiểm tra mạng hoặc địa chỉ API.'
const FALLBACK_ERROR_MESSAGE = 'Có lỗi xảy ra, vui lòng thử lại.'

/** Access token lives in memory only; refresh relies on HttpOnly cookie. */
let accessToken: string | null = null
let sessionExpiredListener: (() => void) | null = null
let refreshInFlight: Promise<string | null> | null = null

export function getAccessToken() {
  return accessToken
}

export function setAccessToken(token: string | null) {
  accessToken = token
}

export function clearAccessToken() {
  accessToken = null
}

export function onSessionExpired(listener: (() => void) | null) {
  sessionExpiredListener = listener
}

async function send(path: string, options: RequestOptions, bearer?: string | null): Promise<Response> {
  const headers: Record<string, string> = { Accept: 'application/json' }
  if (options.body !== undefined) headers['Content-Type'] = 'application/json'
  if (bearer) headers.Authorization = `Bearer ${bearer}`

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), options.timeoutMs ?? REQUEST_TIMEOUT_MS)
  options.signal?.addEventListener('abort', () => controller.abort())

  try {
    return await fetch(`${API_BASE_URL}${path}`, {
      method: options.method ?? 'GET',
      headers,
      body: options.body === undefined ? undefined : JSON.stringify(options.body),
      credentials: 'include',
      signal: controller.signal,
    })
  } catch {
    throw new HttpError(0, NETWORK_ERROR_MESSAGE)
  } finally {
    clearTimeout(timeout)
  }
}

function safeJson(text: string): unknown {
  try {
    return JSON.parse(text)
  } catch {
    return null
  }
}

async function parse<T>(response: Response): Promise<T> {
  const text = await response.text()
  const data = text ? safeJson(text) : null

  if (!response.ok) {
    const body = (data ?? {}) as ErrorBody
    const message = body.detail || body.message || FALLBACK_ERROR_MESSAGE
    throw new HttpError(response.status, message, data, body.code ?? null)
  }
  return data as T
}

async function refreshAccessToken(): Promise<string | null> {
  try {
    // Cookie-first: empty body lets the gateway/user-service read refresh_token cookie.
    const response = await send('/auth/refresh', { method: 'POST', body: {} })
    const pair = await parse<TokenPair>(response)
    accessToken = pair.accessToken
    return pair.accessToken
  } catch (error) {
    if (error instanceof HttpError && error.isNetworkError) throw error
    accessToken = null
    return null
  }
}

function refreshOnce() {
  refreshInFlight ??= refreshAccessToken().finally(() => {
    refreshInFlight = null
  })
  return refreshInFlight
}

export async function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  if (!options.auth) return parse<T>(await send(path, options))

  const current = accessToken
  if (!current) {
    const refreshed = await refreshOnce()
    if (!refreshed) {
      sessionExpiredListener?.()
      throw new HttpError(401, 'Phiên đăng nhập đã hết hạn.')
    }
    return parse<T>(await send(path, options, refreshed))
  }

  const response = await send(path, options, current)
  if (response.status !== 401) return parse<T>(response)

  const latest = accessToken
  const refreshed = latest && latest !== current ? latest : await refreshOnce()
  if (!refreshed) {
    sessionExpiredListener?.()
    throw new HttpError(401, 'Phiên đăng nhập đã hết hạn, vui lòng đăng nhập lại.')
  }
  const retry = await send(path, options, refreshed)
  if (retry.status === 401) {
    accessToken = null
    sessionExpiredListener?.()
    throw new HttpError(401, 'Phiên đăng nhập đã hết hạn, vui lòng đăng nhập lại.')
  }
  return parse<T>(retry)
}

/** Boot helper: try cookie refresh without throwing on failure. */
export async function tryRestoreSession(): Promise<boolean> {
  if (accessToken) return true
  const token = await refreshOnce()
  return token !== null
}
