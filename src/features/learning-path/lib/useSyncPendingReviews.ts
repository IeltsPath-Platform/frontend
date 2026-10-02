import { useEffect } from 'react'
import type { ReviewRef } from '~types/learningPath'
import { USE_MOCK_LEARNING } from '@/lib/env'
import { setPendingReviews } from './reviewGate'

/** Applies pending reviews only after a settled load so cancelled navigations cannot revive a cleared banner. */
export function useSyncPendingReviews(reviews: ReviewRef[] | undefined) {
  useEffect(() => {
    if (reviews === undefined) return
    // HTTP adapters always return []; clearing would wipe a REVIEW_REQUIRED banner.
    if (reviews.length > 0 || USE_MOCK_LEARNING) setPendingReviews(reviews)
  }, [reviews])
}
