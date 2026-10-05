import { useSyncExternalStore } from 'react'
import type { ReviewRef } from '~types/learningPath'
import type { ApiError } from '../api/apiError'

const NO_REVIEWS: ReviewRef[] = []
let pending: ReviewRef[] = NO_REVIEWS
const listeners = new Set<() => void>()

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

const getSnapshot = () => pending

/** Reviews that block the learning flow, fed by 403 REVIEW_REQUIRED and by lesson/topic responses. */
export function usePendingReviews() {
  return useSyncExternalStore(subscribe, getSnapshot, () => NO_REVIEWS)
}

export function setPendingReviews(reviews: ReviewRef[]) {
  pending = reviews.length === 0 ? NO_REVIEWS : reviews
  listeners.forEach((listener) => listener())
}

export function resolvePendingReview(reviewId: string) {
  setPendingReviews(pending.filter((review) => review.reviewId !== reviewId))
}

export function reportApiError(error: ApiError) {
  if (error.code === 'REVIEW_REQUIRED' && error.details.reviews?.length) setPendingReviews(error.details.reviews)
}
