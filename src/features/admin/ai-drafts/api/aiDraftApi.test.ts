import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { API_BASE_URL } from '@/lib/env'
import { clearAccessToken, setAccessToken } from '@/lib/httpClient'
import { AI_DRAFT_STATUSES, QUESTION_DRAFT_TYPES, aiDraftSchema, questionDraftSchema, type AiDraft, type AiDraftQuery, type QuestionGenerationRequest } from '../types'
import { approveQuestionDraft, fetchAiDraft, fetchAiDrafts, rejectAiDraft, requestQuestionDraft } from './aiDraftApi'

const id = '00000000-0000-4000-8000-000000000001'
const base = `${API_BASE_URL}/api/content/admin/ai-drafts`
const draft: AiDraft = {
  id, kind: 'QUESTIONS', status: 'QUEUED',
  request: { nested: { instruction: 'Tạo bản nháp', count: 2, enabled: true, choices: [null, 'a'] } },
  result: null, errorCode: null, model: null, promptVersion: null,
  createdAt: '2026-10-23T01:02:03.123456789Z', finishedAt: null, reviewedAt: null, reviewNote: null,
}
const fetchMock = vi.fn<typeof fetch>()
const generationRequest: QuestionGenerationRequest = { knowledgePointId: id, questionType: 'MULTIPLE_CHOICE', count: 2, difficulty: 'MEDIUM', instructions: 'Tập trung vào suy luận.' }
const questionItem = {
  stem: 'Which statement follows?', difficulty: 'MEDIUM', explanation: 'The passage supports A.',
  options: [{ optionKey: 'A', content: 'First answer', sortOrder: 0 }, { optionKey: 'B', content: 'Second answer', sortOrder: 1 }],
  answerSpec: { type: 'CHOICE', correct: 'A', distractors: { B: 'PARAPHRASE_TRAP' } },
}
const questionDraft = { ...draft, request: generationRequest }
const readyQuestionDraft = { ...questionDraft, status: 'READY', result: { items: [questionItem, questionItem], rejected: [{ index: 2, reason: 'BAD_STEM' }] } }

function json(value: unknown, status = 200) {
  return new Response(JSON.stringify(value), { status, headers: { 'Content-Type': 'application/json' } })
}

describe('AI draft API', () => {
  beforeEach(() => {
    fetchMock.mockReset()
    vi.stubGlobal('fetch', fetchMock)
    setAccessToken('test-access-token')
  })

  afterEach(() => {
    clearAccessToken()
    vi.unstubAllGlobals()
  })

  it('lists the returned array with all optional filters and auth', async () => {
    fetchMock.mockResolvedValue(json([draft]))
    await expect(fetchAiDrafts({ kind: 'QUESTIONS', status: 'QUEUED', page: 0, size: 20 })).resolves.toEqual([draft])
    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(fetchMock).toHaveBeenCalledWith(`${base}?kind=QUESTIONS&status=QUEUED&page=0&size=20`, expect.objectContaining({
      method: 'GET', credentials: 'include', headers: expect.objectContaining({ Authorization: 'Bearer test-access-token' }),
    }))
  })

  it('omits unset filters and relies on the server pagination defaults', async () => {
    fetchMock.mockResolvedValue(json([]))
    await expect(fetchAiDrafts()).resolves.toEqual([])
    expect(fetchMock.mock.calls[0]![0]).toBe(base)
  })

  it('supports course filters and the maximum page size', async () => {
    fetchMock.mockResolvedValue(json([]))
    await fetchAiDrafts({ kind: 'COURSE', status: 'READY', page: 3, size: 100 })
    expect(fetchMock.mock.calls[0]![0]).toBe(`${base}?kind=COURSE&status=READY&page=3&size=100`)
  })

  it('fetches a detail with generic result JSON preserved', async () => {
    const ready = { ...draft, status: 'READY', result: { items: [{ content: 'Bản nháp', tags: ['a'] }], score: 1 }, model: 'configured-model', promptVersion: 'v1', finishedAt: draft.createdAt }
    fetchMock.mockResolvedValue(json(ready))
    await expect(fetchAiDraft(id)).resolves.toEqual(ready)
    expect(fetchMock).toHaveBeenCalledWith(`${base}/${id}`, expect.objectContaining({ method: 'GET', credentials: 'include' }))
  })

  it('forwards cancellation through the HTTP client', async () => {
    fetchMock.mockResolvedValue(json(draft))
    const controller = new AbortController()
    await fetchAiDraft(id, controller.signal)
    const requestSignal = fetchMock.mock.calls[0]![1]!.signal!
    expect(requestSignal.aborted).toBe(false)
    controller.abort()
    expect(requestSignal.aborted).toBe(true)
  })

  it('rejects with the exact note body and validates the returned draft', async () => {
    const note = '  Cần biên tập lại.  '
    const rejected = { ...draft, status: 'REJECTED', reviewNote: note, reviewedAt: draft.createdAt }
    fetchMock.mockResolvedValue(json(rejected))
    await expect(rejectAiDraft(id, { note })).resolves.toEqual(rejected)
    expect(fetchMock).toHaveBeenCalledWith(`${base}/${id}/reject`, expect.objectContaining({
      method: 'POST', credentials: 'include', body: JSON.stringify({ note }),
      headers: expect.objectContaining({ Authorization: 'Bearer test-access-token', 'Content-Type': 'application/json' }),
    }))
  })

  it.each(['', 'a'.repeat(1000)])('accepts a note within the server length limit', async (note) => {
    fetchMock.mockResolvedValue(json({ ...draft, status: 'REJECTED', reviewNote: note }))
    await expect(rejectAiDraft(id, { note })).resolves.toMatchObject({ reviewNote: note })
  })

  it('rejects an oversized note before sending a request', async () => {
    await expect(rejectAiDraft(id, { note: 'a'.repeat(1001) })).rejects.toThrow()
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it.each([
    { query: { page: -1 } }, { query: { page: 1.5 } },
    { query: { size: 0 } }, { query: { size: 101 } },
    { query: { kind: 'UNKNOWN' } }, { query: { status: 'UNKNOWN' } },
  ])('rejects invalid filters before sending a request: $query', async ({ query }) => {
    await expect(fetchAiDrafts(query as AiDraftQuery)).rejects.toThrow()
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('validates detail and reject IDs before using them in a URL', async () => {
    await expect(fetchAiDraft('../other')).rejects.toThrow()
    await expect(rejectAiDraft('invalid', { note: '' })).rejects.toThrow()
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it.each([400, 403, 404, 429])('preserves status %s and backend details', async (status) => {
    const body = { message: 'Không thể xử lý bản nháp.', details: { code: status === 429 ? 'AI_QUOTA_EXCEEDED' : 'INVALID_CONTENT_STATE' } }
    fetchMock.mockResolvedValue(json(body, status))
    await expect(rejectAiDraft(id, { note: '' })).rejects.toMatchObject({ status, message: body.message, body })
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('rejects a page envelope where the contract requires an array', async () => {
    fetchMock.mockResolvedValue(json({ content: [draft], totalElements: 1 }))
    await expect(fetchAiDrafts()).rejects.toThrow()
  })

  it.each([
    { field: 'request', value: null }, { field: 'request', value: [] },
    { field: 'result', value: 'not an object' }, { field: 'result', value: [] },
    { field: 'id', value: 'invalid' }, { field: 'status', value: 'UNKNOWN' },
    { field: 'createdAt', value: 'yesterday' },
  ])('rejects a malformed $field in a successful detail response', async ({ field, value }) => {
    fetchMock.mockResolvedValue(json({ ...draft, [field]: value }))
    await expect(fetchAiDraft(id)).rejects.toThrow()
  })

  it('also validates each list entry and the reject response', async () => {
    fetchMock.mockResolvedValueOnce(json([{ ...draft, kind: 'UNKNOWN' }]))
    await expect(fetchAiDrafts()).rejects.toThrow()
    fetchMock.mockResolvedValueOnce(json(null))
    await expect(rejectAiDraft(id, { note: '' })).rejects.toThrow()
  })

  it.each(AI_DRAFT_STATUSES)('accepts %s with the nullable metadata from the DTO', (status) => {
    expect(aiDraftSchema.parse({ ...draft, status })).toEqual({ ...draft, status })
  })

  it('requests questions with authenticated POST and accepts the queued 202 response', async () => {
    fetchMock.mockResolvedValue(json(questionDraft, 202))
    await expect(requestQuestionDraft(generationRequest)).resolves.toEqual(questionDraft)
    expect(fetchMock).toHaveBeenCalledWith(`${base}/questions`, expect.objectContaining({
      method: 'POST', credentials: 'include', body: JSON.stringify(generationRequest),
      headers: expect.objectContaining({ Authorization: 'Bearer test-access-token', 'Content-Type': 'application/json' }),
    }))
  })

  it.each(QUESTION_DRAFT_TYPES)('supports the contracted question type %s', async (questionType) => {
    const request = { ...generationRequest, questionType }
    fetchMock.mockResolvedValue(json({ ...questionDraft, request }, 202))
    await expect(requestQuestionDraft(request)).resolves.toMatchObject({ request })
  })

  it.each([
    { patch: { knowledgePointId: 'invalid' } }, { patch: { questionType: 'ESSAY' } },
    { patch: { questionType: 'SPEAKING' } }, { patch: { count: 0 } }, { patch: { count: 21 } },
    { patch: { count: 1.5 } }, { patch: { difficulty: 'UNKNOWN' } }, { patch: { instructions: 'a'.repeat(501) } },
  ])('validates generation input before sending a request: $patch', async ({ patch }) => {
    await expect(requestQuestionDraft({ ...generationRequest, ...patch } as QuestionGenerationRequest)).rejects.toThrow()
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('accepts the configured default maximum and optional instructions', async () => {
    const request = { knowledgePointId: id, questionType: 'SHORT_ANSWER', count: 20, difficulty: 'HARD' } as const
    fetchMock.mockResolvedValue(json({ ...questionDraft, request }, 202))
    await expect(requestQuestionDraft(request)).resolves.toMatchObject({ request })
  })

  it('approves only the chosen indexes and parses the approved draft', async () => {
    const approved = { ...readyQuestionDraft, status: 'APPROVED', reviewedAt: draft.createdAt }
    fetchMock.mockResolvedValue(json(approved))
    await expect(approveQuestionDraft(id, { itemIndexes: [1] })).resolves.toEqual(approved)
    expect(fetchMock).toHaveBeenCalledWith(`${base}/${id}/approve`, expect.objectContaining({
      method: 'POST', credentials: 'include', body: JSON.stringify({ itemIndexes: [1] }),
      headers: expect.objectContaining({ Authorization: 'Bearer test-access-token' }),
    }))
  })

  it.each([{ itemIndexes: [] }, { itemIndexes: [-1] }, { itemIndexes: [0.5] }, { itemIndexes: [0, 0] }])('validates approval indexes before sending a request: $itemIndexes', async (body) => {
    await expect(approveQuestionDraft(id, body)).rejects.toThrow()
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('rejects an invalid approval ID before sending a request', async () => {
    await expect(approveQuestionDraft('../invalid', { itemIndexes: [0] })).rejects.toThrow()
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it.each([400, 404, 429])('preserves generation error %s including quota details', async (status) => {
    const body = { message: 'Không tạo được bản nháp.', details: { code: status === 429 ? 'AI_QUOTA_EXCEEDED' : 'INVALID_CONTENT_STATE' } }
    fetchMock.mockResolvedValue(json(body, status))
    await expect(requestQuestionDraft(generationRequest)).rejects.toMatchObject({ status, body })
  })

  it('preserves approval failure so selected items can be retried', async () => {
    const body = { message: 'Bản nháp không còn sẵn sàng.' }
    fetchMock.mockResolvedValue(json(body, 400))
    await expect(approveQuestionDraft(id, { itemIndexes: [0] })).rejects.toMatchObject({ status: 400, body })
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('validates generation and approval responses as question drafts', async () => {
    fetchMock.mockResolvedValueOnce(json({ ...questionDraft, kind: 'COURSE' }, 202))
    await expect(requestQuestionDraft(generationRequest)).rejects.toThrow()
    fetchMock.mockResolvedValueOnce(json({ ...readyQuestionDraft, result: { items: [{ ...questionItem, answerSpec: { type: 'CHOICE', correct: ['A'] } }], rejected: [] } }))
    await expect(approveQuestionDraft(id, { itemIndexes: [0] })).rejects.toThrow()
  })

  it('accepts the published FILL answer shape and future rejection reason codes', () => {
    const item = { ...questionItem, options: [], answerSpec: { type: 'FILL', accepted: ['critics', 'reviewers'], maxWords: 2 } }
    const response = { ...readyQuestionDraft, result: { items: [item], rejected: [{ index: 1, reason: 'FUTURE_REASON' }] } }
    expect(questionDraftSchema.parse(response)).toEqual(response)
  })

  it('accepts CHOICE without optional distractor tags and rejects a malformed distractor map', () => {
    const response = { ...readyQuestionDraft, result: { items: [{ ...questionItem, answerSpec: { type: 'CHOICE', correct: 'A' } }], rejected: [] } }
    expect(questionDraftSchema.parse(response)).toEqual(response)
    expect(questionDraftSchema.safeParse({ ...response, result: { items: [{ ...questionItem, answerSpec: { type: 'CHOICE', correct: 'A', distractors: { B: ['TRAP'] } } }], rejected: [] } }).success).toBe(false)
  })
})
