import type { BasketOptionalItem, ReviewBasket, ReviewRef, Suggestion } from '~types/learningPath'
import { MOCK_TREE_POINTS } from './mockTree'

const DAY_MS = 86_400_000

/** Weak points of the fixed tree, and one point that opens up next, so the strip shows every reason offline. */
export function mockSuggestions(): Suggestion[] {
  const weak = MOCK_TREE_POINTS.filter((point) => point.tier === 'CONSOLIDATE' || point.tier === 'PRIORITY')
  const items: Suggestion[] = weak.slice(0, 3).map((point, index) => ({
    type: 'PRACTICE_SET',
    id: `mock-set-${point.code}`,
    title: `Bộ luyện: ${point.name}`,
    knowledgePointId: point.knowledgePointId,
    knowledgePointCode: point.code,
    reason: index === 2 ? 'DUE' : 'CONSOLIDATE',
    band: 5.5,
    skill: point.skill,
    action: { kind: 'BASKET_REVIEW', knowledgePointId: point.knowledgePointId },
  }))
  const next = MOCK_TREE_POINTS.find((point) => point.tier === null)
  if (next) {
    items.push({
      type: 'LESSON',
      id: `mock-lesson-${next.code}`,
      title: next.name,
      knowledgePointId: next.knowledgePointId,
      knowledgePointCode: next.code,
      reason: 'NEXT_IN_TREE',
      band: 6,
      skill: next.skill,
      action: { kind: 'COURSE_LIST' },
    })
  }
  return items
}

/** The mock's pending reviews are the required ones; weak and firm points of the tree fill the optional lists. */
export function mockReviewBasket(pending: ReviewRef[], now: Date): ReviewBasket {
  const optional = (point: (typeof MOCK_TREE_POINTS)[number], reason: 'CONSOLIDATE' | 'DUE', dueInDays: number): BasketOptionalItem => ({
    knowledgePointId: point.knowledgePointId,
    code: point.code,
    name: point.name,
    skill: point.skill,
    tier: point.tier ?? 'INSUFFICIENT',
    mastery: point.mastery ?? 0,
    dueAt: new Date(now.getTime() + dueInDays * DAY_MS).toISOString(),
    reason,
    hasUnrevealedSet: point.practiceAvailable,
    reviewId: null,
  })
  return {
    required: pending.map((review) => ({
      reviewId: review.reviewId,
      knowledgePointId: review.knowledgePointCode,
      code: review.knowledgePointCode,
      name: review.knowledgePointTitle,
      lessonId: review.lessonId ?? null,
      skill: 'READING',
    })),
    consolidate: MOCK_TREE_POINTS.filter((point) => point.tier === 'CONSOLIDATE' || point.tier === 'PRIORITY')
      .map((point) => optional(point, 'CONSOLIDATE', 1)),
    due: MOCK_TREE_POINTS.filter((point) => point.tier === 'MAINTAIN').map((point) => optional(point, 'DUE', -2)),
  }
}
