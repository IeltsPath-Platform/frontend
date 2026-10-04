import { useEffect } from 'react'
import type { ReviewRef } from '~types/learningPath'
import { USE_MOCK_LEARNING } from '@/lib/env'
import { setPendingReviews } from './reviewGate'

/**
 * Applies pending reviews after a settled load.
 * Topic detail now hydrates from GET /reviews; empty arrays clear the banner.
 * Lesson payloads still send [] on HTTP — skip those so a REVIEW_REQUIRED banner survives.
 */
export function useSyncPendingReviews(reviews: ReviewRef[] | undefined, options?: { allowClear?: boolean }) {
  const allowClear = options?.allowClear ?? USE_MOCK_LEARNING
  useEffect(() => {
    if (reviews === undefined) return
    if (reviews.length > 0 || allowClear) setPendingReviews(reviews)
  }, [reviews, allowClear])
}
