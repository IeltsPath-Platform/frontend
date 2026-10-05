import { WRITING_REQUEST_TIMEOUT_MS } from '@/lib/env'
import { apiRequest, HttpError } from '@/lib/httpClient'
import type { LearningApi } from './learningApi'
import { ApiError, type ApiErrorCode } from './apiError'
import {
  mapAttemptResult,
  mapAttemptStructure,
  mapExerciseSubmission,
  mapLessonCompletion,
  mapLessonDetail,
  mapLessonPracticeSets,
  mapPracticeAttemptView,
  mapPracticeSubmission,
  mapReviewDetail,
  mapReviewRef,
  mapReviewSubmission,
  mapTestAssignment,
  mapTheoryCheck,
  mapTopicLessons,
  mapTopicSummary,
  toStartAttemptBody,
  toWireAnswers,
  type ExerciseSubmissionResultDto,
  type LearnerAttemptResultDto,
  type LessonCompletionDto,
  type LessonDetailDto,
  type LessonPracticeSetsDto,
  type PracticeAttemptViewDto,
  type PracticeSubmissionResultDto,
  type ReviewDetailDto,
  type ReviewSubmissionResultDto,
  type TestAssignmentDto,
  type TheoryCheckResultDto,
  type TopicLessonsDto,
  type TopicSummaryDto,
} from './learningAdapters'
import type {
  AssessmentAttempt,
  AttemptItemResponse,
  AttemptResult,
  AttemptStructure,
  ExerciseSubmissionRequest,
  LessonCompletionResult,
  LessonDetail,
  PracticeAttemptView,
  PracticeSubmissionResult,
  ReviewDetail,
  ReviewSubmissionRequest,
  ReviewSubmissionResult,
  SaveItemResponseRequest,
  StartAttemptRequest,
  TestAssignment,
  TopicLessonsResponse,
  TopicSummary,
} from '~types/learningPath'

const LEARNING = '/api/learning'
const ASSESSMENTS = '/api/assessments'

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
}

function statusFallback(status: number): ApiErrorCode {
  if (status === 404) return 'NOT_FOUND'
  if (status === 422 || status === 400) return 'VALIDATION_FAILED'
  return 'SERVER_ERROR'
}

function throwLearningError(error: unknown): never {
  if (error instanceof ApiError) throw error
  if (error instanceof HttpError) {
    const body = (error.body ?? {}) as {
      detail?: string
      message?: string
      code?: string
      lessonIds?: string[]
      reviews?: Array<{ reviewId: string; lessonId: string; knowledgePointId: string }>
    }
    const code = (body.code && CODE_MAP[body.code]) || statusFallback(error.status)
    const reviews = body.reviews?.map(mapReviewRef)
    throw new ApiError(error.status, code, body.detail || body.message || error.message, {
      reviews,
      lessonIds: body.lessonIds,
    })
  }
  throw new ApiError(0, 'SERVER_ERROR', 'Không kết nối được máy chủ.')
}

async function learningRequest<T>(path: string, options: Parameters<typeof apiRequest>[1] = {}): Promise<T> {
  try {
    return await apiRequest<T>(`${LEARNING}${path}`, { ...options, auth: true })
  } catch (error) {
    throwLearningError(error)
  }
}

async function assessmentRequest<T>(path: string, options: Parameters<typeof apiRequest>[1] = {}): Promise<T> {
  try {
    return await apiRequest<T>(`${ASSESSMENTS}${path}`, { ...options, auth: true })
  } catch (error) {
    throwLearningError(error)
  }
}

export function createHttpLearningApi(): LearningApi {
  let topicCache: TopicSummary[] | null = null

  async function loadTopics(force = false): Promise<TopicSummary[]> {
    if (!force && topicCache) return topicCache
    const rows = await learningRequest<TopicSummaryDto[]>('/topics')
    topicCache = rows.map(mapTopicSummary)
    return topicCache
  }

  async function resolveTopic(topicId: string): Promise<TopicSummary> {
    const topics = await loadTopics()
    return topics.find((topic) => topic.id === topicId) ?? {
      id: topicId,
      code: '',
      title: 'Topic',
      description: '',
      sequenceOrder: 0,
      status: 'IN_PROGRESS',
      completedLessons: 0,
      totalLessons: 0,
      lockedReason: null,
    }
  }

  return {
    async listTopics() {
      return loadTopics(true)
    },

    async getPendingReviews() {
      const rows = await learningRequest<Array<{
        reviewId: string
        knowledgePointId: string
        lessonId: string
        skill?: string
        stage?: string
      }>>('/reviews?status=PENDING&limit=50')
      return rows.map((row) => mapReviewRef({
        reviewId: row.reviewId,
        lessonId: row.lessonId,
        knowledgePointId: row.knowledgePointId,
      }))
    },

    async getTopicLessons(topicId: string): Promise<TopicLessonsResponse> {
      const [dto, topic, pendingReviews] = await Promise.all([
        learningRequest<TopicLessonsDto>(`/topics/${topicId}/lessons`),
        resolveTopic(topicId),
        learningRequest<Array<{
          reviewId: string
          knowledgePointId: string
          lessonId: string
        }>>('/reviews?status=PENDING&limit=50').catch(() => []),
      ])
      const mapped = mapTopicLessons(dto, topic)
      return {
        ...mapped,
        pendingReviews: pendingReviews.map((row) => mapReviewRef({
          reviewId: row.reviewId,
          lessonId: row.lessonId,
          knowledgePointId: row.knowledgePointId,
        })),
      }
    },

    async getLesson(lessonId: string): Promise<LessonDetail> {
      const dto = await learningRequest<LessonDetailDto>(`/lessons/${lessonId}`)
      const topic = await resolveTopic(dto.topicId)
      return mapLessonDetail(dto, topic.title)
    },

    async getLessonPracticeSets(lessonId: string) {
      const dto = await learningRequest<LessonPracticeSetsDto>(`/lessons/${lessonId}/practice-sets`)
      return mapLessonPracticeSets(dto)
    },

    async startPracticeAttempt(lessonId: string, packageId: string) {
      const dto = await learningRequest<PracticeAttemptViewDto>(`/lessons/${lessonId}/practice-attempts`, {
        method: 'POST',
        body: { packageId },
      })
      return mapPracticeAttemptView(dto)
    },

    async getPracticeAttempt(attemptId: string): Promise<PracticeAttemptView | PracticeSubmissionResult> {
      const dto = await learningRequest<PracticeAttemptViewDto & PracticeSubmissionResultDto>(
        `/practice-attempts/${attemptId}`,
      )
      if ('correct' in dto && typeof dto.correct === 'number' && 'passed' in dto) {
        return mapPracticeSubmission(dto)
      }
      return mapPracticeAttemptView(dto)
    },

    async submitPracticeAttempt(attemptId, request) {
      const dto = await learningRequest<PracticeSubmissionResultDto>(`/practice-attempts/${attemptId}/submissions`, {
        method: 'POST',
        body: {
          requestId: request.requestId,
          answers: toWireAnswers(request.answers),
        },
      })
      return mapPracticeSubmission(dto)
    },

    async submitExercise(lessonId, blockId, request: ExerciseSubmissionRequest) {
      const dto = await learningRequest<ExerciseSubmissionResultDto>(
        `/lessons/${lessonId}/exercises/${blockId}/submissions`,
        {
          method: 'POST',
          body: {
            requestId: request.requestId,
            answers: toWireAnswers(request.answers),
          },
        },
      )
      return mapExerciseSubmission(blockId, request, dto)
    },

    async submitEssay(lessonId, blockId, request) {
      try {
        return await apiRequest(`${LEARNING}/lessons/${lessonId}/essays/${blockId}/submissions`, {
          method: 'POST',
          body: request,
          auth: true,
          timeoutMs: WRITING_REQUEST_TIMEOUT_MS,
        })
      } catch (error) {
        throwLearningError(error)
      }
    },

    async getWritingSubmission(submissionId) {
      return learningRequest(`/writing-submissions/${submissionId}`)
    },

    async completeLesson(lessonId: string): Promise<LessonCompletionResult> {
      const dto = await learningRequest<LessonCompletionDto>(`/lessons/${lessonId}/complete`, {
        method: 'POST',
        body: {},
      })
      return mapLessonCompletion(dto)
    },

    async getReview(reviewId: string): Promise<ReviewDetail> {
      const dto = await learningRequest<ReviewDetailDto>(`/reviews/${reviewId}`)
      // Avoid GET /lessons here: it may 403 REVIEW_REQUIRED while this review is open.
      return mapReviewDetail(dto, '')
    },

    async submitReview(reviewId: string, request: ReviewSubmissionRequest): Promise<ReviewSubmissionResult> {
      const detail = await learningRequest<ReviewDetailDto>(`/reviews/${reviewId}`)
      const dto = await learningRequest<ReviewSubmissionResultDto>(`/reviews/${reviewId}/submissions`, {
        method: 'POST',
        body: {
          reviewSetId: request.setId,
          requestId: request.requestId,
          answers: toWireAnswers(request.answers),
        },
      })
      return mapReviewSubmission(dto, '', detail.lessonId)
    },

    async submitTheoryCheck(reviewId, request) {
      const dto = await learningRequest<TheoryCheckResultDto>(`/reviews/${reviewId}/theory-check`, {
        method: 'POST',
        body: {
          requestId: request.requestId,
          answers: toWireAnswers(request.answers),
        },
      })
      return mapTheoryCheck(dto)
    },

    async createTestAssignment(topicId: string): Promise<TestAssignment> {
      const dto = await learningRequest<TestAssignmentDto>(`/topics/${topicId}/test-assignments`, {
        method: 'POST',
        body: {},
      })
      return mapTestAssignment(dto, topicId)
    },

    async createAttempt(request: StartAttemptRequest): Promise<AssessmentAttempt> {
      return assessmentRequest<AssessmentAttempt>('/attempts', {
        method: 'POST',
        body: toStartAttemptBody(request),
      })
    },

    async getAttemptStructure(attemptId: string): Promise<AttemptStructure> {
      const raw = await assessmentRequest<Parameters<typeof mapAttemptStructure>[0]>(`/attempts/${attemptId}/structure`)
      return mapAttemptStructure(raw)
    },

    async saveItemResponse(
      attemptId: string,
      itemId: string,
      request: SaveItemResponseRequest,
    ): Promise<AttemptItemResponse> {
      return assessmentRequest<AttemptItemResponse>(`/attempts/${attemptId}/items/${itemId}/response`, {
        method: 'PUT',
        body: request,
      })
    },

    async submitAttempt(attemptId: string): Promise<AssessmentAttempt> {
      return assessmentRequest<AssessmentAttempt>(`/attempts/${attemptId}/submit`, {
        method: 'POST',
        body: {},
      })
    },

    async getAttemptResult(attemptId: string): Promise<AttemptResult> {
      const dto = await assessmentRequest<LearnerAttemptResultDto>(`/attempts/${attemptId}/result`)
      // Topic id is not on result DTO; UI reads ?topic= from navigation when available.
      return mapAttemptResult(dto, '')
    },
  }
}
