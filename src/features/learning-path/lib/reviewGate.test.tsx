import { renderHook } from '@testing-library/react'
import { afterEach, expect, it } from 'vitest'
import { reviewRefsFromSubmission, setPendingReviews, usePendingReviews } from './reviewGate'

afterEach(() => setPendingReviews([]))

it('keeps only the blocking reviews a Practice submission created in the gate', () => {
  const created = [
    { reviewId: 'suggested', knowledgePointId: 'kp-1', stage: 'PRACTICE' as const, blocking: false },
    { reviewId: 'required', knowledgePointId: 'kp-2', stage: 'THEORY' as const, blocking: true },
  ]
  const refs = reviewRefsFromSubmission(created, 'l1')
  expect(refs.map((ref) => ref.blocking)).toEqual([false, true])
  setPendingReviews(refs)
  const { result } = renderHook(usePendingReviews)
  expect(result.current.map((item) => item.reviewId)).toEqual(['required'])
})

it('keeps optional reviews out of the blocking learning gate', () => {
  const review = { reviewId: 'required', knowledgePointCode: 'KP', knowledgePointTitle: 'Point' }
  setPendingReviews([{ ...review, reviewId: 'optional', blocking: false }, { ...review, blocking: true }, { ...review, reviewId: 'legacy' }])
  const { result } = renderHook(usePendingReviews)
  expect(result.current.map((item) => item.reviewId)).toEqual(['required', 'legacy'])
})
