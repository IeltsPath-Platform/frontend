import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { clearAccessToken, HttpError, setAccessToken } from '@/lib/httpClient'
import { fetchRubricVersions } from './rubricApi'

const fetchMock = vi.fn<typeof fetch>()
const version = { code: 'IELTS / T2?&', task: 'TASK_2', version: 4, status: 'RETIRED' }

describe('fetchRubricVersions', () => {
  beforeEach(() => {
    fetchMock.mockReset()
    vi.stubGlobal('fetch', fetchMock)
    setAccessToken('test-access-token')
  })
  afterEach(() => { clearAccessToken(); vi.unstubAllGlobals() })

  it('requests encoded code with authenticated GET and parses retired history', async () => {
    fetchMock.mockResolvedValue(new Response(JSON.stringify([version]), { status: 200 }))
    await expect(fetchRubricVersions(version.code)).resolves.toEqual([version])
    expect(fetchMock).toHaveBeenCalledWith(expect.stringContaining('/api/content/admin/rubrics/versions?code=IELTS%20%2F%20T2%3F%26'), expect.objectContaining({
      method: 'GET', credentials: 'include', headers: expect.objectContaining({ Authorization: 'Bearer test-access-token' }),
    }))
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('accepts an empty history', async () => {
    fetchMock.mockResolvedValue(new Response('[]', { status: 200 }))
    await expect(fetchRubricVersions('NEW')).resolves.toEqual([])
  })

  it.each([
    { ...version, version: 0 },
    { ...version, version: 1.5 },
    { ...version, task: 'TASK_3' },
    { ...version, status: 'UNKNOWN' },
    { task: 'TASK_2', version: 1, status: 'DRAFT' },
  ])('rejects malformed history entry %j', async (entry) => {
    fetchMock.mockResolvedValue(new Response(JSON.stringify([entry]), { status: 200 }))
    await expect(fetchRubricVersions('IELTS_WRITING_T2')).rejects.toThrow()
  })

  it('rejects an object in place of the array', async () => {
    fetchMock.mockResolvedValue(new Response(JSON.stringify(version), { status: 200 }))
    await expect(fetchRubricVersions(version.code)).rejects.toThrow()
  })

  it('surfaces HTTP failures', async () => {
    fetchMock.mockResolvedValue(new Response('{"message":"History unavailable"}', { status: 503 }))
    await expect(fetchRubricVersions(version.code)).rejects.toMatchObject({ status: 503, message: 'History unavailable' } satisfies Partial<HttpError>)
  })

  it('forwards caller cancellation to the fetch request', async () => {
    const controller = new AbortController()
    let requestSignal: AbortSignal | null | undefined
    fetchMock.mockImplementation((_input, init) => {
      requestSignal = init?.signal
      return new Promise((_resolve, reject) => requestSignal?.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError'))))
    })
    const request = fetchRubricVersions(version.code, controller.signal)
    controller.abort()
    await expect(request).rejects.toMatchObject({ name: 'AbortError' })
    expect(requestSignal?.aborted).toBe(true)
  })
})
