import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { clearAccessToken, HttpError, setAccessToken } from '@/lib/httpClient'
import { API_BASE_URL } from '@/lib/env'
import { lessonResourceOrderSchema } from '../types'
import { RESOURCE_REORDER_ENABLED } from '../lib/resource-reorder'
import { findVocabularyByLemmas, reorderLessonResources, suggestVocabulary } from './lessonApi'

const lessonId = '00000000-0000-4000-8000-000000000001'
const resourceIds = ['00000000-0000-4000-8000-000000000003', '00000000-0000-4000-8000-000000000002']
const fetchMock = vi.fn<typeof fetch>()

describe('suggestVocabulary', () => {
  beforeEach(() => {
    fetchMock.mockReset()
    vi.stubGlobal('fetch', fetchMock)
    setAccessToken('test-access-token')
  })
  afterEach(() => {
    clearAccessToken()
    vi.unstubAllGlobals()
    vi.useRealTimers()
  })

  it('uses the authenticated bounded endpoint and parses pagination', async () => {
    fetchMock.mockResolvedValue(new Response(JSON.stringify({ content: [], page: 1, size: 20, hasMore: false })))
    await expect(suggestVocabulary(' poll% ', 1)).resolves.toEqual({ content: [], page: 1, size: 20, hasMore: false })
    const [url, options] = fetchMock.mock.calls[0]!
    expect(url).toBe(`${API_BASE_URL}/api/content/admin/vocabulary/suggestions?q=poll%25&page=1&size=20`)
    expect(options).toMatchObject({ headers: { Authorization: 'Bearer test-access-token' } })
  })

  it('rejects invalid pagination responses', async () => {
    fetchMock.mockResolvedValue(new Response(JSON.stringify({ content: [], page: 0, size: 500, hasMore: false })))
    await expect(suggestVocabulary('poll')).rejects.toThrow()
  })

  it('turns a request deadline into a retryable error rather than a silent cancellation', async () => {
    vi.useFakeTimers()
    fetchMock.mockImplementation((_url, options) => new Promise((_resolve, reject) => {
      options?.signal?.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')))
    }))
    const failure = expect(suggestVocabulary('poll')).rejects.toMatchObject({ status: 408 })
    await vi.advanceTimersByTimeAsync(5000)
    await failure
  })

  it('preserves cancellation when a query is replaced', async () => {
    fetchMock.mockImplementation((_url, options) => new Promise((_resolve, reject) => {
      options?.signal?.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')))
    }))
    const controller = new AbortController()
    const failure = expect(suggestVocabulary('poll', 0, controller.signal)).rejects.toMatchObject({ name: 'AbortError' })
    controller.abort()
    await failure
  })

  it('applies the deadline while reading a response body after headers have arrived', async () => {
    vi.useFakeTimers()
    const response = new Response('', { status: 200 })
    vi.spyOn(response, 'text').mockReturnValue(new Promise(() => {}))
    fetchMock.mockResolvedValue(response)
    const failure = expect(suggestVocabulary('poll')).rejects.toMatchObject({ status: 408 })
    await vi.advanceTimersByTimeAsync(5000)
    await failure
    expect(response.text).toHaveBeenCalled()
  })

  it('bounds auth refresh and does not dispatch a stale search after refresh completes', async () => {
    vi.useFakeTimers()
    clearAccessToken()
    let finishRefresh!: (response: Response) => void
    fetchMock.mockImplementationOnce(() => new Promise((resolve) => { finishRefresh = resolve }))
    const failure = expect(suggestVocabulary('poll')).rejects.toMatchObject({ status: 408 })
    await vi.advanceTimersByTimeAsync(5000)
    await failure
    finishRefresh(new Response(JSON.stringify({ accessToken: 'refreshed-test-token' })))
    await vi.advanceTimersByTimeAsync(0)
    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(fetchMock.mock.calls[0][0]).toBe(`${API_BASE_URL}/auth/refresh`)
  })
})

describe('reorderLessonResources', () => {
  beforeEach(() => {
    fetchMock.mockReset()
    vi.stubGlobal('fetch', fetchMock)
    setAccessToken('test-access-token')
  })

  afterEach(() => {
    clearAccessToken()
    vi.unstubAllGlobals()
  })

  it.each(['SLIDE', 'DOCUMENT'] as const)('sends one authenticated PUT with the whole %s order and accepts 204', async (type) => {
    fetchMock.mockResolvedValue(new Response(null, { status: 204 }))
    await expect(reorderLessonResources(lessonId, type, resourceIds)).resolves.toBeUndefined()
    expect(fetchMock).toHaveBeenCalledTimes(1)
    const [url, options] = fetchMock.mock.calls[0]!
    expect(url).toBe(`${API_BASE_URL}/api/content/admin/lessons/${lessonId}/resources/order`)
    expect(options).toMatchObject({
      method: 'PUT', credentials: 'include',
      headers: { Authorization: 'Bearer test-access-token', 'Content-Type': 'application/json' },
    })
    expect(JSON.parse(options!.body as string)).toEqual({ type, resourceIds })
  })

  it('preserves the backend validation failure', async () => {
    fetchMock.mockResolvedValue(new Response(JSON.stringify({ message: 'Danh sách tài nguyên đã thay đổi.' }), { status: 400 }))
    await expect(reorderLessonResources(lessonId, 'DOCUMENT', resourceIds)).rejects.toMatchObject({
      status: 400, message: 'Danh sách tài nguyên đã thay đổi.',
    } satisfies Partial<HttpError>)
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('rejects an unexpected nonempty success response', async () => {
    fetchMock.mockResolvedValue(new Response(JSON.stringify({ resourceIds }), { status: 200 }))
    await expect(reorderLessonResources(lessonId, 'SLIDE', resourceIds)).rejects.toThrow()
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it.each([
    { ids: ['not-a-uuid'] },
    { ids: [resourceIds[0]!, resourceIds[0]!] },
  ])('rejects malformed or duplicate IDs before a request', async ({ ids }) => {
    await expect(reorderLessonResources(lessonId, 'SLIDE', ids)).rejects.toThrow()
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('validates the resource type and permits the complete empty list', () => {
    expect(lessonResourceOrderSchema.safeParse({ type: 'VIDEO', resourceIds }).success).toBe(false)
    expect(lessonResourceOrderSchema.parse({ type: 'DOCUMENT', resourceIds: [] })).toEqual({ type: 'DOCUMENT', resourceIds: [] })
  })

  it('keeps the rollout disabled by default', () => {
    expect(RESOURCE_REORDER_ENABLED).toBe(false)
  })
})

describe('findVocabularyByLemmas', () => {
  beforeEach(() => {
    fetchMock.mockReset()
    vi.stubGlobal('fetch', fetchMock)
    setAccessToken('test-access-token')
  })

  afterEach(() => {
    clearAccessToken()
    vi.unstubAllGlobals()
  })

  it('asks the library for the exact lemmas in one authenticated call', async () => {
    fetchMock.mockResolvedValue(new Response(JSON.stringify([{ id: 'item', lemma: 'trend', senses: [{ id: 'sense', status: 'ACTIVE', vietnameseMeaning: 'xu hướng' }] }]), { status: 200 }))

    const hits = await findVocabularyByLemmas(['trend', 'plummet'])

    const [url, options] = fetchMock.mock.calls[0]!
    expect(url).toBe(`${API_BASE_URL}/api/content/vocabulary/by-lemmas?lemmas=trend%2Cplummet`)
    expect(options).toMatchObject({ headers: { Authorization: 'Bearer test-access-token' } })
    expect(hits[0]?.senses?.[0]?.id).toBe('sense')
  })
})
