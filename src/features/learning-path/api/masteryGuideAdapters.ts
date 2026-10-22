import type {
  BasketOptionalItem,
  BasketRequiredItem,
  MasteryTier,
  ReviewBasket,
  Suggestion,
  SuggestionAction,
  SuggestionReason,
  SuggestionType,
} from '~types/learningPath'

/** Wire DTOs of the mastery guide: `GET /api/learning/suggestions` and `GET /api/learning/review-basket`. */

export type SuggestionDto = {
  type: SuggestionType
  id: string
  title: string
  knowledgePointId: string
  knowledgePointCode?: string | null
  reason: SuggestionReason
  band?: number | string | null
  skill?: string | null
  /** The API route that starts the item, or null when it is opened from its own list. */
  openPath?: string | null
}

export type SuggestionsDto = { suggestions?: SuggestionDto[] | null }

export type BasketRequiredDto = {
  reviewId: string
  knowledgePointId: string
  code: string
  name: string
  lessonId?: string | null
  skill?: string | null
}

export type BasketOptionalDto = {
  knowledgePointId: string
  code: string
  name: string
  skill?: string | null
  tier: MasteryTier
  mastery: number
  dueAt?: string | null
  reason: 'CONSOLIDATE' | 'DUE'
  hasUnrevealedSet: boolean
  reviewId?: string | null
}

export type ReviewBasketDto = {
  required?: BasketRequiredDto[] | null
  consolidate?: BasketOptionalDto[] | null
  due?: BasketOptionalDto[] | null
  weak?: BasketOptionalDto[] | null
}

const LESSON_PATH = /^\/api\/learning\/lessons\/([^/]+)$/
const BASKET_START_PATH = /^\/api\/learning\/review-basket\/([^/]+)\/start$/

/** Turns the route the API names into what the screen does; anything else is left to the course list. */
export function suggestionAction(openPath: string | null | undefined, knowledgePointId: string): SuggestionAction {
  const path = openPath?.trim() ?? ''
  const lesson = LESSON_PATH.exec(path)
  if (lesson) return { kind: 'LESSON', lessonId: lesson[1] }
  const basket = BASKET_START_PATH.exec(path)
  if (basket) return { kind: 'BASKET_REVIEW', knowledgePointId: basket[1] || knowledgePointId }
  return { kind: 'COURSE_LIST' }
}

export function mapSuggestions(dto: SuggestionsDto | null | undefined): Suggestion[] {
  return (dto?.suggestions ?? []).map((item) => {
    const band = item.band === null || item.band === undefined ? null : Number(item.band)
    return {
      type: item.type,
      id: item.id,
      title: item.title,
      knowledgePointId: item.knowledgePointId,
      knowledgePointCode: item.knowledgePointCode ?? null,
      reason: item.reason,
      band: band !== null && Number.isFinite(band) ? band : null,
      skill: item.skill ?? null,
      action: suggestionAction(item.openPath, item.knowledgePointId),
    }
  })
}

function mapRequired(item: BasketRequiredDto): BasketRequiredItem {
  return {
    reviewId: item.reviewId,
    knowledgePointId: item.knowledgePointId,
    code: item.code,
    name: item.name,
    lessonId: item.lessonId ?? null,
    skill: item.skill ?? null,
  }
}

function mapOptional(item: BasketOptionalDto): BasketOptionalItem {
  return {
    knowledgePointId: item.knowledgePointId,
    code: item.code,
    name: item.name,
    skill: item.skill ?? null,
    tier: item.tier,
    mastery: item.mastery,
    dueAt: item.dueAt ?? null,
    reason: item.reason,
    hasUnrevealedSet: item.hasUnrevealedSet,
    reviewId: item.reviewId ?? null,
  }
}

export function mapReviewBasket(dto: ReviewBasketDto | null | undefined): ReviewBasket {
  return {
    required: (dto?.required ?? []).map(mapRequired),
    consolidate: (dto?.consolidate ?? []).map(mapOptional),
    due: (dto?.due ?? []).map(mapOptional),
    weak: (dto?.weak ?? []).map(mapOptional),
  }
}
