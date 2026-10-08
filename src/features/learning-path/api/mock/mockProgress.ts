import type { CourseRef, LessonStatus, ReviewRef, TestStatus, TopicStatus, TopicSummary } from '~types/learningPath'
import type { MockExerciseBlock, MockKnowledgePoint, MockLesson, MockTopic } from '@/mocks/learning-path/contentTypes'
import { MOCK_LESSONS } from '@/mocks/learning-path/lessons'
import { MOCK_REVIEW_PACKS } from '@/mocks/learning-path/reviewPacks'
import { MOCK_TEST_PACKAGES } from '@/mocks/learning-path/topicTests'
import { MOCK_KNOWLEDGE_POINTS, MOCK_TOPICS } from '@/mocks/learning-path/topics'
import { ApiError } from '../apiError'
import type { MockState, ReviewRecord } from './mockState'

export const findTopic = (id: string) => MOCK_TOPICS.find((topic) => topic.id === id)
export const findLesson = (id: string) => MOCK_LESSONS.find((lesson) => lesson.id === id)
export const findKnowledgePoint = (code: string) => MOCK_KNOWLEDGE_POINTS.find((kp) => kp.code === code)
export const findTestPackage = (code: string) => MOCK_TEST_PACKAGES.find((pkg) => pkg.code === code)
export const reviewPackFor = (kpCode: string) => MOCK_REVIEW_PACKS[kpCode] ?? []

export function requireTopic(id: string): MockTopic {
  const topic = findTopic(id)
  if (!topic) throw new ApiError(404, 'NOT_FOUND', 'Không tìm thấy topic.')
  return topic
}

export function requireLesson(id: string): MockLesson {
  const lesson = findLesson(id)
  if (!lesson) throw new ApiError(404, 'NOT_FOUND', 'Không tìm thấy bài học.')
  return lesson
}

export function requireKnowledgePoint(code: string): MockKnowledgePoint {
  const kp = findKnowledgePoint(code)
  if (!kp) throw new ApiError(404, 'NOT_FOUND', 'Không tìm thấy điểm kiến thức.')
  return kp
}

export function isMockExercise(block: MockLesson['blocks'][number]): block is MockExerciseBlock {
  return block.type === 'EXERCISE' && Array.isArray(block.questions)
}

export function exerciseBlocks(lesson: MockLesson) {
  return lesson.blocks.filter(isMockExercise)
}

export function topicLessons(topic: MockTopic) {
  return topic.lessonIds.map(requireLesson).sort((a, b) => a.sortOrder - b.sortOrder)
}

export function nextLessonId(lesson: MockLesson) {
  const lessons = topicLessons(requireTopic(lesson.topicId))
  return lessons[lessons.findIndex((candidate) => candidate.id === lesson.id) + 1]?.id ?? null
}

export function pendingReviews(state: MockState) {
  return state.reviews.filter((review) => review.status === 'PENDING').sort((a, b) => a.createdSeq - b.createdSeq)
}

export function toReviewRef(review: ReviewRecord): ReviewRef {
  const kp = requireKnowledgePoint(review.kpCode)
  return { reviewId: review.id, knowledgePointCode: kp.code, knowledgePointTitle: kp.title }
}

export const pendingReviewRefs = (state: MockState) => pendingReviews(state).map(toReviewRef)

function previousTopic(topic: MockTopic) {
  return MOCK_TOPICS.filter((candidate) => candidate.sequenceOrder < topic.sequenceOrder)
    .sort((a, b) => b.sequenceOrder - a.sequenceOrder)[0]
}

export function topicStatus(state: MockState, topic: MockTopic): TopicStatus {
  if (state.topicTests[topic.id]?.passed) return 'PASSED'
  const previous = previousTopic(topic)
  return !previous || state.topicTests[previous.id]?.passed ? 'IN_PROGRESS' : 'LOCKED'
}

export function lessonStatus(state: MockState, lesson: MockLesson): { status: LessonStatus; lockedReason: string | null } {
  if (state.completedLessons.includes(lesson.id)) return { status: 'COMPLETED', lockedReason: null }
  const topic = requireTopic(lesson.topicId)
  if (topicStatus(state, topic) === 'LOCKED') return { status: 'LOCKED', lockedReason: 'Topic này chưa mở.' }
  const lessons = topicLessons(topic)
  const previous = lessons[lessons.findIndex((candidate) => candidate.id === lesson.id) - 1]
  if (previous && !state.completedLessons.includes(previous.id)) {
    return { status: 'LOCKED', lockedReason: `Hoàn thành "${previous.title}" để mở bài này.` }
  }
  if (pendingReviews(state).length > 0) return { status: 'LOCKED', lockedReason: 'Cần làm bài ôn trước khi học tiếp.' }
  return { status: 'AVAILABLE', lockedReason: null }
}

export function testStatus(state: MockState, topic: MockTopic): TestStatus {
  if (state.topicTests[topic.id]?.passed) return 'PASSED'
  const allDone = topic.lessonIds.every((id) => state.completedLessons.includes(id))
  return allDone && topicStatus(state, topic) !== 'LOCKED' && pendingReviews(state).length === 0 ? 'AVAILABLE' : 'LOCKED'
}

/** The mock has a single course holding every mock topic. */
export const MOCK_COURSE: CourseRef = { id: 'mock-course', code: 'IELTS_DEMO', title: 'IELTS Demo', bandLevel: 5.5 }

export function topicSummary(state: MockState, topic: MockTopic): TopicSummary {
  const status = topicStatus(state, topic)
  const previous = previousTopic(topic)
  return {
    id: topic.id,
    course: MOCK_COURSE,
    code: topic.code,
    title: topic.title,
    description: topic.description,
    sequenceOrder: topic.sequenceOrder,
    status,
    completedLessons: topic.lessonIds.filter((id) => state.completedLessons.includes(id)).length,
    totalLessons: topic.lessonIds.length,
    lockedReason: status === 'LOCKED' && previous ? `Đạt bài kiểm tra cuối của "${previous.title}" để mở.` : null,
  }
}

/** Shared gate for reading and writing a lesson. Completed lessons stay readable during a pending review. */
export function assertLessonAccessible(state: MockState, lesson: MockLesson) {
  const topic = requireTopic(lesson.topicId)
  if (topicStatus(state, topic) === 'LOCKED') {
    throw new ApiError(403, 'TOPIC_LOCKED', 'Topic này chưa mở.', { topicId: topic.id })
  }
  const { status } = lessonStatus(state, lesson)
  if (status === 'COMPLETED') return
  const reviews = pendingReviewRefs(state)
  if (reviews.length > 0) {
    throw new ApiError(403, 'REVIEW_REQUIRED', 'Cần ôn lại trước khi học tiếp.', { reviews, topicId: topic.id })
  }
  if (status === 'LOCKED') {
    throw new ApiError(403, 'LESSON_LOCKED', 'Bài học này chưa mở.', { topicId: topic.id, lessonId: lesson.id })
  }
}
