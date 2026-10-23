import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ZodError } from 'zod'
import { API_BASE_URL } from '@/lib/env'
import { clearAccessToken, setAccessToken } from '@/lib/httpClient'
import { courseStructureSchema, type CourseGenerationRequest, type CourseStructure } from '../types'
import { analyzeCourseDraft, approveCourseDraft, createCourseDraft, getCourseDraft, listCourseDrafts, requestCourseDraft, saveCourseDraft } from './courseDraftApi'

const id = '00000000-0000-4000-8000-000000000001'
const kp = '00000000-0000-4000-8000-000000000002'
const base = `${API_BASE_URL}/api/content/admin/course-drafts`
const ai = `${API_BASE_URL}/api/content/admin/ai-drafts`
const empty: CourseStructure = { course: null, topics: [], courseTest: null, practiceTestMilestones: [], gaps: [] }
const structure: CourseStructure = {
  course: { code: 'COURSE_65', name: 'Reading 6.5', bandLevel: 6.5 },
  topics: [{ code: 'TOPIC_1', name: 'Paraphrase', skill: 'READING', sortOrder: 970, topicTest: { code: 'TOPIC_TEST', title: 'Final test' }, lessons: [{
    code: 'LESSON_1', title: 'Spot the paraphrase', summary: null, knowledgePointIds: [kp], practiceSetPackageIds: [],
    blocks: [{ type: 'TEXT', text: '', knowledgePointIds: [kp], questionRefs: [] }, { type: 'EXERCISE', text: null, knowledgePointIds: [], questionRefs: ['import-reading-1', kp] }],
  }] }],
  courseTest: { code: 'COURSE_TEST', title: 'Course final test' }, practiceTestMilestones: [{ packageId: kp, afterTopicSequence: 1 }], gaps: [],
}
const draft = { id, kind: 'COURSE', status: 'READY', request: {}, result: empty, errorCode: null, model: null, promptVersion: null, createdAt: '2026-10-23T00:00:00Z', finishedAt: '2026-10-23T00:00:00Z', reviewedAt: null, reviewNote: null }
const generation: CourseGenerationRequest = { bandLevel: 6.5, skills: ['READING'], topics: ['Paraphrase'], knowledgePointIds: [kp], lessonCount: 8, instructions: null }
const queued = { ...draft, status: 'QUEUED', request: generation, result: null, finishedAt: null }
const analysis = { valid: false, errors: [{ code: 'PREREQUISITE_ORDER', subject: kp, related: id }], warnings: [{ code: 'KP_NOT_COVERED', subject: kp, related: null }], gaps: [{ knowledgePointId: kp, reason: 'NO_EXERCISE_QUESTION' }], coverage: { expected: 12, covered: 9 } }
const result = { ...structure, unmatchedTopics: ['Unmatched'], warnings: [{ code: 'EMPTY_LESSON_DROPPED', subject: 'Ignored lesson' }], analysis, gapHints: [{ knowledgePointId: kp, reason: 'NO_PRACTICE_SET,NO_EXERCISE_QUESTION', action: 'REQUEST_QUESTION_DRAFT' }] }
const approval = { draftId: id, courseId: kp, topicIds: [kp], lessonIds: [kp], finalTestPackageIds: [kp] }
const fetchMock = vi.fn<typeof fetch>()

function respond(value: unknown, status = 200) {
  fetchMock.mockResolvedValue(new Response(JSON.stringify(value), { status }))
}
function expectRequest(url: string, method: string, body?: unknown) {
  expect(fetchMock).toHaveBeenCalledTimes(1)
  const [actualUrl, options] = fetchMock.mock.calls[0]!
  expect(actualUrl).toBe(url)
  expect(options).toMatchObject({ method, credentials: 'include', headers: { Authorization: 'Bearer test-access-token' } })
  if (body === undefined) expect(options!.body).toBeUndefined()
  else expect(JSON.parse(options!.body as string)).toEqual(body)
}

describe('course draft API', () => {
  beforeEach(() => { fetchMock.mockReset(); vi.stubGlobal('fetch', fetchMock); setAccessToken('test-access-token') })
  afterEach(() => { clearAccessToken(); vi.unstubAllGlobals() })

  it('lists only course drafts through the existing array catalog', async () => {
    respond([draft])
    await expect(listCourseDrafts({ status: 'READY', page: 0, size: 20 })).resolves.toEqual([draft])
    expectRequest(`${ai}?kind=COURSE&status=READY&page=0&size=20`, 'GET')
  })

  it('reads manual detail with its empty request and nullable course fields', async () => {
    respond(draft)
    await expect(getCourseDraft(id)).resolves.toEqual(draft)
    expectRequest(`${ai}/${id}`, 'GET')
  })

  it('reads AI detail while preserving analysis, warnings and combined gap hints', async () => {
    const response = { ...draft, request: generation, result, model: 'configured-model', promptVersion: 'v1' }
    respond(response)
    await expect(getCourseDraft(id)).resolves.toEqual(response)
  })

  it('creates an empty manual draft without sending a body or AI request', async () => {
    respond(draft, 201)
    await expect(createCourseDraft()).resolves.toEqual(draft)
    expectRequest(base, 'POST')
  })

  it('creates a manual draft from a structure', async () => {
    const response = { ...draft, result: structure }
    respond(response, 201)
    await expect(createCourseDraft(structure)).resolves.toEqual(response)
    expectRequest(base, 'POST', { structure })
  })

  it('saves the structure and strips generated extras from the replacement body', async () => {
    respond({ ...draft, result: structure })
    await expect(saveCourseDraft(id, result)).resolves.toMatchObject({ result: structure })
    expectRequest(`${base}/${id}`, 'PUT', { structure })
  })

  it('reads the analysis without mutating the draft', async () => {
    respond(analysis)
    await expect(analyzeCourseDraft(id)).resolves.toEqual(analysis)
    expectRequest(`${base}/${id}/analysis`, 'GET')
  })

  it('accepts nullable issue subjects and an empty analysis that is valid', async () => {
    const response = { ...analysis, valid: true, errors: [], warnings: [{ code: 'FUTURE_WARNING', subject: null, related: null }], gaps: [], coverage: { expected: 0, covered: 0 } }
    respond(response)
    await expect(analyzeCourseDraft(id)).resolves.toEqual(response)
  })

  it('approves with no body and parses all created IDs', async () => {
    respond(approval)
    await expect(approveCourseDraft(id)).resolves.toEqual(approval)
    expectRequest(`${base}/${id}/approve`, 'POST')
  })

  it('requests an AI course plan with the exact body and accepts 202', async () => {
    respond(queued, 202)
    await expect(requestCourseDraft(generation)).resolves.toEqual(queued)
    expectRequest(`${ai}/courses`, 'POST', generation)
  })

  it('accepts a request with only explicit knowledge points and nullable server defaults', async () => {
    const body: CourseGenerationRequest = { ...generation, topics: [], lessonCount: null, instructions: null }
    respond({ ...queued, request: body }, 202)
    await expect(requestCourseDraft(body)).resolves.toMatchObject({ request: body })
    expectRequest(`${ai}/courses`, 'POST', body)
  })

  it('accepts a topics-only request with omitted optional fields', async () => {
    const body: CourseGenerationRequest = { bandLevel: 0, skills: ['LISTENING'], topics: ['Numbers'], knowledgePointIds: [] }
    respond({ ...queued, request: body }, 202)
    await expect(requestCourseDraft(body)).resolves.toMatchObject({ request: body })
  })

  it.each([
    { name: 'list', action: () => listCourseDrafts() }, { name: 'detail', action: () => getCourseDraft(id) },
    { name: 'manual create', action: () => createCourseDraft() }, { name: 'save', action: () => saveCourseDraft(id, empty) },
    { name: 'analysis', action: () => analyzeCourseDraft(id) }, { name: 'approval', action: () => approveCourseDraft(id) },
    { name: 'AI create', action: () => requestCourseDraft(generation) },
  ])('rejects a malformed successful $name response', async ({ action }) => {
    respond({ unexpected: true })
    await expect(action()).rejects.toBeInstanceOf(ZodError)
  })

  it.each([
    () => getCourseDraft('invalid'), () => saveCourseDraft('invalid', empty), () => analyzeCourseDraft('invalid'),
    () => approveCourseDraft('invalid'), () => listCourseDrafts({ size: 101 }),
  ])('validates IDs and filters before requesting', async (action) => {
    await expect(action()).rejects.toBeInstanceOf(ZodError)
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it.each([
    { patch: { bandLevel: 6.1 } }, { patch: { bandLevel: 9.5 } }, { patch: { skills: [] } },
    { patch: { skills: ['READING', 'READING'] } }, { patch: { skills: ['ALL'] } },
    { patch: { topics: [], knowledgePointIds: [] } }, { patch: { topics: [' '] } },
    { patch: { topics: Array.from({ length: 11 }, () => 'Topic') } }, { patch: { topics: ['a'.repeat(101)] } },
    { patch: { knowledgePointIds: Array.from({ length: 41 }, () => kp) } },
    { patch: { lessonCount: 0 } }, { patch: { lessonCount: 31 } }, { patch: { instructions: 'a'.repeat(501) } },
  ])('rejects invalid generation input before requesting: $patch', async ({ patch }) => {
    await expect(requestCourseDraft({ ...generation, ...patch } as CourseGenerationRequest)).rejects.toBeInstanceOf(ZodError)
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it.each([
    { status: 400, code: 'INVALID_COURSE_DRAFT', detail: { issues: [{ path: 'topics[0].code', problem: 'DUPLICATE' }] }, action: () => saveCourseDraft(id, structure) },
    { status: 409, code: 'CODE_CONFLICT', detail: { conflicts: [{ code: 'CODE_TAKEN', subject: 'COURSE_65', related: 'COURSE' }] }, action: () => approveCourseDraft(id) },
    { status: 422, code: 'COURSE_DRAFT_INVALID', detail: { errors: [{ code: 'COURSE_MISSING', subject: null, related: null }] }, action: () => approveCourseDraft(id) },
    { status: 429, code: 'AI_QUOTA_EXCEEDED', detail: {}, action: () => requestCourseDraft(generation) },
    { status: 404, code: 'AI_DRAFT_NOT_FOUND', detail: {}, action: () => getCourseDraft(id) },
  ])('preserves $status / $code and structured backend details', async ({ status, code, detail, action }) => {
    const body = { message: 'Không xử lý được bản nháp.', details: { code, ...detail } }
    respond(body, status)
    await expect(action()).rejects.toMatchObject({ status, body })
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('does not accept a question draft from the shared detail endpoint', async () => {
    respond({ ...draft, kind: 'QUESTIONS' })
    await expect(getCourseDraft(id)).rejects.toBeInstanceOf(ZodError)
  })

  it('forwards cancellation to the HTTP client', async () => {
    respond(analysis)
    const controller = new AbortController()
    await analyzeCourseDraft(id, controller.signal)
    const signal = fetchMock.mock.calls[0]![1]!.signal!
    controller.abort()
    expect(signal.aborted).toBe(true)
  })

  it('accepts nullable final tests and TEXT text', () => {
    const value = { ...structure, courseTest: null, topics: [{ ...structure.topics[0]!, topicTest: null, lessons: [{ ...structure.topics[0]!.lessons[0]!, blocks: [{ type: 'TEXT', text: null, knowledgePointIds: [], questionRefs: [] }] }] }] }
    expect(courseStructureSchema.parse(value)).toEqual(value)
  })

  it('rejects duplicate codes within categories and duplicate topic sort orders', () => {
    const topic = structure.topics[0]!
    expect(courseStructureSchema.safeParse({ ...structure, topics: [topic, topic] }).success).toBe(false)
    expect(courseStructureSchema.safeParse({ ...structure, courseTest: topic.topicTest }).success).toBe(false)
    expect(courseStructureSchema.safeParse({ ...structure, topics: [{ ...topic, lessons: [topic.lessons[0]!, topic.lessons[0]!] }] }).success).toBe(false)
  })

  it('permits a code shared between different entity categories', () => {
    const value = { ...structure, course: { ...structure.course!, code: structure.topics[0]!.code } }
    expect(courseStructureSchema.parse(value)).toEqual(value)
  })

  it.each([
    { type: 'TEXT', text: '', knowledgePointIds: [], questionRefs: ['import-ref'] },
    { type: 'EXERCISE', text: 'Forbidden text', knowledgePointIds: [], questionRefs: ['import-ref'] },
    { type: 'EXERCISE', text: null, knowledgePointIds: [kp], questionRefs: ['import-ref'] },
    { type: 'EXERCISE', text: null, knowledgePointIds: [], questionRefs: [] },
  ])('checks block-specific fields before saving: $type', async (block) => {
    const value = { ...structure, topics: [{ ...structure.topics[0]!, lessons: [{ ...structure.topics[0]!.lessons[0]!, blocks: [block] }] }] }
    await expect(saveCourseDraft(id, value as CourseStructure)).rejects.toBeInstanceOf(ZodError)
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('rejects milestones past the final topic and negative topic sort orders', () => {
    expect(courseStructureSchema.safeParse({ ...structure, practiceTestMilestones: [{ packageId: kp, afterTopicSequence: 2 }] }).success).toBe(false)
    expect(courseStructureSchema.safeParse({ ...structure, topics: [{ ...structure.topics[0]!, sortOrder: -1 }] }).success).toBe(false)
  })
})
