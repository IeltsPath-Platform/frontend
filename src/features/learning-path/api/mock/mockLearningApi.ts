import { ApiError } from '../apiError'
import type { LearningApi, MockLearningControls } from '../learningApi'
import * as lessons from './mockLessonHandlers'
import { clearState, createInitialState, loadState, saveState, type KeyValueStorage, type MockState } from './mockState'
import { pendingReviewRefs } from './mockProgress'
import * as tests from './mockTestHandlers'

export interface MockLearningApiOptions {
  storage?: KeyValueStorage | null
  latencyMs?: number
  now?: () => Date
}

export type MockLearningApi = LearningApi & MockLearningControls

export function createMockLearningApi({ storage = null, latencyMs = 0, now = () => new Date() }: MockLearningApiOptions = {}): MockLearningApi {
  let state: MockState = loadState(storage)
  let serverFailing = false

  async function respond<T>(handler: (current: MockState) => T): Promise<T> {
    if (latencyMs > 0) await new Promise((resolve) => setTimeout(resolve, latencyMs))
    if (serverFailing) throw new ApiError(500, 'SERVER_ERROR', 'Máy chủ đang gặp sự cố. Vui lòng thử lại.')
    const draft = structuredClone(state)
    const result = handler(draft)
    state = draft
    saveState(storage, state)
    return structuredClone(result)
  }

  /** Replaying a `requestId` returns the stored outcome instead of grading twice. */
  function idempotent<T>(requestId: string, handler: (current: MockState) => T) {
    return respond((current) => {
      if (requestId in current.processedRequests) return current.processedRequests[requestId] as T
      const result = handler(current)
      current.processedRequests[requestId] = result
      return result
    })
  }

  const timestamp = () => now().toISOString()

  return {
    // The mock learner has no placement gate: the test is treated as already taken.
    getPlacementTest: async () => {
      throw new ApiError(409, 'PLACEMENT_ALREADY_DONE', 'Mock learning không có placement test.')
    },
    saveLearningGoal: async () => {
      throw new ApiError(404, 'NOT_FOUND', 'Mock learning không lưu mục tiêu học.')
    },
    getActiveLearningGoal: async () => null,
    getCurrentPlacementAttempt: async () => null,
    listAttemptResponses: async () => [],
    startAttemptSection: async () => {},
    completeAttemptSection: async () => {},
    getPlacementResult: async () => {
      throw new ApiError(404, 'NOT_FOUND', 'Mock learning không có kết quả placement.')
    },
    submitLearnerSubmission: async () => {
      throw new ApiError(404, 'NOT_FOUND', 'Mock learning không nhận bài Writing/Speaking của placement.')
    },
    listCourses: () => respond(lessons.listCourses),
    listTopics: () => respond(lessons.listTopics),
    getPendingReviews: () => respond(pendingReviewRefs),
    getTopicLessons: (topicId) => respond((s) => lessons.getTopicLessons(s, topicId)),
    getLesson: (lessonId) => respond((s) => lessons.getLesson(s, lessonId)),
    submitExercise: (lessonId, blockId, request) => idempotent(request.requestId, (s) => lessons.submitExercise(s, lessonId, blockId, request)),
    submitEssay: async () => {
      throw new ApiError(503, 'GRADING_UNAVAILABLE', 'Mock learning chưa hỗ trợ chấm bài luận. Bật HTTP thật để thử Writing.')
    },
    getWritingSubmission: async () => {
      throw new ApiError(404, 'NOT_FOUND', 'Mock learning không có writing submission.')
    },
    completeLesson: (lessonId) => respond((s) => lessons.completeLesson(s, lessonId)),
    getLessonPracticeSets: async (lessonId) => ({
      lessonId,
      skill: 'READING',
      lessonCompleted: true,
      practiceStatus: 'PASSED',
      practicePassReason: 'NO_PRACTICE',
      items: [],
    }),
    startPracticeAttempt: async () => {
      throw new ApiError(404, 'NOT_FOUND', 'Mock learning không có practice set. Dùng HTTP thật để luyện thêm.')
    },
    getPracticeAttempt: async () => {
      throw new ApiError(404, 'NOT_FOUND', 'Mock learning không có practice attempt.')
    },
    submitPracticeAttempt: async () => {
      throw new ApiError(404, 'NOT_FOUND', 'Mock learning không có practice attempt.')
    },
    getReview: (reviewId) => respond((s) => lessons.getReview(s, reviewId)),
    submitReview: (reviewId, request) => idempotent(request.requestId, (s) => lessons.submitReview(s, reviewId, request)),
    submitTheoryCheck: async (reviewId) => ({
      reviewId,
      correct: 0,
      total: 0,
      stage: 'PRACTICE',
      results: [],
    }),
    createTestAssignment: (topicId) => respond((s) => tests.createTestAssignment(s, topicId)),
    createAttempt: (request) => respond((s) => tests.createAttempt(s, request, timestamp())),
    getAttemptStructure: (attemptId) => respond((s) => tests.getAttemptStructure(s, attemptId)),
    saveItemResponse: (attemptId, itemId, request) => respond((s) => tests.saveItemResponse(s, attemptId, itemId, request, timestamp())),
    submitAttempt: (attemptId) => respond((s) => tests.submitAttempt(s, attemptId, timestamp())),
    getAttemptResult: (attemptId) => respond((s) => tests.getAttemptResult(s, attemptId)),
    reset() {
      clearState(storage)
      state = createInitialState()
      serverFailing = false
    },
    setServerFailing(failing) {
      serverFailing = failing
    },
  }
}
