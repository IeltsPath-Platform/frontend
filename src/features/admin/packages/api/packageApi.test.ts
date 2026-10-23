import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ZodError } from 'zod'
import { clearAccessToken, setAccessToken } from '@/lib/httpClient'
import { API_BASE_URL } from '@/lib/env'
import { AUDIO_MAX_BYTES, type ContentPackage, type PackageVersion, type SectionRequest } from '../types'
import { addSection, addSectionQuestion, cancelSchedule, createDraftVersion, createPackage, deleteAudio, deletePassage, deleteSection, getPackage, listPackages, listPracticeSources, listSchedules, previewVersion, publishVersion, removeSectionQuestion, reorderSectionQuestions, reorderSections, scheduleVersion, updateAudio, updatePassage, updateSection, uploadAudio } from './packageApi'

const packageId = '00000000-0000-4000-8000-000000000001'
const draftId = '00000000-0000-4000-8000-000000000002'
const sectionId = '00000000-0000-4000-8000-000000000003'
const nextSectionId = '00000000-0000-4000-8000-000000000004'
const questionId = '00000000-0000-4000-8000-000000000005'
const sectionQuestionId = '00000000-0000-4000-8000-000000000006'
const sectionRequest: SectionRequest = { title: 'Reading', skill: 'READING', sortOrder: 1, timeLimitSeconds: 1200, instructions: 'Read and answer.', partNo: 1, coverAssetId: null }
const sectionQuestion = { id: sectionQuestionId, questionVersionId: questionId, questionId, sortOrder: 1, maxScore: 1, stem: 'Question text', status: 'PUBLISHED', purpose: 'LEARNING' }
const audio = { assetId: questionId, mediaReference: 'listening/demo/ls1.mp3', mediaUrl: 'https://example.org/audio.mp3', durationSeconds: 45, transcript: 'Author transcript' }
const section = { ...sectionRequest, id: sectionId, passage: 'Passage text', audio, questions: [sectionQuestion] }
const draft: PackageVersion = { id: draftId, versionNumber: 1, status: 'DRAFT', rulesJson: '{}', publishedAt: null, publishAt: null, lastPublishError: null, sections: [section] }
const timestamp = '2026-10-23T00:00:00Z'
const packageFields = { id: packageId, code: 'READ-1', title: 'Reading test', packageType: 'PRACTICE_SET' as const, accessLevel: 'FREE' as const, status: 'DRAFT' as const, currentPublishedVersionId: null, lessonId: null, sourceCode: null, createdAt: timestamp, updatedAt: timestamp }
const makePackage = (versions: PackageVersion[] = [draft]): ContentPackage => ({ ...packageFields, topicId: null, courseId: null, versions })
const summary = { ...packageFields, topicId: null, courseId: null, latestVersionNumber: 1, hasDraft: true }
const createBody = { code: 'READ-1', title: 'Reading test', packageType: 'PRACTICE_SET' as const, accessLevel: 'FREE' as const, lessonId: null, sourceCode: null, topicId: null, courseId: null }
const audioBody = { mediaReference: audio.mediaReference, durationSeconds: 45, transcript: audio.transcript }
const uploaded = { mediaReference: audio.mediaReference, mediaUrl: audio.mediaUrl, contentType: 'audio/mpeg', sizeBytes: 4 }
const future = '2099-10-23T09:00:00Z'
const schedule = { packageId, versionId: draftId, publishAt: future, lastPublishError: null }
const preview = {
  packageVersionId: draftId, packageId, packageType: 'PRACTICE_SET', topicId: null, rules: {},
  sections: [{ sectionId, title: 'Reading', skill: 'READING', instructions: null, sortOrder: 1, passage: 'Passage', audio: { assetId: questionId, mediaUrl: audio.mediaUrl, durationSeconds: 45 }, items: [{ questionVersionId: questionId, sortOrder: 1, stem: 'Question?', options: { A: 'Answer' }, hint: null, maxScore: 1, knowledgePointMappings: [{ knowledgePointId: questionId, weight: 1 }] }] }],
  answers: [{ sectionId, audioTranscript: audio.transcript, items: [{ questionVersionId: questionId, answerSpec: { type: 'CHOICE', correct: 'A', distractors: { B: 'TRAP' } }, explanation: 'Explanation', hint: null }] }],
}

const fetchMock = vi.fn<typeof fetch>()
const base = `${API_BASE_URL}/api/content/admin/packages/${packageId}`
const sections = `${base}/versions/${draftId}/sections`
function respond(body: unknown, status = 200) {
  fetchMock.mockResolvedValue(new Response(status === 204 ? null : JSON.stringify(body), { status }))
}
function request(url: string, method: string, body?: unknown) {
  expect(fetchMock).toHaveBeenCalledTimes(1)
  const [actualUrl, options] = fetchMock.mock.calls[0]!
  expect(actualUrl).toBe(url)
  expect(options).toMatchObject({ method, credentials: 'include', headers: { Accept: 'application/json', Authorization: 'Bearer test-access-token' } })
  if (body === undefined) expect(options!.body).toBeUndefined()
  else {
    expect(options!.headers).toMatchObject({ 'Content-Type': 'application/json' })
    expect(JSON.parse(options!.body as string)).toEqual(body)
  }
}
describe('package authoring API', () => {
  beforeEach(() => { fetchMock.mockReset(); vi.stubGlobal('fetch', fetchMock); setAccessToken('test-access-token') })
  afterEach(() => { clearAccessToken(); vi.unstubAllGlobals() })

  it('reads the complete author detail including passage, audio and question metadata', async () => {
    respond(makePackage())
    await expect(getPackage(packageId)).resolves.toEqual(makePackage())
    request(base, 'GET')
  })
  it('rejects a malformed nested question instead of accepting unvalidated detail', async () => {
    const body = makePackage([{ ...draft, sections: [{ ...section, questions: [{ ...section.questions[0]!, questionVersionId: 'invalid' }] }] }])
    respond(body)
    await expect(getPackage(packageId)).rejects.toBeInstanceOf(ZodError)
  })
  it('creates an empty draft with server-owned version numbering', async () => {
    respond({ ...draft, sections: [] }, 201)
    await expect(createDraftVersion(packageId)).resolves.toEqual({ ...draft, sections: [] })
    request(`${base}/versions`, 'POST', { rulesJson: '{}' })
  })
  it.each(['create', 'update'] as const)('sends every section field on %s', async (action) => {
    respond(section, action === 'create' ? 201 : 200)
    const result = action === 'create' ? addSection(packageId, draftId, sectionRequest) : updateSection(packageId, draftId, sectionId, sectionRequest)
    await expect(result).resolves.toEqual(section)
    request(action === 'create' ? sections : `${sections}/${sectionId}`, action === 'create' ? 'POST' : 'PUT', sectionRequest)
  })
  it.each([0, -60])('accepts the backend duration contract for %i seconds', async (timeLimitSeconds) => {
    respond({ ...section, timeLimitSeconds })
    await updateSection(packageId, draftId, sectionId, { ...sectionRequest, timeLimitSeconds })
    request(`${sections}/${sectionId}`, 'PUT', { ...sectionRequest, timeLimitSeconds })
  })
  it('accepts a bodyless 204 for section deletion', async () => {
    respond(null, 204)
    await expect(deleteSection(packageId, draftId, sectionId)).resolves.toBeUndefined()
    request(`${sections}/${sectionId}`, 'DELETE')
  })
  it.each([[nextSectionId, sectionId], []])('sends exactly one atomic PUT for the full section order %j', async (...ids) => {
    respond(null, 204)
    await expect(reorderSections(packageId, draftId, ids)).resolves.toBeUndefined()
    request(`${sections}/order`, 'PUT', { sectionIds: ids })
  })
  it.each([
    () => getPackage('invalid'),
    () => createDraftVersion('invalid'),
    () => createDraftVersion(packageId, '{broken'),
    () => addSection(packageId, 'invalid', sectionRequest),
    () => updateSection(packageId, draftId, 'invalid', sectionRequest),
    () => deleteSection(packageId, draftId, 'invalid'),
    () => reorderSections(packageId, draftId, ['invalid']),
    () => reorderSections(packageId, draftId, [sectionId, sectionId]),
    () => addSection(packageId, draftId, { ...sectionRequest, title: '' }),
  ])('rejects invalid IDs, bodies and duplicate ordering before fetching', async (action) => {
    await expect(action()).rejects.toBeInstanceOf(ZodError)
    expect(fetchMock).not.toHaveBeenCalled()
  })
  it.each([
    () => getPackage(packageId), () => createDraftVersion(packageId),
    () => addSection(packageId, draftId, sectionRequest),
    () => updateSection(packageId, draftId, sectionId, sectionRequest),
    () => deleteSection(packageId, draftId, sectionId), () => reorderSections(packageId, draftId, []),
  ])('rejects malformed successful responses with Zod validation', async (action) => {
    respond({ unexpected: true })
    await expect(action()).rejects.toBeInstanceOf(ZodError)
  })
  it.each([400, 403, 404, 409])('preserves the backend %i envelope without a retry', async (status) => {
    const body = { message: 'Version cannot be edited', details: { code: 'VERSION_NOT_DRAFT' } }
    respond(body, status)
    await expect(updateSection(packageId, draftId, sectionId, sectionRequest)).rejects.toMatchObject({ status, message: body.message, body })
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('lists packages with every supported filter and preserves literal search text', async () => {
    respond([summary])
    const filters = { type: 'PRACTICE_SET' as const, status: 'DRAFT' as const, lessonId: questionId, topicId: sectionId, courseId: draftId, q: 'Test %_ & IELTS' }
    await expect(listPackages(filters)).resolves.toEqual([summary])
    const params = new URLSearchParams(filters)
    request(`${API_BASE_URL}/api/content/admin/packages?${params}`, 'GET')
  })

  it('omits the query when no package filter is selected', async () => {
    respond([])
    await expect(listPackages()).resolves.toEqual([])
    request(`${API_BASE_URL}/api/content/admin/packages`, 'GET')
  })

  it.each(['PRACTICE_SET', 'TOPIC_TEST', 'COURSE_TEST'] as const)('creates a %s package without a version', async (packageType) => {
    const body = { ...createBody, packageType, topicId: packageType === 'TOPIC_TEST' ? questionId : null, courseId: packageType === 'COURSE_TEST' ? questionId : null }
    const result = { ...makePackage([]), packageType, topicId: body.topicId, courseId: body.courseId }
    respond(result, 201)
    await expect(createPackage(body)).resolves.toEqual(result)
    request(`${API_BASE_URL}/api/content/admin/packages`, 'POST', body)
  })

  const routes: { name: string; url: string; method: string; body?: unknown; status?: number; response: unknown; action: () => Promise<unknown> }[] = [
    { name: 'add question', url: `${sections}/${sectionId}/questions`, method: 'POST', body: { questionVersionId: questionId, maxScore: 2 }, status: 201, response: { ...sectionQuestion, questionId: null, stem: null, status: null, purpose: null }, action: () => addSectionQuestion(packageId, draftId, sectionId, { questionVersionId: questionId, maxScore: 2 }) },
    { name: 'remove question', url: `${sections}/${sectionId}/questions/${sectionQuestionId}`, method: 'DELETE', status: 204, response: null, action: () => removeSectionQuestion(packageId, draftId, sectionId, sectionQuestionId) },
    { name: 'reorder questions', url: `${sections}/${sectionId}/questions/order`, method: 'PUT', body: { sectionQuestionIds: [sectionQuestionId] }, status: 204, response: null, action: () => reorderSectionQuestions(packageId, draftId, sectionId, [sectionQuestionId]) },
    { name: 'set passage', url: `${sections}/${sectionId}/passage`, method: 'PUT', body: { text: '  Passage\ntext  ' }, response: { passage: '  Passage\ntext  ' }, action: () => updatePassage(packageId, draftId, sectionId, { text: '  Passage\ntext  ' }) },
    { name: 'delete passage', url: `${sections}/${sectionId}/passage`, method: 'DELETE', status: 204, response: null, action: () => deletePassage(packageId, draftId, sectionId) },
    { name: 'set audio', url: `${sections}/${sectionId}/audio`, method: 'PUT', body: audioBody, response: audio, action: () => updateAudio(packageId, draftId, sectionId, audioBody) },
    { name: 'delete audio', url: `${sections}/${sectionId}/audio`, method: 'DELETE', status: 204, response: null, action: () => deleteAudio(packageId, draftId, sectionId) },
    { name: 'preview', url: `${base}/versions/${draftId}/preview`, method: 'GET', response: preview, action: () => previewVersion(packageId, draftId) },
    { name: 'publish', url: `${API_BASE_URL}/api/content/packages/${packageId}/publish`, method: 'POST', body: { versionId: draftId }, response: { ...packageFields, status: 'PUBLISHED', currentPublishedVersionId: draftId }, action: () => publishVersion(packageId, draftId) },
    { name: 'schedule', url: `${base}/versions/${draftId}/schedule`, method: 'PUT', body: { publishAt: future }, response: schedule, action: () => scheduleVersion(packageId, draftId, future) },
    { name: 'cancel schedule', url: `${base}/versions/${draftId}/schedule`, method: 'DELETE', status: 204, response: null, action: () => cancelSchedule(packageId, draftId) },
    { name: 'list schedules', url: `${base}/publication-schedules`, method: 'GET', response: [schedule, { ...schedule, publishAt: null, lastPublishError: 'QUESTION_ALREADY_USED' }], action: () => listSchedules(packageId) },
    { name: 'practice sources', url: `${API_BASE_URL}/api/content/practice-tests/sources`, method: 'GET', response: [{ code: 'CAMBRIDGE', name: 'Cambridge IELTS' }], action: () => listPracticeSources() },
  ]

  it.each(routes)('uses the authenticated $name route and parses its exact response', async ({ action, url, method, body, response, status }) => {
    respond(response, status)
    await expect(action()).resolves.toEqual(status === 204 ? undefined : response)
    request(url, method, body)
  })

  it.each(routes)('rejects an invalid successful $name response', async ({ action }) => {
    respond({ unexpected: true })
    await expect(action()).rejects.toBeInstanceOf(ZodError)
  })

  it.each([
    { name: 'catalog', action: () => listPackages() },
    { name: 'creation', action: () => createPackage(createBody) },
  ])('validates the $name response', async ({ action }) => {
    respond({ unexpected: true })
    await expect(action()).rejects.toBeInstanceOf(ZodError)
  })

  it('accepts audio metadata when the configured media URL cannot be resolved', async () => {
    respond({ ...audio, mediaUrl: null })
    await expect(updateAudio(packageId, draftId, sectionId, audioBody)).resolves.toMatchObject({ mediaUrl: null })
  })

  it('preserves preview options returned as the backend option array', async () => {
    const options = [{ optionKey: 'B', content: 'Second answer', sortOrder: 2 }, { optionKey: 'A', content: 'First answer', sortOrder: 1 }]
    const result = { ...preview, sections: [{ ...preview.sections[0]!, items: [{ ...preview.sections[0]!.items[0]!, options }] }] }
    respond(result)
    await expect(previewVersion(packageId, draftId)).resolves.toEqual(result)
    request(`${base}/versions/${draftId}/preview`, 'GET')
  })

  it('preserves signed int32 section sort and duration values', async () => {
    const body = { ...sectionRequest, sortOrder: -2147483648, timeLimitSeconds: -2147483648 }
    respond({ ...section, ...body })
    await expect(updateSection(packageId, draftId, sectionId, body)).resolves.toMatchObject(body)
    request(`${sections}/${sectionId}`, 'PUT', body)
  })

  it.each([
    () => listPackages({ lessonId: 'invalid' }),
    () => createPackage({ ...createBody, packageType: 'TOPIC_TEST' }),
    () => createPackage({ ...createBody, packageType: 'COURSE_TEST' }),
    () => createPackage({ ...createBody, packageType: 'QUIZ', topicId: questionId }),
    () => addSectionQuestion(packageId, draftId, sectionId, { questionVersionId: questionId, maxScore: 0 }),
    () => removeSectionQuestion(packageId, draftId, sectionId, 'invalid'),
    () => reorderSectionQuestions(packageId, draftId, sectionId, [sectionQuestionId, sectionQuestionId]),
    () => updatePassage(packageId, draftId, sectionId, { text: '  ' }),
    () => updatePassage(packageId, draftId, sectionId, { text: 'a'.repeat(50001) }),
    () => updateAudio(packageId, draftId, sectionId, { ...audioBody, mediaReference: '../private.mp3' }),
    () => updateAudio(packageId, draftId, sectionId, { ...audioBody, durationSeconds: 7201 }),
    () => scheduleVersion(packageId, draftId, '2020-01-01T00:00:00Z'),
    () => publishVersion(packageId, 'invalid'),
    () => updateSection(packageId, draftId, sectionId, { ...sectionRequest, timeLimitSeconds: 2147483648 }),
  ])('blocks invalid authoring fields before fetching', async (action) => {
    await expect(action()).rejects.toBeInstanceOf(ZodError)
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('uploads the file in multipart FormData without setting a JSON Content-Type', async () => {
    const file = new File(['ID3x'], 'recording.mp3', { type: 'audio/mpeg' })
    respond(uploaded, 201)
    await expect(uploadAudio(file)).resolves.toEqual(uploaded)
    expect(fetchMock).toHaveBeenCalledTimes(1)
    const [url, options] = fetchMock.mock.calls[0]!
    expect(url).toBe(`${API_BASE_URL}/api/content/admin/media/audio`)
    expect(options).toMatchObject({ method: 'POST', credentials: 'include', headers: { Authorization: 'Bearer test-access-token' } })
    expect(options!.headers).not.toHaveProperty('Content-Type')
    expect(options!.body).toBeInstanceOf(FormData)
    expect((options!.body as FormData).get('file')).toBe(file)
  })

  it.each([
    { type: 'audio/mpeg', size: 0 }, { type: 'image/png', size: 4 }, { type: 'audio/mpeg', size: AUDIO_MAX_BYTES + 1 },
  ])('rejects an invalid upload before fetching: $type / $size bytes', async ({ type, size }) => {
    const file = new File(['audio'], 'recording.mp3', { type })
    Object.defineProperty(file, 'size', { value: size })
    await expect(uploadAudio(file)).rejects.toBeInstanceOf(ZodError)
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it.each([
    { status: 400, code: 'EMPTY_FILE' }, { status: 400, code: 'UNSUPPORTED_AUDIO' },
    { status: 413, code: 'AUDIO_TOO_LARGE' }, { status: 503, code: 'STORAGE_UNAVAILABLE' },
  ])('preserves upload $status / $code errors from the server', async ({ status, code }) => {
    const body = { message: 'Không tải được audio.', details: { code } }
    respond(body, status)
    await expect(uploadAudio(new File(['ID3x'], 'recording.mp3', { type: 'audio/mpeg' }))).rejects.toMatchObject({ status, body })
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('validates upload metadata before returning it', async () => {
    respond({ ...uploaded, sizeBytes: 'four' }, 201)
    await expect(uploadAudio(new File(['ID3x'], 'recording.mp3', { type: 'audio/mpeg' }))).rejects.toBeInstanceOf(ZodError)
  })

  it.each(['QUESTION_ALREADY_USED', 'QUESTION_PURPOSE_MISMATCH', 'INVALID_PACKAGE_LESSON'])('preserves publication validation %s', async (code) => {
    const body = { message: 'Chưa xuất bản được.', details: { code } }
    respond(body, 422)
    await expect(publishVersion(packageId, draftId)).rejects.toMatchObject({ status: 422, body })
  })
})
