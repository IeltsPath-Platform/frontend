import type {
  AssessmentAttempt,
  AttemptItemResponse,
  AttemptResult,
  AttemptStructure,
  SaveItemResponseRequest,
  StartAttemptRequest,
  TestAssignment,
} from '~types/learningPath'
import type { MockQuestion, MockTestPackage } from '@/mocks/learning-path/contentTypes'
import { MOCK_TOPICS, MOCK_LEARNER } from '@/mocks/learning-path/topics'
import { ApiError } from '../apiError'
import { formatAnswerValue, gradeAnswers, toPublicQuestion } from './grading'
import { findTestPackage, pendingReviewRefs, requireTopic, testStatus, topicStatus } from './mockProgress'
import type { AttemptRecord, MockState } from './mockState'

const itemIdOf = (attemptId: string, question: MockQuestion) => `${attemptId}-${question.id}`

function requireAttempt(state: MockState, attemptId: string): AttemptRecord {
  const attempt = state.attempts[attemptId]
  if (!attempt) throw new ApiError(404, 'NOT_FOUND', 'Không tìm thấy lượt làm bài.')
  return attempt
}

function requirePackage(code: string): MockTestPackage {
  const pkg = findTestPackage(code)
  if (!pkg) throw new ApiError(404, 'NOT_FOUND', 'Không tìm thấy đề kiểm tra.')
  return pkg
}

const packageQuestions = (pkg: MockTestPackage) => pkg.sections.flatMap((section) => section.questions)

function toAttemptDto(attempt: AttemptRecord): AssessmentAttempt {
  return {
    id: attempt.id,
    userId: MOCK_LEARNER.id,
    packageVersionId: attempt.packageVersionId,
    attemptType: 'TOPIC_TEST',
    mode: 'PRACTICE',
    channel: 'WEB',
    status: attempt.status,
    startedAt: attempt.startedAt,
    submittedAt: attempt.submittedAt,
    expiresAt: null,
    rowVersion: attempt.rowVersion,
    createdAt: attempt.startedAt,
    updatedAt: attempt.submittedAt ?? attempt.startedAt,
  }
}

export function createTestAssignment(state: MockState, topicId: string): TestAssignment {
  const topic = requireTopic(topicId)
  if (topicStatus(state, topic) === 'LOCKED') throw new ApiError(403, 'TOPIC_LOCKED', 'Topic này chưa mở.', { topicId })
  const reviews = pendingReviewRefs(state)
  if (reviews.length > 0) throw new ApiError(403, 'REVIEW_REQUIRED', 'Cần ôn lại trước khi làm bài kiểm tra.', { reviews, topicId })
  const status = testStatus(state, topic)
  if (status === 'PASSED') throw new ApiError(422, 'VALIDATION_FAILED', 'Bạn đã đạt bài kiểm tra này.')
  if (status === 'LOCKED') throw new ApiError(403, 'TEST_LOCKED', 'Hoàn thành mọi bài học để mở bài kiểm tra.', { topicId })
  if (topic.testPackageCodes.length === 0) throw new ApiError(409, 'TEST_UNAVAILABLE', 'Topic này chưa có đề kiểm tra.', { topicId })

  const record = state.topicTests[topic.id] ?? { passed: false, assignmentCount: 0, lastPercent: null }
  const pkg = requirePackage(topic.testPackageCodes[record.assignmentCount % topic.testPackageCodes.length])
  state.topicTests[topic.id] = { ...record, assignmentCount: record.assignmentCount + 1 }
  const assignment = { id: `assign-${state.seq++}`, topicId: topic.id, packageCode: pkg.code, packageVersionId: pkg.packageVersionId }
  state.assignments[assignment.id] = assignment
  return { assignmentId: assignment.id, topicId: topic.id, packageVersionId: pkg.packageVersionId, packageCode: pkg.code }
}

export function createAttempt(state: MockState, request: StartAttemptRequest, now: string): AssessmentAttempt {
  const assignment = Object.values(state.assignments).reverse().find((candidate) => candidate.packageVersionId === request.packageVersionId)
  if (!assignment) throw new ApiError(422, 'VALIDATION_FAILED', 'Mã đề này chưa được giao cho bạn.')
  const attempt: AttemptRecord = {
    id: `attempt-${state.seq++}`,
    topicId: assignment.topicId,
    packageCode: assignment.packageCode,
    packageVersionId: assignment.packageVersionId,
    status: 'IN_PROGRESS',
    startedAt: now,
    submittedAt: null,
    rowVersion: 0,
    responses: {},
    result: null,
  }
  state.attempts[attempt.id] = attempt
  return toAttemptDto(attempt)
}

export function getAttemptStructure(state: MockState, attemptId: string): AttemptStructure {
  const attempt = requireAttempt(state, attemptId)
  const pkg = requirePackage(attempt.packageCode)
  return {
    sections: pkg.sections.map((section, sectionIndex) => ({
      id: `${attempt.id}-${section.id}`,
      contentSectionId: section.id,
      sortOrder: sectionIndex + 1,
      snapshot: JSON.stringify({ title: section.title, instructions: section.instructions, passage: section.passage }),
      items: section.questions.map((question, itemIndex) => {
        const { number, prompt, options } = toPublicQuestion(question)
        return {
          id: itemIdOf(attempt.id, question),
          questionVersionId: `${question.id}-v1`,
          sortOrder: itemIndex + 1,
          questionSnapshot: JSON.stringify({ number, prompt, options }),
          answerSnapshot: null,
          knowledgeSnapshot: null,
        }
      }),
    })),
  }
}

function parseAnswerPayload(payload: string) {
  try {
    const parsed: unknown = JSON.parse(payload)
    if (parsed && typeof parsed === 'object' && 'answer' in parsed && typeof parsed.answer === 'string') return parsed.answer
  } catch {
    // Falls through to the validation error below.
  }
  throw new ApiError(422, 'VALIDATION_FAILED', 'payload phải là chuỗi JSON dạng {"answer":"…"}.')
}

/** The mock records revisions but does not reject a stale `expectedRevision`. */
export function saveItemResponse(state: MockState, attemptId: string, itemId: string, request: SaveItemResponseRequest, now: string): AttemptItemResponse {
  const attempt = requireAttempt(state, attemptId)
  if (attempt.status !== 'IN_PROGRESS') throw new ApiError(422, 'VALIDATION_FAILED', 'Lượt làm bài đã nộp.')
  const question = packageQuestions(requirePackage(attempt.packageCode)).find((candidate) => itemIdOf(attempt.id, candidate) === itemId)
  if (!question) throw new ApiError(404, 'NOT_FOUND', 'Không tìm thấy câu hỏi trong lượt làm bài.')
  const answer = parseAnswerPayload(request.payload)
  const previous = attempt.responses[itemId]
  const record = { id: previous?.id ?? `resp-${state.seq++}`, payload: request.payload, answer, revision: (previous?.revision ?? 0) + 1, savedAt: now }
  attempt.responses[itemId] = record
  attempt.rowVersion += 1
  return { id: record.id, attemptItemId: itemId, payload: record.payload, schemaVersion: request.schemaVersion, revision: record.revision, savedAt: now, submittedAt: null }
}

export function submitAttempt(state: MockState, attemptId: string, now: string): AssessmentAttempt {
  const attempt = requireAttempt(state, attemptId)
  if (attempt.status === 'SUBMITTED') return toAttemptDto(attempt)
  const questions = packageQuestions(requirePackage(attempt.packageCode))
  const answers = Object.fromEntries(questions.map((question) => [question.id, attempt.responses[itemIdOf(attempt.id, question)]?.answer ?? '']))
  const outcome = gradeAnswers(questions, answers)

  const record = state.topicTests[attempt.topicId] ?? { passed: false, assignmentCount: 0, lastPercent: null }
  state.topicTests[attempt.topicId] = { ...record, passed: record.passed || outcome.passed, lastPercent: outcome.percent }
  const topic = requireTopic(attempt.topicId)
  const nextTopic = MOCK_TOPICS.find((candidate) => candidate.sequenceOrder === topic.sequenceOrder + 1)

  const result: AttemptResult = {
    attemptId: attempt.id,
    topicId: topic.id,
    packageCode: attempt.packageCode,
    score: outcome.correctCount,
    maxScore: outcome.totalCount,
    percent: outcome.percent,
    passed: outcome.passed,
    items: questions.map((question, index) => {
      const answer = answers[question.id]
      const { correct, correctAnswer, explanation } = outcome.results[index]
      return {
        itemId: itemIdOf(attempt.id, question),
        number: question.number,
        prompt: question.prompt,
        correct,
        yourAnswer: answer ? formatAnswerValue(question, answer) : null,
        ...(outcome.passed ? { correctAnswer, explanation } : {}),
      }
    }),
    topicStatus: topicStatus(state, topic),
    nextTopicId: outcome.passed ? nextTopic?.id ?? null : null,
  }
  attempt.status = 'SUBMITTED'
  attempt.submittedAt = now
  attempt.rowVersion += 1
  attempt.result = result
  return toAttemptDto(attempt)
}

export function getAttemptResult(state: MockState, attemptId: string): AttemptResult {
  const attempt = requireAttempt(state, attemptId)
  if (!attempt.result) throw new ApiError(422, 'VALIDATION_FAILED', 'Lượt làm bài chưa được nộp.')
  return attempt.result
}
