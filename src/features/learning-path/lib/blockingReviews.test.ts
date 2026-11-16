import { describe, expect, it } from 'vitest'
import type { BasketOptionalItem, LearnerTree, ReviewBasket, TreeBlockingReview, TreePoint } from '~types/learningPath'
import { blockingReviewsOf, holdsBack, kindOf } from './blockingReviews'

const point = (id: string, blockingReview?: TreeBlockingReview): TreePoint => ({
  knowledgePointId: id, code: id, name: id, skill: 'READING', kind: null, cefrLevel: null, canDo: null, mastery: null, tier: null,
  evidenceCount: 0, nextReviewAt: null, prerequisiteIds: [], practiceAvailable: true, blockingReview,
})
const review = (extra: Partial<TreeBlockingReview>): TreeBlockingReview => ({
  reviewId: 'r', status: 'PENDING', lessonId: null, createdAt: null, doneAt: null, setsAnswered: 0, lastCorrect: null, lastTotal: null, ...extra,
})
const optional = (knowledgePointId: string, reviewId: string | null): BasketOptionalItem => ({
  knowledgePointId, code: knowledgePointId, name: knowledgePointId, skill: 'READING', tier: 'PRIORITY', mastery: 0.2, dueAt: null,
  reason: 'PRACTICE', hasUnrevealedSet: true, reviewId,
})
const tree = (...points: TreePoint[]): LearnerTree => ({ courseId: 'c', knowledgePoints: points })
const basket = (extra: Partial<ReviewBasket>): ReviewBasket => ({ required: [], consolidate: [], due: [], weak: [], ...extra })

describe('blockingReviewsOf', () => {
  it('takes the blocking reviews the tree carries, finished ones included', () => {
    const reviews = blockingReviewsOf(tree(point('a', review({ reviewId: 'r1', status: 'DONE' })), point('b')), null)
    expect(reviews.get('a')).toMatchObject({ reviewId: 'r1', status: 'DONE', blocking: true, knowledgePointId: 'a' })
    expect(reviews.has('b')).toBe(false)
  })

  it('fills in a pending blocking review from the basket when the tree does not carry it', () => {
    const reviews = blockingReviewsOf(tree(point('a')), basket({
      required: [{ reviewId: 'r2', knowledgePointId: 'a', code: 'a', name: 'a', lessonId: 'l1', skill: 'READING' }],
    }))
    expect(reviews.get('a')).toMatchObject({ reviewId: 'r2', status: 'PENDING', blocking: true, lessonId: 'l1' })
  })

  it('takes an optional review that exists as a suggestion, whichever list its point is in, and none that has not been made', () => {
    const reviews = blockingReviewsOf(tree(point('a'), point('b'), point('c'), point('d')), basket({
      weak: [optional('a', 'r3'), optional('d', null)],
      consolidate: [optional('b', 'r4')],
      due: [optional('c', 'r5')],
    }))
    expect(['a', 'b', 'c'].map((id) => reviews.get(id)?.reviewId)).toEqual(['r3', 'r4', 'r5'])
    expect(reviews.get('a')).toMatchObject({ status: 'PENDING', blocking: false })
    expect(reviews.has('d')).toBe(false)
  })

  it('never replaces a pending blocking review with a suggestion, and a pending suggestion replaces a finished blocking one', () => {
    const reviews = blockingReviewsOf(
      tree(point('held', review({ reviewId: 'blocking' })), point('finished', review({ reviewId: 'old', status: 'DONE' }))),
      basket({ weak: [optional('held', 'suggested-1'), optional('finished', 'suggested-2')] }),
    )
    expect(reviews.get('held')).toMatchObject({ reviewId: 'blocking', blocking: true })
    expect(reviews.get('finished')).toMatchObject({ reviewId: 'suggested-2', blocking: false })
  })

  it('is empty when nothing is known', () => {
    expect(blockingReviewsOf(null, null).size).toBe(0)
    expect(blockingReviewsOf(tree(point('a')), basket({})).size).toBe(0)
  })
})

describe('what a review is', () => {
  it('reads as suggested when it is optional, and holds the learner back only while a blocking one is pending', () => {
    const base = { reviewId: 'r', knowledgePointId: 'a', lessonId: null, createdAt: null, doneAt: null, setsAnswered: 0, lastCorrect: null, lastTotal: null }
    expect(kindOf({ blocking: true, status: 'PENDING' })).toBe('PENDING')
    expect(kindOf({ blocking: true, status: 'DONE' })).toBe('DONE')
    expect(kindOf({ blocking: false, status: 'PENDING' })).toBe('SUGGESTED')
    expect(holdsBack({ ...base, blocking: true, status: 'PENDING' })).toBe(true)
    expect(holdsBack({ ...base, blocking: false, status: 'PENDING' })).toBe(false)
    expect(holdsBack({ ...base, blocking: true, status: 'DONE' })).toBe(false)
    expect(holdsBack(undefined)).toBe(false)
  })
})
