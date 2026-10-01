import type { ReviewRef } from '~types/learningPath'

export type ApiErrorCode =
  | 'TOPIC_LOCKED'
  | 'LESSON_LOCKED'
  | 'TEST_LOCKED'
  | 'TEST_UNAVAILABLE'
  | 'REVIEW_REQUIRED'
  | 'REVIEW_SET_CLOSED'
  | 'NOT_FOUND'
  | 'VALIDATION_FAILED'
  | 'SERVER_ERROR'

export interface ApiErrorDetails {
  topicId?: string
  lessonId?: string
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

export function toApiError(error: unknown): ApiError {
  if (isApiError(error)) return error
  return new ApiError(0, 'SERVER_ERROR', 'Không kết nối được máy chủ.')
}
