import { HttpError } from '@/lib/httpClient'

const FALLBACK_MESSAGE = 'Có lỗi xảy ra, vui lòng thử lại.'

interface ErrorBody {
  message?: string
  details?: Record<string, unknown>
}

function bodyOf(reason: unknown): ErrorBody {
  return reason instanceof HttpError && reason.body && typeof reason.body === 'object' ? (reason.body as ErrorBody) : {}
}

export function adminErrorMessage(reason: unknown): string {
  if (reason instanceof HttpError) return reason.message || FALLBACK_MESSAGE
  return FALLBACK_MESSAGE
}

/** The machine code content-service puts in `details.code` (for example `LESSON_NOT_PUBLISHABLE`). */
export function adminErrorCode(reason: unknown): string | null {
  const code = bodyOf(reason).details?.code
  if (typeof code === 'string') return code
  return reason instanceof HttpError ? reason.code : null
}

export function adminErrorDetails(reason: unknown): Record<string, unknown> {
  return bodyOf(reason).details ?? {}
}

export function isAbort(reason: unknown): boolean {
  return reason instanceof DOMException && reason.name === 'AbortError'
}
