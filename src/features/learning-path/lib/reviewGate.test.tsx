import { renderHook } from '@testing-library/react'
import { afterEach, expect, it } from 'vitest'
import { setPendingReviews, usePendingReviews } from './reviewGate'

afterEach(() => setPendingReviews([]))

it('keeps optional reviews out of the blocking learning gate', () => {
  const review = { reviewId: 'required', knowledgePointCode: 'KP', knowledgePointTitle: 'Point' }
  setPendingReviews([{ ...review, reviewId: 'optional', blocking: false }, { ...review, blocking: true }, { ...review, reviewId: 'legacy' }])
  const { result } = renderHook(usePendingReviews)
  expect(result.current.map((item) => item.reviewId)).toEqual(['required', 'legacy'])
})
