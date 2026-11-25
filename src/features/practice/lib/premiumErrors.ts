import { HttpError } from '@/lib/httpClient'

export function isPremiumRequired(error: unknown): error is HttpError {
  if (!(error instanceof HttpError) || error.status !== 403) return false
  const body = error.body as { details?: { code?: string } } | null
  return body?.details?.code === 'PREMIUM_REQUIRED'
}

export function isEntitlementUnavailable(error: unknown): error is HttpError {
  if (!(error instanceof HttpError) || error.status !== 503) return false
  const body = error.body as { details?: { code?: string } } | null
  return body?.details?.code === 'ENTITLEMENT_UNAVAILABLE'
}
