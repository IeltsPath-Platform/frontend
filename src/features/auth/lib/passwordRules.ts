import { HttpError } from '@/lib/httpClient'

export const PASSWORD_MIN_LENGTH = 6
export const PASSWORD_MAX_LENGTH = 72

export const PASSWORD_LENGTH_HINT = 'Từ 6 đến 72 ký tự.'
export const PASSWORD_LENGTH_PLACEHOLDER = 'Từ 6 đến 72 ký tự'
export const PASSWORD_MISMATCH_MESSAGE = 'Mật khẩu xác nhận không khớp.'
export const PASSWORD_LENGTH_MESSAGE = 'Mật khẩu phải có từ 6 đến 72 ký tự.'

export function isPasswordLengthValid(password: string): boolean {
  return password.length >= PASSWORD_MIN_LENGTH && password.length <= PASSWORD_MAX_LENGTH
}

type ErrorBody = {
  message?: string
  detail?: string
  details?: Record<string, string> | null
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
    && /password|mật khẩu|ký tự|6|72/i.test(raw)
  ) {
    if (/6.*72|72.*6|từ 6|6 đến 72/i.test(raw)) return raw
    return PASSWORD_LENGTH_MESSAGE
  }

  return raw || fallback
}
