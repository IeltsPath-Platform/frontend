import type {
  ExerciseBlockData,
  ExerciseSubmissionRequest,
  ExerciseSubmissionResult,
  LessonCompletionResult,
  LessonDetail,
  RawBlock,
  ReviewDetail,
  ReviewSubmissionRequest,
  ReviewSubmissionResult,
  TopicLessonsResponse,
  TopicSummary,
} from '~types/learningPath'
import type { MockLesson, MockLessonBlock } from '@/mocks/learning-path/contentTypes'
import { MOCK_TOPICS } from '@/mocks/learning-path/topics'
import { ApiError } from '../apiError'
import { answersToMap, gradeAnswers, hasCompleteAnswers, toPublicQuestion } from './grading'
import {
  assertLessonAccessible,
  exerciseBlocks,
  isMockExercise,
  lessonStatus,
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

function toPublicBlock(state: MockState, block: MockLessonBlock): RawBlock {
  if (!isMockExercise(block)) return structuredClone(block)
  const progress = state.exercises[block.id]
  const passedAnswers = progress?.state === 'PASSED' ? progress.savedAnswers : null
  const exercise: ExerciseBlockData = {
    id: block.id,
    sortOrder: block.sortOrder,
    type: 'EXERCISE',
    title: block.title,
    instructions: block.instructions,
    knowledgePointCode: block.knowledgePointCode,
    questions: block.questions.map(toPublicQuestion),
    state: progress?.state ?? 'NOT_ATTEMPTED',
    savedAnswers: passedAnswers ? { ...passedAnswers } : null,
    solutions: passedAnswers ? gradeAnswers(block.questions, passedAnswers).results : null,
  }
  return exercise
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
    blocks: [...lesson.blocks].sort((a, b) => a.sortOrder - b.sortOrder).map((block) => toPublicBlock(state, block)),
    nextLessonId: nextLessonId(lesson),
    pendingReviews: pendingReviewRefs(state),
  }
}

function markLessonCompleted(state: MockState, lesson: MockLesson) {
  state.completedLessons.push(lesson.id)
  for (const kpCode of state.flaggedKps[lesson.id] ?? []) {
    if (state.reviews.some((review) => review.kpCode === kpCode)) continue
    const createdSeq = state.seq++
    state.reviews.push({
      id: `review-${kpCode.toLowerCase()}-${createdSeq}`,
      topicId: lesson.topicId,
      kpCode,
      resumeLessonId: nextLessonId(lesson),
      status: 'PENDING',
      setIndex: 0,
      createdSeq,
    })
  }
  delete state.flaggedKps[lesson.id]
}

export function submitExercise(state: MockState, lessonId: string, blockId: string, request: ExerciseSubmissionRequest): ExerciseSubmissionResult {
  const lesson = requireLesson(lessonId)
  assertLessonAccessible(state, lesson)
  const block = exerciseBlocks(lesson).find((candidate) => candidate.id === blockId)
  if (!block) throw new ApiError(404, 'NOT_FOUND', 'Không tìm thấy khối bài tập.')
  const progress = state.exercises[block.id] ?? { state: 'NOT_ATTEMPTED', attempts: 0, savedAnswers: null }
  if (progress.state === 'PASSED') throw new ApiError(422, 'VALIDATION_FAILED', 'Khối bài tập này đã đạt.')
  const answers = answersToMap(request.answers)
  if (!hasCompleteAnswers(block.questions, answers)) throw new ApiError(422, 'VALIDATION_FAILED', INCOMPLETE_ANSWERS)

  const outcome = gradeAnswers(block.questions, answers)
  const isFirstAttempt = progress.attempts === 0
  if (isFirstAttempt && outcome.correctCount < outcome.totalCount && reviewPackFor(block.knowledgePointCode).length > 0) {
    state.flaggedKps[lesson.id] = [...new Set([...(state.flaggedKps[lesson.id] ?? []), block.knowledgePointCode])]
  }
  state.exercises[block.id] = {
    state: outcome.passed ? 'PASSED' : 'FAILED',
    attempts: progress.attempts + 1,
    savedAnswers: outcome.passed ? answers : null,
  }

  const allPassed = exerciseBlocks(lesson).every((candidate) => state.exercises[candidate.id]?.state === 'PASSED')
  const lessonCompleted = outcome.passed && allPassed && !state.completedLessons.includes(lesson.id)
  if (lessonCompleted) markLessonCompleted(state, lesson)

  return {
    blockId: block.id,
    ...outcome,
    lessonCompleted,
    nextLessonId: nextLessonId(lesson),
    pendingReviews: pendingReviewRefs(state),
  }
}

export function completeLesson(state: MockState, lessonId: string): LessonCompletionResult {
  const lesson = requireLesson(lessonId)
  assertLessonAccessible(state, lesson)
  if (exerciseBlocks(lesson).length > 0) {
    throw new ApiError(422, 'VALIDATION_FAILED', 'Bài này có bài tập, hãy nộp các khối bài tập để hoàn thành.')
  }
  if (!state.completedLessons.includes(lesson.id)) markLessonCompleted(state, lesson)
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
    knowledgePoint: { code: kp.code, title: kp.title },
    sourceLessonTitle: theoryLesson.title,
    theory: theoryLesson.blocks.filter((block) => block.type === 'TEXT').map((block) => structuredClone(block)),
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
    resumeLessonId: review.resumeLessonId,
  }
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
  return { ...outcome, status: review.status, resumeLessonId: review.resumeLessonId, topicId: review.topicId }
}
