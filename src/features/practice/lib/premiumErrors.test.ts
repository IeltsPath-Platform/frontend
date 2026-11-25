import { describe, expect, it } from 'vitest'
import { HttpError } from '@/lib/httpClient'
import { isEntitlementUnavailable, isPremiumRequired } from './premiumErrors'

describe('Premium practice API errors', () => {
  it('recognizes the structured Premium denial', () => {
    const error = new HttpError(403, 'upgrade', { details: { code: 'PREMIUM_REQUIRED' } })
    expect(isPremiumRequired(error)).toBe(true)
    expect(isEntitlementUnavailable(error)).toBe(false)
  })

  it('recognizes an unavailable entitlement lookup', () => {
    const error = new HttpError(503, 'try later', { details: { code: 'ENTITLEMENT_UNAVAILABLE' } })
    expect(isEntitlementUnavailable(error)).toBe(true)
    expect(isPremiumRequired(error)).toBe(false)
  })
})
