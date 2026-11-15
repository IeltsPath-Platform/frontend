import { createContext, useContext } from 'react'
import type { BasketOptionalItem, LearnerTree, ReviewBasket, TreeBlockingReview } from '~types/learningPath'

/**
 * A review of a point that the map shows, with the point it is for. Mostly a blocking review, in whatever state; also the optional
 * review the system suggested (`blocking` false), which is always pending, never holds anything back and is not kept once done.
 */
export interface BlockingReviewInfo extends TreeBlockingReview {
  knowledgePointId: string
  /** False for a suggested review: the learner may do it or leave it, and nothing waits for it. */
  blocking: boolean
}

/** The reviews of the course's tree by the knowledge point each one is for. One for each point. */
export type BlockingReviews = ReadonlyMap<string, BlockingReviewInfo>

/** How a review reads on the map: it holds the learner back, is done, was skipped, or is only suggested. */
export type ReviewKind = 'PENDING' | 'DONE' | 'SKIPPED' | 'SUGGESTED'

const NONE: BlockingReviews = new Map()

/** The id of a review's node in the chart: made from the review's own, which no point's id can equal. */
export const reviewNodeId = (review: Pick<TreeBlockingReview, 'reviewId'>) => `review-${review.reviewId}`

export const kindOf = (review: Pick<BlockingReviewInfo, 'blocking' | 'status'>): ReviewKind =>
  review.blocking ? review.status : 'SUGGESTED'

/** True while the review still holds the learner back; a finished or only suggested one stays on the map but holds nothing. */
export const holdsBack = (review: Pick<BlockingReviewInfo, 'blocking' | 'status'> | undefined): boolean =>
  review !== undefined && review.blocking && review.status === 'PENDING'

/** The optional reviews of the basket that already exist (a review id), whichever list the point is in: the suggested ones. */
function suggestedOf(basket: ReviewBasket | null | undefined): BasketOptionalItem[] {
  return [...(basket?.weak ?? []), ...(basket?.consolidate ?? []), ...(basket?.due ?? [])].filter((item) => item.reviewId !== null)
}

/**
 * What the map shows of the reviews of each point. The tree carries every blocking review of a point it draws, finished ones
 * included, so the map keeps a review after it is done. The review basket fills in two things: the blocking reviews still pending,
 * for a server that does not send them with the tree yet, and the optional reviews the system suggested (a first weak Practice
 * raises one, and it blocks nothing). A point has one: a suggestion that is pending is newer than a finished blocking review and
 * replaces it, while a blocking review that is pending is never replaced.
 */
export function blockingReviewsOf(tree: LearnerTree | null | undefined, basket: ReviewBasket | null | undefined): BlockingReviews {
  const byPoint = new Map<string, BlockingReviewInfo>()
  for (const point of [...(tree?.knowledgePoints ?? []), ...(tree?.referencePoints ?? [])]) {
    if (point.blockingReview) {
      byPoint.set(point.knowledgePointId, { ...point.blockingReview, knowledgePointId: point.knowledgePointId, blocking: true })
    }
  }
  for (const item of basket?.required ?? []) {
    if (byPoint.has(item.knowledgePointId)) continue
    byPoint.set(item.knowledgePointId, {
      reviewId: item.reviewId, knowledgePointId: item.knowledgePointId, status: 'PENDING', lessonId: item.lessonId,
      createdAt: null, doneAt: null, setsAnswered: 0, lastCorrect: null, lastTotal: null, blocking: true,
    })
  }
  for (const item of suggestedOf(basket)) {
    if (holdsBack(byPoint.get(item.knowledgePointId))) continue
    byPoint.set(item.knowledgePointId, {
      reviewId: item.reviewId as string, knowledgePointId: item.knowledgePointId, status: 'PENDING', lessonId: null,
      createdAt: null, doneAt: null, setsAnswered: 0, lastCorrect: null, lastTotal: null, blocking: false,
    })
  }
  return byPoint.size === 0 ? NONE : byPoint
}

/**
 * Shared by the chart's boxes, the list's rows and the panel, so the reviews do not have to be passed down through React Flow.
 * Empty by default: a tree drawn without them shows no review at all.
 */
export const BlockingReviewsContext = createContext<BlockingReviews>(NONE)

export function useBlockingReview(knowledgePointId: string): BlockingReviewInfo | undefined {
  return useContext(BlockingReviewsContext).get(knowledgePointId)
}
