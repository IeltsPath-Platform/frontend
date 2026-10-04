import assert from 'node:assert/strict'
import { after, before, describe, test } from 'node:test'
import { createElement } from 'react'
import { renderToString } from 'react-dom/server'
import { MemoryRouter } from 'react-router-dom'
import { createServer } from 'vite'

let server
let createMockLearningApi

before(async () => {
  server = await createServer({ server: { middlewareMode: true }, appType: 'custom' })
  ;({ createMockLearningApi } = await server.ssrLoadModule('/src/features/learning-path/api/mock/mockLearningApi.ts'))
})
after(async () => { await server?.close() })

let requestCounter = 0
const nextRequestId = () => `req-${++requestCounter}`
const toAnswers = (map) => Object.entries(map).map(([questionId, answer]) => ({ questionId, answer }))

const CORRECT = {
  'l1-ex': { 'q-l1-1': 'B', 'q-l1-2': 'B', 'q-l1-3': ' Independence ' },
  'l2-ex': { 'q-l2-4': 'sixteen', 'q-l2-5': 'B', 'q-l2-6': '1869' },
  'l3-ex-main': { 'q-l3-7': 'C', 'q-l3-8': 'B' },
  'l3-ex-gap': { 'q-l3-9': 'structural' },
  'l4-ex': { 'q-l4-10': 'TRUE', 'q-l4-11': 'FALSE' },
}
const LESSON_BLOCKS = { 'lesson-l1': ['l1-ex'], 'lesson-l2': ['l2-ex'], 'lesson-l3': ['l3-ex-main', 'l3-ex-gap'], 'lesson-l4': ['l4-ex'] }
const REVIEW_KP1 = {
  'PS-KP1-A': { right: { 'r-kp1a-1': '1916', 'r-kp1a-2': 'A' }, wrong: { 'r-kp1a-1': '1891', 'r-kp1a-2': 'A' } },
  'PS-KP1-B': { wrong: { 'r-kp1b-1': '18038', 'r-kp1b-2': 'B' } },
  'PS-KP1-C': { wrong: { 'r-kp1c-1': '80', 'r-kp1c-2': 'C' } },
}

const submit = (api, lessonId, blockId, answers, requestId = nextRequestId()) =>
  api.submitExercise(lessonId, blockId, { requestId, answers: toAnswers(answers) })

async function passLesson(api, lessonId) {
  let last
  for (const blockId of LESSON_BLOCKS[lessonId]) last = await submit(api, lessonId, blockId, CORRECT[blockId])
  return last
}

async function finishL2WithReview(api) {
  await passLesson(api, 'lesson-l1')
  const failed = await submit(api, 'lesson-l2', 'l2-ex', { ...CORRECT['l2-ex'], 'q-l2-5': 'A' })
  const fixed = await submit(api, 'lesson-l2', 'l2-ex', CORRECT['l2-ex'])
  return { failed, fixed }
}

async function takeTest(api, topicId, answersByNumber) {
  const assignment = await api.createTestAssignment(topicId)
  const attempt = await api.createAttempt({ packageVersionId: assignment.packageVersionId, attemptType: 'TOPIC_TEST', mode: 'PRACTICE', channel: 'WEB', expiresAt: null })
  const structure = await api.getAttemptStructure(attempt.id)
  for (const section of structure.sections) {
    for (const item of section.items) {
      const { number } = JSON.parse(item.questionSnapshot)
      await api.saveItemResponse(attempt.id, item.id, { payload: JSON.stringify({ answer: answersByNumber[number] }), schemaVersion: 1, expectedRevision: 0 })
    }
  }
  await api.submitAttempt(attempt.id)
  return { assignment, attempt, structure, result: await api.getAttemptResult(attempt.id) }
}

const statusesOf = (detail) => detail.lessons.map((lesson) => lesson.status)

describe('Lan demo scenario', () => {
  test('runs from the first lesson to unlocking TFNG_SKILLS', async () => {
    const api = createMockLearningApi()

    const topics = await api.listTopics()
    assert.deepEqual(topics.map((topic) => [topic.code, topic.status]), [['DEMO_READING', 'IN_PROGRESS'], ['TFNG_SKILLS', 'LOCKED'], ['MATCHING_HEADINGS', 'LOCKED']])
    assert.match(topics[1].lockedReason, /Đọc hiểu nền tảng/)
    let detail = await api.getTopicLessons('topic-demo-reading')
    assert.deepEqual(statusesOf(detail), ['AVAILABLE', 'LOCKED', 'LOCKED', 'LOCKED'])
    assert.equal(detail.finalTest.testStatus, 'LOCKED')
    await assert.rejects(api.getLesson('lesson-l2'), { code: 'LESSON_LOCKED', status: 403 })
    await assert.rejects(api.getTopicLessons('topic-tfng-skills'), { code: 'TOPIC_LOCKED' })

    const l1 = await api.getLesson('lesson-l1')
    assert.deepEqual(l1.blocks.map((block) => block.type), ['TEXT', 'ASSET', 'EXERCISE'])
    assert.doesNotMatch(JSON.stringify(l1), /accepted|explanation|correctAnswer/)
    const l1Result = await passLesson(api, 'lesson-l1')
    assert.equal(l1Result.lessonCompleted, true)
    assert.equal(l1Result.nextLessonId, 'lesson-l2')
    assert.deepEqual(l1Result.pendingReviews, [])

    const l2Fail = await submit(api, 'lesson-l2', 'l2-ex', { ...CORRECT['l2-ex'], 'q-l2-5': 'A' })
    assert.equal(l2Fail.passed, false)
    assert.equal(l2Fail.percent, 67)
    assert.deepEqual(l2Fail.results.map((result) => result.correct), [true, false, true])
    assert.ok(l2Fail.results.every((result) => !('correctAnswer' in result) && !('explanation' in result)))
    assert.equal(l2Fail.lessonCompleted, false)

    const l2Pass = await submit(api, 'lesson-l2', 'l2-ex', CORRECT['l2-ex'])
    assert.equal(l2Pass.passed, true)
    assert.equal(l2Pass.lessonCompleted, true)
    assert.equal(l2Pass.results[1].correctAnswer, 'B. Taeping')
    assert.match(l2Pass.results[1].explanation, /Taeping/)
    assert.equal(l2Pass.pendingReviews.length, 1)
    assert.equal(l2Pass.pendingReviews[0].knowledgePointCode, 'KP1')
    const reviewId = l2Pass.pendingReviews[0].reviewId

    detail = await api.getTopicLessons('topic-demo-reading')
    assert.deepEqual(statusesOf(detail), ['COMPLETED', 'COMPLETED', 'LOCKED', 'LOCKED'])
    assert.match(detail.lessons[2].lockedReason, /bài ôn/)
    await assert.rejects(api.getLesson('lesson-l3'), (error) => error.code === 'REVIEW_REQUIRED' && error.details.reviews[0].reviewId === reviewId)
    await assert.rejects(api.createTestAssignment('topic-demo-reading'), { code: 'REVIEW_REQUIRED' })
    const reopened = await api.getLesson('lesson-l2')
    const reopenedBlock = reopened.blocks.find((block) => block.type === 'EXERCISE')
    assert.equal(reopenedBlock.state, 'PASSED')
    assert.equal(reopenedBlock.savedAnswers['q-l2-5'], 'B')
    assert.equal(reopenedBlock.solutions.length, 3)

    const review = await api.getReview(reviewId)
    assert.equal(review.status, 'PENDING')
    assert.equal(review.set.packageCode, 'PS-KP1-A')
    assert.equal(review.sourceLessonTitle, 'Scanning: tìm thông tin cụ thể')
    assert.ok(review.theory.length > 0 && review.theory.every((block) => block.type === 'TEXT'))
    assert.match(review.theory[0].text, /Scanning/)
    const reviewPass = await api.submitReview(reviewId, { requestId: nextRequestId(), setId: review.set.setId, answers: toAnswers(REVIEW_KP1['PS-KP1-A'].right) })
    assert.equal(reviewPass.status, 'DONE')
    assert.ok(reviewPass.results.every((result) => typeof result.correctAnswer === 'string'))
    assert.equal(reviewPass.resumeLessonId, 'lesson-l3')

    detail = await api.getTopicLessons('topic-demo-reading')
    assert.deepEqual(statusesOf(detail), ['COMPLETED', 'COMPLETED', 'AVAILABLE', 'LOCKED'])
    const l3 = await api.getLesson('lesson-l3')
    assert.ok(l3.blocks.some((block) => block.type === 'VOCABULARY'))
    const l3First = await submit(api, 'lesson-l3', 'l3-ex-main', CORRECT['l3-ex-main'])
    assert.equal(l3First.passed, true)
    assert.equal(l3First.lessonCompleted, false, 'the second exercise block is still open')
    await submit(api, 'lesson-l3', 'l3-ex-gap', CORRECT['l3-ex-gap'])
    const l4 = await api.getLesson('lesson-l4')
    assert.ok(l4.blocks.some((block) => block.type === 'ASSET' && block.mediaUrl))
    const l4Result = await passLesson(api, 'lesson-l4')
    assert.equal(l4Result.lessonCompleted, true)
    assert.equal(l4Result.nextLessonId, null)

    detail = await api.getTopicLessons('topic-demo-reading')
    assert.equal(detail.finalTest.testStatus, 'AVAILABLE')
    const { assignment, attempt, structure, result } = await takeTest(api, 'topic-demo-reading', { 12: 'B', 13: 'TRUE', 14: 'oil', 15: 'TRUE' })
    assert.equal(assignment.packageCode, 'X1')
    assert.equal(attempt.expiresAt, null)
    assert.equal(structure.sections.length, 2)
    assert.equal(typeof structure.sections[0].snapshot, 'string')
    assert.equal(JSON.parse(structure.sections[0].snapshot).passage.title, 'Coffee Houses of London')
    assert.deepEqual([result.score, result.maxScore, result.percent, result.passed], [3, 4, 75, true])
    assert.deepEqual(result.items.map((item) => [item.number, item.correct]), [[12, true], [13, true], [14, true], [15, false]])
    assert.equal(result.items[3].correctAnswer, 'NOT GIVEN')
    assert.equal(result.topicStatus, 'PASSED')
    assert.equal(result.nextTopicId, 'topic-tfng-skills')

    const after = await api.listTopics()
    assert.deepEqual(after.map((topic) => topic.status), ['PASSED', 'IN_PROGRESS', 'LOCKED'])
    assert.equal((await api.getTopicLessons('topic-demo-reading')).finalTest.testStatus, 'PASSED')
  })

  test('failing three review sets marks the review SKIPPED and still unlocks the next lesson', async () => {
    const api = createMockLearningApi()
    const { fixed } = await finishL2WithReview(api)
    const reviewId = fixed.pendingReviews[0].reviewId

    let review = await api.getReview(reviewId)
    const staleSetId = review.set.setId
    let outcome = await api.submitReview(reviewId, { requestId: nextRequestId(), setId: review.set.setId, answers: toAnswers(REVIEW_KP1['PS-KP1-A'].wrong) })
    assert.equal(outcome.status, 'PENDING')
    assert.equal(outcome.passed, false)
    assert.ok(outcome.results.every((result) => !('correctAnswer' in result)))
    await assert.rejects(api.submitReview(reviewId, { requestId: nextRequestId(), setId: staleSetId, answers: toAnswers(REVIEW_KP1['PS-KP1-A'].right) }), { code: 'REVIEW_SET_CLOSED' })

    review = await api.getReview(reviewId)
    assert.equal(review.set.packageCode, 'PS-KP1-B')
    assert.equal(review.set.attemptNumber, 2)
    outcome = await api.submitReview(reviewId, { requestId: nextRequestId(), setId: review.set.setId, answers: toAnswers(REVIEW_KP1['PS-KP1-B'].wrong) })
    assert.equal(outcome.status, 'PENDING')

    review = await api.getReview(reviewId)
    assert.equal(review.set.packageCode, 'PS-KP1-C')
    outcome = await api.submitReview(reviewId, { requestId: nextRequestId(), setId: review.set.setId, answers: toAnswers(REVIEW_KP1['PS-KP1-C'].wrong) })
    assert.equal(outcome.status, 'SKIPPED')
    assert.equal((await api.getReview(reviewId)).set, null)

    const detail = await api.getTopicLessons('topic-demo-reading')
    assert.equal(detail.lessons[2].status, 'AVAILABLE')
    assert.deepEqual(detail.pendingReviews, [])
  })

  test('a learner who answers everything right first time never meets a review', async () => {
    const api = createMockLearningApi()
    for (const lessonId of Object.keys(LESSON_BLOCKS)) {
      const outcome = await passLesson(api, lessonId)
      assert.deepEqual(outcome.pendingReviews, [], lessonId)
    }
    const { result } = await takeTest(api, 'topic-demo-reading', { 12: 'B', 13: 'TRUE', 14: 'oil', 15: 'NOT GIVEN' })
    assert.equal(result.percent, 100)
  })

  test('a first-attempt mistake on KP5 (no practice pack) never inserts a review', async () => {
    const api = createMockLearningApi()
    for (const lessonId of ['lesson-l1', 'lesson-l2', 'lesson-l3']) await passLesson(api, lessonId)
    await submit(api, 'lesson-l4', 'l4-ex', { 'q-l4-10': 'TRUE', 'q-l4-11': 'NOT GIVEN' })
    const outcome = await submit(api, 'lesson-l4', 'l4-ex', CORRECT['l4-ex'])
    assert.equal(outcome.lessonCompleted, true)
    assert.deepEqual(outcome.pendingReviews, [])
  })
})

describe('mock API contract', () => {
  test('replaying a requestId returns the stored outcome without grading twice', async () => {
    const api = createMockLearningApi()
    const first = await submit(api, 'lesson-l1', 'l1-ex', CORRECT['l1-ex'], 'same-request')
    const replay = await submit(api, 'lesson-l1', 'l1-ex', CORRECT['l1-ex'], 'same-request')
    assert.deepEqual(replay, first)
    await assert.rejects(submit(api, 'lesson-l1', 'l1-ex', CORRECT['l1-ex']), { code: 'VALIDATION_FAILED' })
  })

  test('incomplete answers are rejected with 422', async () => {
    const api = createMockLearningApi()
    await assert.rejects(submit(api, 'lesson-l1', 'l1-ex', { 'q-l1-1': 'B', 'q-l1-2': 'B', 'q-l1-3': '  ' }), { code: 'VALIDATION_FAILED', status: 422 })
  })

  test('a failed final test is retaken with a different package and hides solutions', async () => {
    const api = createMockLearningApi()
    for (const lessonId of Object.keys(LESSON_BLOCKS)) await passLesson(api, lessonId)
    const first = await takeTest(api, 'topic-demo-reading', { 12: 'A', 13: 'FALSE', 14: 'water', 15: 'NOT GIVEN' })
    assert.equal(first.result.passed, false)
    assert.ok(first.result.items.every((item) => !('correctAnswer' in item) && !('explanation' in item)))
    assert.equal(first.result.topicStatus, 'IN_PROGRESS')
    assert.equal((await api.getTopicLessons('topic-demo-reading')).finalTest.lastPercent, 25)
    const second = await api.createTestAssignment('topic-demo-reading')
    assert.equal(second.packageCode, 'X2')
  })

  test('topic without packages reports TEST_UNAVAILABLE and text-only lessons complete explicitly', async () => {
    const api = createMockLearningApi()
    for (const lessonId of Object.keys(LESSON_BLOCKS)) await passLesson(api, lessonId)
    await takeTest(api, 'topic-demo-reading', { 12: 'B', 13: 'TRUE', 14: 'oil', 15: 'NOT GIVEN' })

    await assert.rejects(api.completeLesson('lesson-l1'), { code: 'VALIDATION_FAILED' })
    const tfng1 = await api.getLesson('lesson-tfng-1')
    assert.ok(tfng1.blocks.every((block) => block.type === 'TEXT'))
    const completion = await api.completeLesson('lesson-tfng-1')
    assert.deepEqual(completion, { lessonCompleted: true, nextLessonId: 'lesson-tfng-2', pendingReviews: [] })
    await submit(api, 'lesson-tfng-2', 'tfng2-ex', { 'q-tfng2-1': 'TRUE', 'q-tfng2-2': 'FALSE', 'q-tfng2-3': 'NOT GIVEN' })
    assert.equal((await api.getTopicLessons('topic-tfng-skills')).finalTest.testStatus, 'AVAILABLE')
    await assert.rejects(api.createTestAssignment('topic-tfng-skills'), { code: 'TEST_UNAVAILABLE' })
  })

  test('unknown ids are NOT_FOUND and a locked final test is TEST_LOCKED', async () => {
    const api = createMockLearningApi()
    await assert.rejects(api.getLesson('lesson-missing'), { code: 'NOT_FOUND', status: 404 })
    await assert.rejects(api.getReview('review-missing'), { code: 'NOT_FOUND' })
    await assert.rejects(api.createTestAssignment('topic-demo-reading'), { code: 'TEST_LOCKED' })
  })

  test('server failure mode fails every call with a 500 until switched off, without touching progress', async () => {
    const api = createMockLearningApi()
    api.setServerFailing(true)
    await assert.rejects(api.listTopics(), { code: 'SERVER_ERROR', status: 500 })
    await assert.rejects(submit(api, 'lesson-l1', 'l1-ex', CORRECT['l1-ex']), { code: 'SERVER_ERROR' })
    api.setServerFailing(false)
    assert.equal((await api.listTopics()).length, 3)
    assert.equal((await api.getTopicLessons('topic-demo-reading')).lessons[0].status, 'AVAILABLE')
  })

  test('pending reviews survive a cold hydrate after localStorage restore', async () => {
    const memory = new Map()
    const storage = { getItem: (key) => memory.get(key) ?? null, setItem: (key, value) => memory.set(key, value), removeItem: (key) => memory.delete(key) }
    const api = createMockLearningApi({ storage })
    await finishL2WithReview(api)
    assert.equal((await api.getPendingReviews()).length, 1)
    assert.equal((await api.getPendingReviews())[0].knowledgePointCode, 'KP1')

    const restored = createMockLearningApi({ storage })
    assert.equal((await restored.getPendingReviews()).length, 1)
    assert.equal((await restored.getLesson('lesson-l2')).pendingReviews[0].reviewId, (await restored.getPendingReviews())[0].reviewId)
  })

  test('progress persists through storage and reset clears it', async () => {
    const memory = new Map()
    const storage = { getItem: (key) => memory.get(key) ?? null, setItem: (key, value) => memory.set(key, value), removeItem: (key) => memory.delete(key) }
    const api = createMockLearningApi({ storage })
    await passLesson(api, 'lesson-l1')

    const restored = createMockLearningApi({ storage })
    assert.equal((await restored.getTopicLessons('topic-demo-reading')).lessons[1].status, 'AVAILABLE')
    restored.reset()
    assert.equal(memory.size, 0)
    assert.equal((await restored.getTopicLessons('topic-demo-reading')).lessons[1].status, 'LOCKED')
  })
})

describe('learning path rendering', () => {
  const noopContext = { submitExercise: () => Promise.reject(new Error('not used')) }

  async function render(modulePath, name, props, path = '/learn') {
    const module = await server.ssrLoadModule(modulePath)
    return renderToString(createElement(MemoryRouter, { initialEntries: [path] }, createElement(module[name], props)))
  }

  const renderBlocks = (blocks) => render('/src/features/learning-path/components/blocks/BlockList.tsx', 'BlockList', { blocks, context: noopContext })

  test('topic trail links open topics and explains locked ones without a link', async () => {
    const topics = await createMockLearningApi().listTopics()
    const html = await render('/src/features/learning-path/pages/TopicListPage.tsx', 'TopicTrail', { topics })

    assert.match(html, /href="\/learn\/topics\/topic-demo-reading"/)
    assert.doesNotMatch(html, /href="\/learn\/topics\/topic-tfng-skills"/)
    assert.match(html, /aria-disabled="true"/)
    assert.match(html, /Đạt bài kiểm tra cuối của/)
    assert.match(html, /0<!-- -->\/<!-- -->4<!-- --> bài đã xong/)
  })

  test('topic detail only links open lessons and keeps the final test locked', async () => {
    const detail = await createMockLearningApi().getTopicLessons('topic-demo-reading')
    const html = await render('/src/features/learning-path/pages/TopicDetailPage.tsx', 'TopicDetailView', { detail, onChanged: () => {} })

    assert.match(html, /href="\/learn\/lessons\/lesson-l1"/)
    assert.doesNotMatch(html, /href="\/learn\/lessons\/lesson-l2"/)
    assert.match(html, /Bài kiểm tra cuối/)
    assert.doesNotMatch(html, /Làm bài kiểm tra/)
  })

  test('lesson blocks keep line breaks, split passages and render radio and text answers', async () => {
    const lesson = await createMockLearningApi().getLesson('lesson-l1')
    const html = await renderBlocks(lesson.blocks)

    assert.match(html, /class="lp-text">[^<]*\n\nCách làm:\n1\./)
    assert.match(html, /class="lp-split"/)
    assert.match(html, /aria-label="Đoạn A"/)
    assert.match(html, /role="radio"/)
    assert.match(html, /placeholder="Nhập câu trả lời"/)
    const submitButton = html.match(/<button[^>]*type="submit"[^>]*>/)?.[0]
    assert.ok(submitButton, 'submit button rendered')
    assert.match(submitButton, /disabled=""/)
    assert.match(html, /Còn <!-- -->3<!-- --> câu chưa trả lời/)
  })

  async function openLessonL4() {
    const api = createMockLearningApi()
    for (const lessonId of ['lesson-l1', 'lesson-l2', 'lesson-l3']) await passLesson(api, lessonId)
    return api.getLesson('lesson-l4')
  }

  test('TFNG questions render three radio options', async () => {
    const lesson = await openLessonL4()
    const exercise = lesson.blocks.find((block) => block.type === 'EXERCISE')
    const html = await renderBlocks([exercise])
    assert.equal(html.match(/role="radio"/g)?.length, exercise.questions.length * 3)
    assert.match(html, /NOT GIVEN/)
  })

  test('unknown blocks render a placeholder instead of crashing', async () => {
    const lesson = await openLessonL4()
    const html = await renderBlocks([
      ...lesson.blocks,
      { id: 'vocab', sortOrder: 9, type: 'VOCABULARY', words: [] },
      { id: 'essay', sortOrder: 10, type: 'ESSAY' },
      { id: 'broken', sortOrder: 11, type: 'EXERCISE', questions: 'oops' },
    ])
    // L4 AUDIO is rendered by AudioBlock; only the 3 injected unknown kinds stay unsupported.
    assert.equal(html.match(/Nội dung chưa hỗ trợ/g)?.length, 3)
    assert.match(html, /lp-audio__player|Bài nghe|Nghe giảng/)
    assert.doesNotMatch(html, /ASSET · AUDIO/)
  })

  test('a passed exercise reopens with saved answers and solutions', async () => {
    const api = createMockLearningApi()
    await passLesson(api, 'lesson-l1')
    const lesson = await api.getLesson('lesson-l1')
    const html = await renderBlocks(lesson.blocks)

    assert.match(html, /Đã đạt/)
    assert.match(html, /Đáp án:/)
    assert.match(html, /value="\s*[Ii]ndependence\s*"/)
    assert.doesNotMatch(html, /type="submit"/)
  })
})
