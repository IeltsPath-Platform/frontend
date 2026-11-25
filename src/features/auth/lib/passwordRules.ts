import { HttpError } from '@/lib/httpClient'

export const PASSWORD_MIN_LENGTH = 8
export const PASSWORD_MAX_LENGTH = 72

export const PASSWORD_LENGTH_HINT = 'Từ 8 đến 72 ký tự.'
export const PASSWORD_LENGTH_PLACEHOLDER = 'Từ 8 đến 72 ký tự'
export const PASSWORD_MISMATCH_MESSAGE = 'Mật khẩu xác nhận không khớp.'
export const PASSWORD_LENGTH_MESSAGE = 'Mật khẩu phải có từ 8 đến 72 ký tự.'

/** Stable backend code for a new password the server refuses; the reasons come in `details.reasons`. */
export const WEAK_PASSWORD_CODE = 'WEAK_PASSWORD'

const WEAK_PASSWORD_REASON_MESSAGES: Record<string, string> = {
  TOO_SHORT: `Mật khẩu phải có ít nhất ${PASSWORD_MIN_LENGTH} ký tự.`,
  TOO_COMMON: 'Mật khẩu này quá phổ biến, hãy chọn mật khẩu khác.',
  CONTAINS_ACCOUNT_INFO: 'Mật khẩu không được chứa email, họ tên hoặc số điện thoại của bạn.',
  TOO_SIMPLE: 'Mật khẩu quá đơn giản, tránh chuỗi lặp hoặc liên tiếp (như 12345678).',
}

export function isPasswordLengthValid(password: string): boolean {
  return password.length >= PASSWORD_MIN_LENGTH && password.length <= PASSWORD_MAX_LENGTH
}

type ErrorBody = {
  message?: string
  detail?: string
  details?: Record<string, string> | null
}

export function isWeakPasswordError(error: unknown): error is HttpError {
  return error instanceof HttpError && error.code === WEAK_PASSWORD_CODE
}

/**
 * Sentence(s) for a `WEAK_PASSWORD` response, one per reason the server named. A reason this client does not know is
 * skipped; when none is known, the server message is shown instead.
 */
export function weakPasswordMessage(error: HttpError): string {
  const known = readWeakPasswordReasons(error)
    .map((reason) => WEAK_PASSWORD_REASON_MESSAGES[reason])
    .filter((message): message is string => Boolean(message))
  if (known.length > 0) return known.join(' ')
  const body = (error.body ?? {}) as ErrorBody
  return (body.detail || body.message || error.message || PASSWORD_LENGTH_MESSAGE).trim()
}

/** The backend sends `details.reasons` as one comma-separated string; a list is accepted too. */
function readWeakPasswordReasons(error: HttpError): string[] {
  const raw: unknown = (error.body as ErrorBody | null)?.details?.reasons
  if (Array.isArray(raw)) return raw.map((item) => String(item).trim()).filter(Boolean)
  if (typeof raw === 'string') return raw.split(',').map((item) => item.trim()).filter(Boolean)
  return []
}

/** Prefer BE field-level password validation, then map generic 400 length errors. */
export function mapAuthPasswordHttpError(error: unknown, fallback: string): string {
  if (!(error instanceof HttpError)) return fallback

  const body = (error.body ?? {}) as ErrorBody
  const fieldMessage =
    body.details?.password
    ?? body.details?.newPassword
    ?? body.details?.confirmPassword
  if (typeof fieldMessage === 'string' && fieldMessage.trim()) {
    return fieldMessage.trim()
  }

  const raw = (body.detail || body.message || error.message || '').trim()
  if (
    error.status === 400
    && /password|mật khẩu|ký tự|8|72/i.test(raw)
  ) {
    if (/8.*72|72.*8|từ 8|8 đến 72/i.test(raw)) return raw
    return PASSWORD_LENGTH_MESSAGE
  }

  return raw || fallback
}
