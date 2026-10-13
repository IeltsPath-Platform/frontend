import assert from 'node:assert/strict'
import { after, before, describe, test } from 'node:test'
import { createElement } from 'react'
import { renderToString } from 'react-dom/server'
import { MemoryRouter } from 'react-router-dom'
import { createServer } from 'vite'

let server
let createMockLearningApi
let MOCK_STORAGE_KEY

before(async () => {
  server = await createServer({ server: { middlewareMode: true }, appType: 'custom' })
  ;({ createMockLearningApi } = await server.ssrLoadModule('/src/features/learning-path/api/mock/mockLearningApi.ts'))
  ;({ MOCK_STORAGE_KEY } = await server.ssrLoadModule('/src/features/learning-path/api/mock/mockState.ts'))
})
after(async () => { await server?.close() })

let requestCounter = 0
const nextRequestId = () => `req-${++requestCounter}`
const toAnswers = (map) => Object.entries(map).map(([questionId, answer]) => ({ questionId, answer }))

const LESSON_IDS = ['lesson-l1', 'lesson-l2', 'lesson-l3', 'lesson-l4']
const REVIEW_KP1 = {
  'PS-KP1-A': { right: { 'r-kp1a-1': '1916', 'r-kp1a-2': 'A' }, wrong: { 'r-kp1a-1': '1891', 'r-kp1a-2': 'A' } },
  'PS-KP1-B': { wrong: { 'r-kp1b-1': '18038', 'r-kp1b-2': 'B' } },
  'PS-KP1-C': { wrong: { 'r-kp1c-1': '80', 'r-kp1c-2': 'C' } },
}

const memoryStorage = () => {
  const memory = new Map()
  return { memory, getItem: (key) => memory.get(key) ?? null, setItem: (key, value) => memory.set(key, value), removeItem: (key) => memory.delete(key) }
}

/** Reviews come from practice and tests, which the mock does not run, so a learner with one is stored directly. */
function storageWithPendingReview() {
  const storage = memoryStorage()
  storage.setItem(MOCK_STORAGE_KEY, JSON.stringify({
    version: 3,
    seq: 2,
    completedLessons: ['lesson-l1', 'lesson-l2'],
    reviews: [{ id: 'review-kp1-1', topicId: 'topic-demo-reading', kpCode: 'KP1', resumeLessonId: 'lesson-l3', status: 'PENDING', setIndex: 0, createdSeq: 1 }],
  }))
  return storage
}

async function completeLessons(api, ids = LESSON_IDS) {
  for (const lessonId of ids) await api.completeLesson(lessonId)
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
    await assert.rejects(api.getLessonResources('lesson-l2'), { code: 'LESSON_LOCKED', status: 403 })
    await assert.rejects(api.getTopicLessons('topic-tfng-skills'), { code: 'TOPIC_LOCKED' })

    const l1 = await api.getLesson('lesson-l1')
    assert.equal('blocks' in l1, false, 'a lesson has no blocks; its content is read from the resources')
    assert.equal(l1.status, 'AVAILABLE')
    const resources = await api.getLessonResources('lesson-l1')
    assert.equal(resources.lessonId, 'lesson-l1')
    assert.match(resources.summaryMarkdown, /paraphrase/)
    assert.equal(resources.slides.length, 1)
    assert.match(resources.slides[0].url, /^https:\/\/docs\.google\.com\/presentation\/d\//)
    assert.deepEqual(resources.documents.map((doc) => doc.sortOrder), [0, 1])

    const l1Done = await api.completeLesson('lesson-l1')
    assert.deepEqual(l1Done, { lessonCompleted: true, nextLessonId: 'lesson-l2', pendingReviews: [] })
    detail = await api.getTopicLessons('topic-demo-reading')
    assert.deepEqual(statusesOf(detail), ['COMPLETED', 'AVAILABLE', 'LOCKED', 'LOCKED'])

    await api.completeLesson('lesson-l2')
    await api.completeLesson('lesson-l3')
    const l4Done = await api.completeLesson('lesson-l4')
    assert.equal(l4Done.nextLessonId, null)

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

  test('a pending review blocks new lessons and the final test but not lessons already completed', async () => {
    const api = createMockLearningApi({ storage: storageWithPendingReview() })
    const [pending] = await api.getPendingReviews()
    assert.equal(pending.knowledgePointCode, 'KP1')
    const reviewId = pending.reviewId

    const detail = await api.getTopicLessons('topic-demo-reading')
    assert.deepEqual(statusesOf(detail), ['COMPLETED', 'COMPLETED', 'LOCKED', 'LOCKED'])
    assert.match(detail.lessons[2].lockedReason, /bài ôn/)
    await assert.rejects(api.getLesson('lesson-l3'), (error) => error.code === 'REVIEW_REQUIRED' && error.details.reviews[0].reviewId === reviewId)
    await assert.rejects(api.getLessonResources('lesson-l3'), { code: 'REVIEW_REQUIRED' })
    await assert.rejects(api.createTestAssignment('topic-demo-reading'), { code: 'REVIEW_REQUIRED' })
    const reopened = await api.getLesson('lesson-l2')
    assert.equal(reopened.status, 'COMPLETED')
    assert.equal(reopened.pendingReviews[0].reviewId, reviewId)
    assert.match((await api.getLessonResources('lesson-l2')).summaryMarkdown, /Scanning/)

    const review = await api.getReview(reviewId)
    assert.equal(review.status, 'PENDING')
    assert.equal(review.set.packageCode, 'PS-KP1-A')
    assert.equal(review.sourceLessonTitle, 'Scanning: tìm thông tin cụ thể')
    assert.ok(review.theory.length > 0 && review.theory.every((text) => typeof text === 'string'))
    assert.match(review.theory[0], /Scanning/)
    assert.equal('quickCheck' in review, false)
    const reviewPass = await api.submitReview(reviewId, { requestId: nextRequestId(), setId: review.set.setId, answers: toAnswers(REVIEW_KP1['PS-KP1-A'].right) })
    assert.equal(reviewPass.status, 'DONE')
    assert.ok(reviewPass.results.every((result) => typeof result.correctAnswer === 'string'))
    assert.equal(reviewPass.resumeLessonId, 'lesson-l3')

    assert.deepEqual(statusesOf(await api.getTopicLessons('topic-demo-reading')), ['COMPLETED', 'COMPLETED', 'AVAILABLE', 'LOCKED'])
  })

  test('failing three review sets marks the review SKIPPED and still unlocks the next lesson', async () => {
    const api = createMockLearningApi({ storage: storageWithPendingReview() })
    const [{ reviewId }] = await api.getPendingReviews()

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

  test('completing lessons never creates a review', async () => {
    const api = createMockLearningApi()
    for (const lessonId of LESSON_IDS) {
      const outcome = await api.completeLesson(lessonId)
      assert.deepEqual(outcome.pendingReviews, [], lessonId)
    }
    assert.deepEqual(await api.getPendingReviews(), [])
    const { result } = await takeTest(api, 'topic-demo-reading', { 12: 'B', 13: 'TRUE', 14: 'oil', 15: 'NOT GIVEN' })
    assert.equal(result.percent, 100)
  })
})

describe('mock API contract', () => {
  test('lessons have no exercise or essay submissions any more', () => {
    const api = createMockLearningApi()
    assert.equal(api.submitExercise, undefined)
    assert.equal(api.submitEssay, undefined)
  })

  test('completing a lesson twice returns the same completion', async () => {
    const api = createMockLearningApi()
    const first = await api.completeLesson('lesson-l1')
    const again = await api.completeLesson('lesson-l1')
    assert.deepEqual(again, first)
    await assert.rejects(api.completeLesson('lesson-l3'), { code: 'LESSON_LOCKED' })
  })

  test('a failed final test is retaken with a different package and hides solutions', async () => {
    const api = createMockLearningApi()
    await completeLessons(api)
    const first = await takeTest(api, 'topic-demo-reading', { 12: 'A', 13: 'FALSE', 14: 'water', 15: 'NOT GIVEN' })
    assert.equal(first.result.passed, false)
    assert.ok(first.result.items.every((item) => !('correctAnswer' in item) && !('explanation' in item)))
    assert.equal(first.result.topicStatus, 'IN_PROGRESS')
    assert.equal((await api.getTopicLessons('topic-demo-reading')).finalTest.lastPercent, 25)
    const second = await api.createTestAssignment('topic-demo-reading')
    assert.equal(second.packageCode, 'X2')
  })

  test('topic without packages reports TEST_UNAVAILABLE once its lessons are complete', async () => {
    const api = createMockLearningApi()
    await completeLessons(api)
    await takeTest(api, 'topic-demo-reading', { 12: 'B', 13: 'TRUE', 14: 'oil', 15: 'NOT GIVEN' })

    const completion = await api.completeLesson('lesson-tfng-1')
    assert.deepEqual(completion, { lessonCompleted: true, nextLessonId: 'lesson-tfng-2', pendingReviews: [] })
    await api.completeLesson('lesson-tfng-2')
    assert.equal((await api.getTopicLessons('topic-tfng-skills')).finalTest.testStatus, 'AVAILABLE')
    await assert.rejects(api.createTestAssignment('topic-tfng-skills'), { code: 'TEST_UNAVAILABLE' })
  })

  test('unknown ids are NOT_FOUND and a locked final test is TEST_LOCKED', async () => {
    const api = createMockLearningApi()
    await assert.rejects(api.getLesson('lesson-missing'), { code: 'NOT_FOUND', status: 404 })
    await assert.rejects(api.getLessonResources('lesson-missing'), { code: 'NOT_FOUND', status: 404 })
    await assert.rejects(api.getReview('review-missing'), { code: 'NOT_FOUND' })
    await assert.rejects(api.createTestAssignment('topic-demo-reading'), { code: 'TEST_LOCKED' })
  })

  test('server failure mode fails every call with a 500 until switched off, without touching progress', async () => {
    const api = createMockLearningApi()
    api.setServerFailing(true)
    await assert.rejects(api.listTopics(), { code: 'SERVER_ERROR', status: 500 })
    await assert.rejects(api.completeLesson('lesson-l1'), { code: 'SERVER_ERROR' })
    api.setServerFailing(false)
    assert.equal((await api.listTopics()).length, 3)
    assert.equal((await api.getTopicLessons('topic-demo-reading')).lessons[0].status, 'AVAILABLE')
  })

  test('pending reviews survive a cold hydrate after localStorage restore', async () => {
    const storage = storageWithPendingReview()
    const api = createMockLearningApi({ storage })
    assert.equal((await api.getPendingReviews()).length, 1)

    const restored = createMockLearningApi({ storage })
    assert.equal((await restored.getPendingReviews()).length, 1)
    assert.equal((await restored.getLesson('lesson-l2')).pendingReviews[0].reviewId, (await restored.getPendingReviews())[0].reviewId)
  })

  test('progress persists through storage and reset clears it', async () => {
    const storage = memoryStorage()
    const api = createMockLearningApi({ storage })
    await api.completeLesson('lesson-l1')

    const restored = createMockLearningApi({ storage })
    assert.equal((await restored.getTopicLessons('topic-demo-reading')).lessons[1].status, 'AVAILABLE')
    restored.reset()
    assert.equal(storage.memory.size, 0)
    assert.equal((await restored.getTopicLessons('topic-demo-reading')).lessons[1].status, 'LOCKED')
  })
})

describe('learning path rendering', () => {
  async function render(modulePath, name, props, path = '/learn') {
    const module = await server.ssrLoadModule(modulePath)
    return renderToString(createElement(MemoryRouter, { initialEntries: [path] }, createElement(module[name], props)))
  }

  const resources = (name, props) => render(`/src/features/learning-path/components/resources/${name}.tsx`, name, props)
  const DECK = 'https://docs.google.com/presentation/d/1rky9iPmndXAGDhwcMSI8QM2jN1QaVyelycgAsloB7kM/edit?slide=id.p#slide=id.p'

  test('topic trail links open topics and explains locked ones without a link', async () => {
    const topics = await createMockLearningApi().listTopics()
    const html = await render('/src/features/learning-path/pages/TopicListPage.tsx', 'TopicTrail', { topics })

    assert.match(html, /href="\/learn\/topics\/topic-demo-reading"/)
    assert.doesNotMatch(html, /href="\/learn\/topics\/topic-tfng-skills"/)
    assert.match(html, /aria-disabled="true"/)
    assert.match(html, /Đạt bài kiểm tra cuối của/)
    assert.match(html, /0<!-- -->\/<!-- -->4<!-- --> bài/)
  })

  test('topic detail only links open lessons and keeps the final test locked', async () => {
    const detail = await createMockLearningApi().getTopicLessons('topic-demo-reading')
    const html = await render('/src/features/learning-path/pages/TopicDetailPage.tsx', 'TopicDetailView', { detail, onChanged: () => {} })

    assert.match(html, /href="\/learn\/lessons\/lesson-l1"/)
    assert.doesNotMatch(html, /href="\/learn\/lessons\/lesson-l2"/)
    assert.match(html, /Bài kiểm tra cuối/)
    assert.doesNotMatch(html, /Làm bài kiểm tra/)
  })

  const lesson = (overrides = {}) => ({
    id: 'lesson-l1', topicId: 'topic-demo-reading', topicTitle: 'Đọc hiểu nền tảng', title: 'Nhận diện paraphrase',
    sortOrder: 1, status: 'AVAILABLE', nextLessonId: 'lesson-l2', pendingReviews: [], ...overrides,
  })
  const renderLesson = (props, path = '/learn/lessons/lesson-l1') =>
    render('/src/features/learning-path/pages/LessonPage.tsx', 'LessonView', { lesson: lesson(props) }, path)

  test('the lesson page lists its four parts, marks the open one and offers completion', async () => {
    const html = await renderLesson({}, '/learn/lessons/lesson-l1?view=summary')

    assert.match(html, /<h1 id="lp-lesson-title">Nhận diện paraphrase<\/h1>/)
    assert.match(html, /Bài <!-- -->1<!-- --> · <!-- -->Đọc hiểu nền tảng/)
    for (const label of ['Slide bài giảng', 'Lesson Summary', 'Tài liệu bài khoá', 'Luyện tập']) assert.match(html, new RegExp(label))
    assert.match(html, /href="\/learn\/lessons\/lesson-l1"/, 'slides are the default part, so they have no query')
    assert.match(html, /href="\/learn\/lessons\/lesson-l1\?view=documents"/)
    assert.match(html, /href="\/learn\/lessons\/lesson-l1\?view=practice"/)
    assert.match(html, /<a[^>]*class="lp-res-nav__link is-active"[^>]*href="\/learn\/lessons\/lesson-l1\?view=summary"|<a[^>]*aria-current="page"[^>]*href="\/learn\/lessons\/lesson-l1\?view=summary"/)
    assert.match(html, /Hoàn thành bài/)
    assert.doesNotMatch(html, /Bài tập|Đến phần bài tập|Homework|Mentor/)
    assert.doesNotMatch(html, /Bài tiếp theo/)
  })

  test('a completed lesson offers the next lesson and the Practice instead of completion', async () => {
    const html = await renderLesson({ status: 'COMPLETED' })

    assert.match(html, /href="\/learn\/lessons\/lesson-l2"/)
    assert.match(html, /Bài tiếp theo/)
    assert.match(html, /Luyện tập bài này/)
    assert.doesNotMatch(html, /Hoàn thành bài</)
  })

  test('a Google Slides deck is embedded and downloaded through its own links', async () => {
    const html = await resources('LessonSlides', { slides: [{ id: 's1', title: 'Slide bài giảng', url: DECK, sortOrder: 0 }] })

    assert.match(html, /<iframe[^>]*src="https:\/\/docs\.google\.com\/presentation\/d\/1rky9iPmndXAGDhwcMSI8QM2jN1QaVyelycgAsloB7kM\/embed\?start=false&amp;loop=false"/)
    assert.match(html, /allowFullScreen=""|allowfullscreen=""/)
    assert.match(html, /href="https:\/\/docs\.google\.com\/presentation\/d\/1rky9iPmndXAGDhwcMSI8QM2jN1QaVyelycgAsloB7kM\/export\/pdf"/)
    assert.match(html, /Mở rộng/)
  })

  test('a published deck keeps its own link for download and other links are never embedded', async () => {
    const published = await resources('LessonSlides', { slides: [{ id: 's1', title: 'Deck', url: 'https://docs.google.com/presentation/d/e/2PACX-abc/pub', sortOrder: 0 }] })
    assert.match(published, /src="https:\/\/docs\.google\.com\/presentation\/d\/e\/2PACX-abc\/embed\?/)
    assert.match(published, /href="https:\/\/docs\.google\.com\/presentation\/d\/e\/2PACX-abc\/pub"/)

    const other = await resources('LessonSlides', { slides: [{ id: 's2', title: 'Deck', url: 'https://example.com/deck.pdf', sortOrder: 0 }] })
    assert.doesNotMatch(other, /<iframe/)
    assert.match(other, /Mở trong tab mới/)
    assert.match(other, /rel="noopener noreferrer"/)

    assert.match(await resources('LessonSlides', { slides: [] }), /chưa có slide/)
  })

  test('the lesson summary renders Markdown and never raw HTML', async () => {
    const html = await resources('LessonSummary', {
      markdown: '## Learning Outcomes\n\n1. Describe\n\n| Từ | Nghĩa |\n| --- | --- |\n| nature | thiên nhiên |\n\n<script>alert(1)</script>\n\n[Cambridge](https://dictionary.cambridge.org)',
    })

    assert.match(html, /<h2>Learning Outcomes<\/h2>/)
    assert.match(html, /<ol>/)
    assert.match(html, /<table>/)
    assert.doesNotMatch(html, /<script>/)
    assert.match(html, /<a href="https:\/\/dictionary\.cambridge\.org"[^>]*target="_blank"[^>]*rel="noopener noreferrer"/)
    assert.match(await resources('LessonSummary', { markdown: null }), /chưa có phần tóm tắt/)
    assert.match(await resources('LessonSummary', { markdown: '   ' }), /chưa có phần tóm tắt/)
  })

  test('documents open in a new tab and an empty list says so', async () => {
    const html = await resources('LessonDocuments', { documents: [{ id: 'd1', title: 'Tài liệu 1 Giáo trình', url: 'https://drive.google.com/file/d/1', sortOrder: 0 }] })

    assert.match(html, /<a class="lp-res-doc" href="https:\/\/drive\.google\.com\/file\/d\/1" target="_blank" rel="noopener noreferrer"/)
    assert.match(html, /Tài liệu 1 Giáo trình/)
    assert.match(await resources('LessonDocuments', { documents: [] }), /chưa có tài liệu/)
  })
})
