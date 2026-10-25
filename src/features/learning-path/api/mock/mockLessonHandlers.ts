import type {
  CourseSummary,
  LessonCompletionResult,
  LessonDetail,
  ReviewDetail,
  ReviewSubmissionRequest,
  ReviewSubmissionResult,
  TopicLessonsResponse,
  TopicSummary,
} from '~types/learningPath'
import type { LessonResourcesResponse } from '~types/lesson'
import { MOCK_ERROR_HINTS } from '@/mocks/learning-path/contentTypes'
import { MOCK_TOPICS } from '@/mocks/learning-path/topics'
import { ApiError } from '../apiError'
import { MOCK_TREE_POINTS } from './mockTree'
import { answersToMap, gradeAnswers, hasCompleteAnswers, toPublicQuestion } from './grading'
import {
  assertLessonAccessible,
  lessonStatus,
  MOCK_COURSE,
  nextLessonId,
  pendingReviewRefs,
  requireKnowledgePoint,
  requireLesson,
  requireTopic,
  reviewPackFor,
  testStatus,
  topicLessons,
  topicStatus,
  topicSummary,
} from './mockProgress'
import type { MockState, ReviewRecord } from './mockState'

const INCOMPLETE_ANSWERS = 'Cần trả lời đủ mọi câu trước khi nộp.'

export function listCourses(state: MockState): CourseSummary[] {
  const topics = listTopics(state)
  const passedTopicCount = topics.filter((topic) => topic.status === 'PASSED').length
  const courseTest = state.courseTests[MOCK_COURSE.id]
  let testStatus: CourseSummary['testStatus'] = 'LOCKED'
  if (courseTest?.passed) testStatus = 'PASSED'
  else if (passedTopicCount > 0 && passedTopicCount === topics.length) testStatus = 'AVAILABLE'
  return [{
    ...MOCK_COURSE,
    topicCount: topics.length,
    passedTopicCount,
    completedLessons: topics.reduce((sum, topic) => sum + topic.completedLessons, 0),
    totalLessons: topics.reduce((sum, topic) => sum + topic.totalLessons, 0),
    // The mock keeps no study times, so it never claims a last visit.
    lastStudiedAt: null,
    recommended: true,
    testStatus,
  }]
}

export function listTopics(state: MockState): TopicSummary[] {
  return [...MOCK_TOPICS].sort((a, b) => a.sequenceOrder - b.sequenceOrder).map((topic) => topicSummary(state, topic))
}

export function getTopicLessons(state: MockState, topicId: string): TopicLessonsResponse {
  const topic = requireTopic(topicId)
  if (topicStatus(state, topic) === 'LOCKED') throw new ApiError(403, 'TOPIC_LOCKED', 'Topic này chưa mở.', { topicId })
  const record = state.topicTests[topic.id]
  return {
    topic: topicSummary(state, topic),
    lessons: topicLessons(topic).map((lesson) => ({
      id: lesson.id,
      title: lesson.title,
      sortOrder: lesson.sortOrder,
      estimatedMinutes: lesson.estimatedMinutes,
      ...lessonStatus(state, lesson),
    })),
    finalTest: {
      title: topic.testTitle,
      testStatus: testStatus(state, topic),
      questionCount: topic.testQuestionCount,
      lastPercent: record?.lastPercent ?? null,
    },
    pendingReviews: pendingReviewRefs(state),
  }
}

export function getLesson(state: MockState, lessonId: string): LessonDetail {
  const lesson = requireLesson(lessonId)
  assertLessonAccessible(state, lesson)
  return {
    id: lesson.id,
    topicId: lesson.topicId,
    topicTitle: requireTopic(lesson.topicId).title,
    title: lesson.title,
    sortOrder: lesson.sortOrder,
    status: lessonStatus(state, lesson).status,
    nextLessonId: nextLessonId(lesson),
    pendingReviews: pendingReviewRefs(state),
  }
}

export function getLessonResources(state: MockState, lessonId: string): LessonResourcesResponse {
  const lesson = requireLesson(lessonId)
  assertLessonAccessible(state, lesson)
  const links = (items: typeof lesson.slides) => items.map((item, index) => ({ ...item, sortOrder: index }))
  return {
    lessonId: lesson.id,
    summaryMarkdown: lesson.summaryMarkdown,
    slides: links(lesson.slides),
    documents: links(lesson.documents),
  }
}

export function completeLesson(state: MockState, lessonId: string): LessonCompletionResult {
  const lesson = requireLesson(lessonId)
  assertLessonAccessible(state, lesson)
  if (!state.completedLessons.includes(lesson.id)) state.completedLessons.push(lesson.id)
  return { lessonCompleted: true, nextLessonId: nextLessonId(lesson), pendingReviews: pendingReviewRefs(state) }
}

function requireReview(state: MockState, reviewId: string): ReviewRecord {
  const review = state.reviews.find((candidate) => candidate.id === reviewId)
  if (!review) throw new ApiError(404, 'NOT_FOUND', 'Không tìm thấy bài ôn.')
  return review
}

const currentSetId = (review: ReviewRecord) => `${review.id}:${reviewPackFor(review.kpCode)[review.setIndex]?.packageCode ?? 'closed'}`

export function getReview(state: MockState, reviewId: string): ReviewDetail {
  const review = requireReview(state, reviewId)
  const kp = requireKnowledgePoint(review.kpCode)
  const theoryLesson = requireLesson(kp.theoryLessonId)
  const pack = reviewPackFor(review.kpCode)
  const set = review.status === 'PENDING' ? pack[review.setIndex] : undefined
  return {
    reviewId: review.id,
    topicId: review.topicId,
    status: review.status,
    stage: 'PRACTICE',
    knowledgePoint: { code: kp.code, title: kp.title },
    sourceLessonTitle: theoryLesson.title,
    theory: theoryLesson.summaryMarkdown ? [theoryLesson.summaryMarkdown] : [],
    set: set
      ? {
          setId: currentSetId(review),
          packageCode: set.packageCode,
          attemptNumber: review.setIndex + 1,
          maxAttempts: pack.length,
          passage: structuredClone(set.passage),
          audio: null,
          questions: set.questions.map(toPublicQuestion),
        }
      : null,
    failedSets: review.setIndex,
    maxFailedSets: pack.length,
    theoryReason: null,
    resumeLessonId: review.resumeLessonId,
    ...(review.blocking === false ? { blocking: false } : {}),
    ...(review.errorTrap ? { errorTrap: review.errorTrap } : {}),
  }
}

/** Tree points of the mock whose optional error-pattern review can be opened, and the review pack standing for each. */
const ERROR_PATTERN_PACKS: Record<string, string> = { R60_TFNG_F_VS_NG: 'KP5', R65_PARAPHRASE: 'KP2' }

/** Opens (or returns the open) optional review of a tree point whose repeated mistake is at PRIORITY. */
export function startErrorPatternReview(state: MockState, treePointId: string): { reviewId: string } {
  const point = MOCK_TREE_POINTS.find((candidate) => candidate.knowledgePointId === treePointId)
  const kpCode = point ? ERROR_PATTERN_PACKS[point.code] : undefined
  const weakest = point?.errorTraps?.filter((trap) => trap.tier === 'PRIORITY').sort((a, b) => a.mastery - b.mastery)[0]
  const errorTrap = weakest ? MOCK_ERROR_HINTS[weakest.code] : undefined
  if (!kpCode || !errorTrap) {
    throw new ApiError(404, 'NOT_FOUND', 'Mock chỉ có bộ ôn cho các điểm có lỗi lặp lại. Dùng HTTP thật để bắt đầu ôn.')
  }
  const open = state.reviews.find((review) => review.kpCode === kpCode && review.status === 'PENDING')
  if (open) return { reviewId: open.id }
  const lesson = requireLesson(requireKnowledgePoint(kpCode).theoryLessonId)
  const seq = state.seq++
  state.reviews.push({
    id: `mock-review-${seq}`, topicId: lesson.topicId, kpCode, resumeLessonId: lesson.id, status: 'PENDING',
    setIndex: 0, createdSeq: seq, blocking: false, errorTrap,
  })
  return { reviewId: `mock-review-${seq}` }
}

export function submitReview(state: MockState, reviewId: string, request: ReviewSubmissionRequest): ReviewSubmissionResult {
  const review = requireReview(state, reviewId)
  if (review.status !== 'PENDING' || request.setId !== currentSetId(review)) {
    throw new ApiError(409, 'REVIEW_SET_CLOSED', 'Bộ câu này đã đóng. Tải lại để nhận bộ câu mới.')
  }
  const pack = reviewPackFor(review.kpCode)
  const set = pack[review.setIndex]
  const answers = answersToMap(request.answers)
  if (!hasCompleteAnswers(set.questions, answers)) throw new ApiError(422, 'VALIDATION_FAILED', INCOMPLETE_ANSWERS)

  const outcome = gradeAnswers(set.questions, answers)
  if (outcome.passed) {
    review.status = 'DONE'
  } else {
    review.setIndex += 1
    if (review.setIndex >= pack.length) review.status = 'SKIPPED'
  }
  return {
    ...outcome,
    status: review.status,
    stage: 'PRACTICE',
    failedSets: review.setIndex,
    resumeLessonId: review.resumeLessonId,
    topicId: review.topicId,
    gamification: null,
  }
}
