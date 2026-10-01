import { useEffect } from 'react'
import type { ReviewRef } from '~types/learningPath'
import { setPendingReviews } from './reviewGate'

/** Applies pending reviews only after a settled load so cancelled navigations cannot revive a cleared banner. */
export function useSyncPendingReviews(reviews: ReviewRef[] | undefined) {
  useEffect(() => {
    if (reviews) setPendingReviews(reviews)
  }, [reviews])
}
