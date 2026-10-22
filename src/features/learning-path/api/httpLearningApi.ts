import { apiRequest, HttpError } from '@/lib/httpClient'
import type { LearningApi } from './learningApi'
import { ApiError, heartsDetails, type ApiErrorCode } from './apiError'
import {
  mapAttemptResult,
  mapAttemptStructure,
  mapCourseSummary,
  mapEssayGrade,
  mapLessonCompletion,
  mapLessonDetail,
  mapLessonExerciseResult,
  mapLessonPracticeSets,
  mapPracticeAttemptView,
  mapPracticeAttemptReview,
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
  type CourseSummaryDto,
  type EssayGradeDto,
  type LearnerAttemptResultDto,
  type LessonCompletionDto,
  type LessonDetailDto,
  type LessonExerciseResultDto,
  type LessonPracticeSetsDto,
  type PracticeAttemptReviewDto,
  type PracticeAttemptViewDto,
  type PracticeSubmissionResultDto,
  type ReviewDetailDto,
  type ReviewRefDto,
  type ReviewSubmissionResultDto,
  type TestAssignmentDto,
  type TheoryCheckResultDto,
  type TopicLessonsDto,
  type TopicSummaryDto,
} from './learningAdapters'
import {
  mapReviewBasket,
  mapSuggestions,
  type ReviewBasketDto,
  type SuggestionsDto,
} from './masteryGuideAdapters'
import type {
  AssessmentAttempt,
  AttemptItemResponse,
  AttemptResult,
  AttemptStructure,
  Badge,
  DailyQuests,
  HeartsStatus,
  League,
  LeagueHistoryEntry,
  LearnerProgress,
  LearnerTree,
  LessonCompletionResult,
  LearnerSubmissionRequest,
  LearningGoal,
  LearningGoalRequest,
  LessonDetail,
  PlacementResult,
  PlacementTest,
  PracticeAttemptView,
  PracticeSubmissionResult,
  ReviewDetail,
  ReviewSubmissionRequest,
  ReviewSubmissionResult,
  SaveItemResponseRequest,
  StartAttemptRequest,
  StreakStatus,
  TestAssignment,
  TopicLessonsResponse,
  TopicSummary,
} from '~types/learningPath'
import type { LessonResourcesResponse } from '~types/lesson'

const LEARNING = '/api/learning'
const ASSESSMENTS = '/api/assessments'

const CODE_MAP: Record<string, ApiErrorCode> = {
  TOPIC_LOCKED: 'TOPIC_LOCKED',
  LESSON_LOCKED: 'LESSON_LOCKED',
  TEST_LOCKED: 'TEST_LOCKED',
  TEST_UNAVAILABLE: 'TEST_UNAVAILABLE',
  PRACTICE_REQUIRED: 'PRACTICE_REQUIRED',
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
  FREEZE_ALREADY_OWNED: 'FREEZE_ALREADY_OWNED',
  NO_STREAK_TO_PROTECT: 'NO_STREAK_TO_PROTECT',
  FREEZE_LIMIT: 'FREEZE_LIMIT',
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
      nextHeartAt?: string
      refillCost?: number
      reviews?: Array<{ reviewId: string; lessonId: string; knowledgePointId: string }>
    }
    const code = (body.code && CODE_MAP[body.code]) || statusFallback(error.status)
    const reviews = body.reviews?.map(mapReviewRef)
    throw new ApiError(error.status, code, body.detail || body.message || error.message, {
      reviews,
      lessonIds: body.lessonIds,
      ...heartsDetails(body),
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
      course: null,
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
    async getPlacementTest(): Promise<PlacementTest> {
      return learningRequest<PlacementTest>('/placement-test')
    },

    async submitLearnerSubmission(request: LearnerSubmissionRequest) {
      return assessmentRequest<{ id: string }>('/submissions', { method: 'POST', body: request })
    },

    async listCourses() {
      const rows = await learningRequest<CourseSummaryDto[]>('/courses')
      return rows.map(mapCourseSummary)
    },

    async listTopics() {
      return loadTopics(true)
    },

    async getPendingReviews() {
      const rows = await learningRequest<ReviewRefDto[]>('/reviews?status=PENDING&limit=50')
      return rows.map(mapReviewRef)
    },

    async getTopicLessons(topicId: string): Promise<TopicLessonsResponse> {
      const [dto, topic, pendingReviews] = await Promise.all([
        learningRequest<TopicLessonsDto>(`/topics/${topicId}/lessons`),
        resolveTopic(topicId),
        learningRequest<ReviewRefDto[]>('/reviews?status=PENDING&limit=50').catch(() => []),
      ])
      const mapped = mapTopicLessons(dto, topic)
      return {
        ...mapped,
        pendingReviews: pendingReviews.map(mapReviewRef),
      }
    },

    async getLesson(lessonId: string): Promise<LessonDetail> {
      const dto = await learningRequest<LessonDetailDto>(`/lessons/${lessonId}`)
      const topic = await resolveTopic(dto.topicId)
      return mapLessonDetail(dto, topic.title)
    },

    async getLessonResources(lessonId: string): Promise<LessonResourcesResponse> {
      return learningRequest<LessonResourcesResponse>(`/lessons/${lessonId}/resources`)
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

    async getPracticeAttemptReview(attemptId) {
      return mapPracticeAttemptReview(await learningRequest<PracticeAttemptReviewDto>(`/practice-attempts/${attemptId}/review`))
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

    async submitPracticeEssay(attemptId, questionVersionId, request) {
      const dto = await learningRequest<EssayGradeDto>(
        `/practice-attempts/${attemptId}/essays/${questionVersionId}/submissions`,
        { method: 'POST', body: { requestId: request.requestId, essayText: request.essayText } },
      )
      return mapEssayGrade(dto)
    },

    async getLearnerTree(courseId: string) {
      return learningRequest<LearnerTree>(`/tree?courseId=${encodeURIComponent(courseId)}`)
    },

    async startFreePractice(knowledgePointId: string) {
      const dto = await learningRequest<PracticeAttemptViewDto>(`/knowledge-points/${knowledgePointId}/free-practice`, {
        method: 'POST',
        body: {},
      })
      return mapPracticeAttemptView(dto)
    },

    async getSuggestions() {
      return mapSuggestions(await learningRequest<SuggestionsDto>('/suggestions'))
    },

    async getReviewBasket() {
      return mapReviewBasket(await learningRequest<ReviewBasketDto>('/review-basket'))
    },

    async startBasketReview(knowledgePointId: string) {
      const dto = await learningRequest<{ reviewId: string }>(
        `/review-basket/${encodeURIComponent(knowledgePointId)}/start`,
        { method: 'POST', body: {} },
      )
      return { reviewId: dto.reviewId }
    },

    async getHearts() {
      return learningRequest<HeartsStatus>('/me/hearts')
    },

    async refillHearts(requestId: string) {
      return learningRequest<HeartsStatus>('/me/hearts/refill', { method: 'POST', body: { requestId } })
    },

    async getProgress() {
      return learningRequest<LearnerProgress>('/me/progress')
    },

    async getStreak() {
      return learningRequest<StreakStatus>('/me/streak')
    },

    async buyStreakFreeze(requestId: string) {
      return learningRequest<StreakStatus>('/me/streak/freeze', { method: 'POST', body: { requestId } })
    },

    async getQuests() {
      return learningRequest<DailyQuests>('/me/quests')
    },

    async getBadges() {
      return learningRequest<Badge[]>('/me/badges')
    },

    async getLeague() {
      return learningRequest<League>('/me/league')
    },

    async getLeagueHistory(weeks: number) {
      return learningRequest<LeagueHistoryEntry[]>(`/me/league/history?weeks=${weeks}`)
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

    async submitLessonExercise(lessonId, blockId, request) {
      const dto = await learningRequest<LessonExerciseResultDto>(
        `/lessons/${lessonId}/exercises/${blockId}/submissions`,
        { method: 'POST', body: { requestId: request.requestId, answers: toWireAnswers(request.answers) } },
      )
      return mapLessonExerciseResult(dto)
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
      return mapTestAssignment(dto, { topicId })
    },

    async createCourseTestAssignment(courseId: string): Promise<TestAssignment> {
      const dto = await learningRequest<TestAssignmentDto>(`/courses/${courseId}/test-assignments`, {
        method: 'POST',
        body: {},
      })
      return mapTestAssignment(dto, { courseId })
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

    async saveLearningGoal(request: LearningGoalRequest): Promise<void> {
      try {
        await apiRequest('/api/users/me/learning-goals', { method: 'POST', body: request, auth: true })
      } catch (error) {
        throwLearningError(error)
      }
    },

    async getActiveLearningGoal(): Promise<LearningGoal | null> {
      try {
        return await apiRequest<LearningGoal>('/api/users/me/learning-goals/active', { auth: true })
      } catch (error) {
        if (error instanceof HttpError && error.status === 404) return null
        throwLearningError(error)
      }
    },

    async getCurrentPlacementAttempt(): Promise<AssessmentAttempt | null> {
      // 204 (empty body, parsed as null) when the learner never started a placement.
      return assessmentRequest<AssessmentAttempt | null>('/attempts/placement/current')
    },

    async listAttemptResponses(attemptId: string): Promise<AttemptItemResponse[]> {
      return assessmentRequest<AttemptItemResponse[]>(`/attempts/${attemptId}/responses`)
    },

    async startAttemptSection(attemptId: string, sectionId: string): Promise<void> {
      await assessmentRequest<null>(`/attempts/${attemptId}/sections/${sectionId}/start`, { method: 'POST', body: {} })
    },

    async completeAttemptSection(attemptId: string, sectionId: string): Promise<void> {
      await assessmentRequest<null>(`/attempts/${attemptId}/sections/${sectionId}/complete`, { method: 'POST', body: {} })
    },

    async getPlacementResult(attemptId: string): Promise<PlacementResult> {
      const result = await assessmentRequest<PlacementResult>(`/attempts/${attemptId}/placement-result`)
      return { ...result, sections: result.sections ?? [] }
    },

    async getAttemptResult(attemptId: string): Promise<AttemptResult> {
      const dto = await assessmentRequest<LearnerAttemptResultDto>(`/attempts/${attemptId}/result`)
      // Topic id is not on result DTO; UI reads ?topic= from navigation when available.
      return mapAttemptResult(dto, '')
    },
  }
}
