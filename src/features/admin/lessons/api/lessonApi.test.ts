import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { clearAccessToken, HttpError, setAccessToken } from '@/lib/httpClient'
import { API_BASE_URL } from '@/lib/env'
import { lessonResourceOrderSchema } from '../types'
import { RESOURCE_REORDER_ENABLED } from '../lib/resource-reorder'
import { reorderLessonResources } from './lessonApi'

const lessonId = '00000000-0000-4000-8000-000000000001'
const resourceIds = ['00000000-0000-4000-8000-000000000003', '00000000-0000-4000-8000-000000000002']
const fetchMock = vi.fn<typeof fetch>()

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
