import { HttpError } from '@/lib/httpClient'
import type { ReviewRef } from '~types/learningPath'

export type ApiErrorCode =
  | 'TOPIC_LOCKED'
  | 'LESSON_LOCKED'
  | 'TEST_LOCKED'
  | 'TEST_UNAVAILABLE'
  | 'PRACTICE_REQUIRED'
  /** The lesson has exercise blocks: it is completed by passing them, not by the confirmation button. */
  | 'LESSON_HAS_EXERCISES'
  | 'REVIEW_REQUIRED'
  | 'REVIEW_SET_CLOSED'
  | 'NOT_FOUND'
  | 'VALIDATION_FAILED'
  | 'INSUFFICIENT_POINTS'
  | 'GRADING_UNAVAILABLE'
  | 'DAILY_LIMIT_REACHED'
  | 'PLACEMENT_ALREADY_DONE'
  | 'NO_PLACEMENT_TEST'
  /** No hearts left: starting or submitting a heart-costing set is refused until one returns or the hearts are refilled. */
  | 'HEARTS_DEPLETED'
  | 'HEARTS_FULL'
  /** Access could not be reached; a purchase with points was not charged. */
  | 'ACCESS_UNAVAILABLE'
  /** Free practice or the tree on a course that is closed or that the learner is not taking. */
  | 'COURSE_NOT_OPEN'
  | 'COURSE_NOT_JOINED'
  /** No unseen practice set is left on the point (some are kept back for reviews). */
  | 'FREE_PRACTICE_EXHAUSTED'
  | 'FREE_PRACTICE_UNAVAILABLE'
  /** Starting a review from the basket: the point left the basket, or Content has no set the learner has not seen. */
  | 'NOT_IN_REVIEW_BASKET'
  | 'NO_UNREVEALED_SET'
  /** Buying a streak freeze: one is already owned, there is no streak to protect, or five days in a row are frozen. */
  | 'FREEZE_ALREADY_OWNED'
  | 'NO_STREAK_TO_PROTECT'
  | 'FREEZE_LIMIT'
  | 'SERVER_ERROR'

export interface ApiErrorDetails {
  topicId?: string
  courseId?: string
  lessonId?: string
  lessonIds?: string[]
  reviews?: ReviewRef[]
  /** `HEARTS_DEPLETED`: when the next heart comes back (ISO instant). */
  nextHeartAt?: string
  /** `HEARTS_DEPLETED`: points a full refill costs. */
  refillCost?: number
}

/** The hearts fields of an error body, only the ones the server sent. */
export function heartsDetails(body: { nextHeartAt?: unknown; refillCost?: unknown }): Pick<ApiErrorDetails, 'nextHeartAt' | 'refillCost'> {
  return {
    ...(typeof body.nextHeartAt === 'string' ? { nextHeartAt: body.nextHeartAt } : {}),
    ...(typeof body.refillCost === 'number' ? { refillCost: body.refillCost } : {}),
  }
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

/** What to show the learner. The hearts and points errors come from the server in English, so they get their own copy. */
export function userMessage(error: ApiError): string {
  switch (error.code) {
    case 'HEARTS_DEPLETED':
      return 'Bạn đã hết tim. Chờ tim hồi lại hoặc dùng điểm để hồi đầy.'
    case 'HEARTS_FULL':
      return 'Tim của bạn đã đầy.'
    case 'REVIEW_REQUIRED':
      return 'Bạn cần làm xong bài ôn bắt buộc trước khi nộp thêm bài. Bạn vẫn xem lại được nội dung bài học.'
    case 'ACCESS_UNAVAILABLE':
      return 'Chưa kết nối được hệ thống điểm. Bạn chưa bị trừ điểm, hãy thử lại sau.'
    case 'COURSE_NOT_OPEN':
      return 'Khóa học này hiện chưa mở.'
    case 'COURSE_NOT_JOINED':
      return 'Bạn chưa tham gia khóa học này.'
    case 'FREE_PRACTICE_EXHAUSTED':
      return 'Đã hết bộ luyện tự do cho điểm kiến thức này. Các bộ còn lại được giữ cho bài ôn.'
    case 'FREE_PRACTICE_UNAVAILABLE':
      return 'Điểm kiến thức này chưa có bài luyện tự do.'
    case 'NO_UNREVEALED_SET':
      return 'Điểm này chưa có bộ đề mới để ôn. Hãy quay lại sau.'
    case 'NOT_IN_REVIEW_BASKET':
      return 'Điểm này không còn trong giỏ ôn tập. Hãy tải lại trang.'
    case 'INSUFFICIENT_POINTS':
      return 'Bạn chưa đủ điểm.'
    case 'FREEZE_ALREADY_OWNED':
      return 'Bạn đã có một lượt đóng băng, hãy dùng nó trước.'
    case 'NO_STREAK_TO_PROTECT':
      return 'Bạn chưa có chuỗi nào để bảo vệ.'
    case 'FREEZE_LIMIT':
      return 'Đã đóng băng tối đa 5 ngày liên tiếp.'
    default:
      return error.message
  }
}

const CODE_MAP: Record<string, ApiErrorCode> = {
  TOPIC_LOCKED: 'TOPIC_LOCKED',
  LESSON_LOCKED: 'LESSON_LOCKED',
  TEST_LOCKED: 'TEST_LOCKED',
  TEST_UNAVAILABLE: 'TEST_UNAVAILABLE',
  PRACTICE_REQUIRED: 'PRACTICE_REQUIRED',
  LESSON_HAS_EXERCISES: 'LESSON_HAS_EXERCISES',
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
  PLACEMENT_ALREADY_DONE: 'PLACEMENT_ALREADY_DONE',
  NO_PLACEMENT_TEST: 'NO_PLACEMENT_TEST',
  HEARTS_DEPLETED: 'HEARTS_DEPLETED',
  HEARTS_FULL: 'HEARTS_FULL',
  ACCESS_UNAVAILABLE: 'ACCESS_UNAVAILABLE',
  COURSE_NOT_OPEN: 'COURSE_NOT_OPEN',
  COURSE_NOT_JOINED: 'COURSE_NOT_JOINED',
  FREE_PRACTICE_EXHAUSTED: 'FREE_PRACTICE_EXHAUSTED',
  FREE_PRACTICE_UNAVAILABLE: 'FREE_PRACTICE_UNAVAILABLE',
  NOT_IN_REVIEW_BASKET: 'NOT_IN_REVIEW_BASKET',
  NO_UNREVEALED_SET: 'NO_UNREVEALED_SET',
  FREEZE_ALREADY_OWNED: 'FREEZE_ALREADY_OWNED',
  NO_STREAK_TO_PROTECT: 'NO_STREAK_TO_PROTECT',
  FREEZE_LIMIT: 'FREEZE_LIMIT',
  ESSAY_EMPTY: 'VALIDATION_FAILED',
  ESSAY_TOO_SHORT: 'VALIDATION_FAILED',
  ESSAY_TOO_LONG: 'VALIDATION_FAILED',
  ESSAY_NOT_GRADED: 'VALIDATION_FAILED',
  GRADING_IN_PROGRESS: 'VALIDATION_FAILED',
}

export function toApiError(error: unknown): ApiError {
  if (isApiError(error)) return error
  if (error instanceof HttpError) {
    const body = (error.body ?? {}) as {
      detail?: string
      message?: string
      code?: string
      lessonIds?: string[]
      nextHeartAt?: string
      refillCost?: number
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
      ...heartsDetails(body),
    })
  }
  return new ApiError(0, 'SERVER_ERROR', 'Không kết nối được máy chủ.')
}
