import { HttpError } from '@/lib/httpClient'
import type { ReviewRef } from '~types/learningPath'

export type ApiErrorCode =
  | 'TOPIC_LOCKED'
  | 'LESSON_LOCKED'
  | 'TEST_LOCKED'
  | 'TEST_UNAVAILABLE'
  | 'PRACTICE_REQUIRED'
  | 'REVIEW_REQUIRED'
  | 'REVIEW_SET_CLOSED'
  | 'NOT_FOUND'
  | 'VALIDATION_FAILED'
  | 'INSUFFICIENT_POINTS'
  | 'GRADING_UNAVAILABLE'
  | 'DAILY_LIMIT_REACHED'
  | 'ESSAY_BLOCK'
  | 'PLACEMENT_REQUIRED'
  | 'PLACEMENT_ALREADY_DONE'
  | 'NO_PLACEMENT_TEST'
  | 'SERVER_ERROR'

export interface ApiErrorDetails {
  topicId?: string
  lessonId?: string
  lessonIds?: string[]
  reviews?: ReviewRef[]
}

export class ApiError extends Error {
  readonly status: number
  readonly code: ApiErrorCode
  readonly details: ApiErrorDetails

  constructor(status: number, code: ApiErrorCode, message: string, details: ApiErrorDetails = {}) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.code = code
    this.details = details
  }
}

export function isApiError(error: unknown): error is ApiError {
  return error instanceof ApiError
}

const CODE_MAP: Record<string, ApiErrorCode> = {
  TOPIC_LOCKED: 'TOPIC_LOCKED',
  LESSON_LOCKED: 'LESSON_LOCKED',
  TEST_LOCKED: 'TEST_LOCKED',
  TEST_UNAVAILABLE: 'TEST_UNAVAILABLE',
  PRACTICE_REQUIRED: 'PRACTICE_REQUIRED',
  PRACTICE_LOCKED: 'PRACTICE_REQUIRED',
  REVIEW_REQUIRED: 'REVIEW_REQUIRED',
  REVIEW_SET_CLOSED: 'REVIEW_SET_CLOSED',
  THEORY_REQUIRED: 'REVIEW_REQUIRED',
  THEORY_NOT_REQUIRED: 'VALIDATION_FAILED',
  ATTEMPT_ALREADY_SUBMITTED: 'VALIDATION_FAILED',
  NO_TOPIC_TEST: 'TEST_UNAVAILABLE',
  NOT_FOUND: 'NOT_FOUND',
  VALIDATION_FAILED: 'VALIDATION_FAILED',
  INSUFFICIENT_POINTS: 'INSUFFICIENT_POINTS',
  GRADING_UNAVAILABLE: 'GRADING_UNAVAILABLE',
  DAILY_LIMIT_REACHED: 'DAILY_LIMIT_REACHED',
  ESSAY_BLOCK: 'ESSAY_BLOCK',
  PLACEMENT_REQUIRED: 'PLACEMENT_REQUIRED',
  PLACEMENT_ALREADY_DONE: 'PLACEMENT_ALREADY_DONE',
  NO_PLACEMENT_TEST: 'NO_PLACEMENT_TEST',
  ESSAY_EMPTY: 'VALIDATION_FAILED',
  ESSAY_TOO_SHORT: 'VALIDATION_FAILED',
  ESSAY_TOO_LONG: 'VALIDATION_FAILED',
}

export function toApiError(error: unknown): ApiError {
  if (isApiError(error)) return error
  if (error instanceof HttpError) {
    const body = (error.body ?? {}) as {
      detail?: string
      message?: string
      code?: string
      lessonIds?: string[]
      reviews?: Array<{ reviewId: string; lessonId?: string; knowledgePointId?: string; knowledgePointCode?: string; knowledgePointTitle?: string }>
    }
    const code = (body.code && CODE_MAP[body.code]) || (error.status === 404 ? 'NOT_FOUND' : 'SERVER_ERROR')
    const reviews = body.reviews?.map((review) => ({
      reviewId: review.reviewId,
      knowledgePointCode: review.knowledgePointCode ?? review.knowledgePointId?.slice(0, 8) ?? 'KP',
      knowledgePointTitle: review.knowledgePointTitle ?? 'Bài ôn bắt buộc',
    }))
    return new ApiError(error.status, code, body.detail || body.message || error.message, {
      reviews,
      lessonIds: body.lessonIds,
    })
  }
  return new ApiError(0, 'SERVER_ERROR', 'Không kết nối được máy chủ.')
}
