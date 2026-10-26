import { beforeEach, describe, expect, it, vi } from 'vitest'
import { apiRequest } from '@/lib/httpClient'
import { createHttpLearningApi } from './httpLearningApi'
import { createMockLearningApi } from './mock/mockLearningApi'

vi.mock('@/lib/httpClient', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/httpClient')>()),
  apiRequest: vi.fn(),
}))

beforeEach(() => vi.mocked(apiRequest).mockReset())

describe('review basket summary', () => {
  it('reads the two counts from the summary route', async () => {
    vi.mocked(apiRequest).mockResolvedValue({ required: 2, due: 5 })

    expect(await createHttpLearningApi().getReviewBasketSummary()).toEqual({ required: 2, due: 5 })
    expect(vi.mocked(apiRequest).mock.calls[0][0]).toBe('/api/learning/review-basket/summary')
  })

  it('treats a count the backend leaves out as zero', async () => {
    vi.mocked(apiRequest).mockResolvedValue({})

    expect(await createHttpLearningApi().getReviewBasketSummary()).toEqual({ required: 0, due: 0 })
  })

  it('has the same two counts offline, from the mock basket', async () => {
    const summary = await createMockLearningApi().getReviewBasketSummary()

    expect(Object.keys(summary).sort()).toEqual(['due', 'required'])
    expect(Number.isInteger(summary.required) && Number.isInteger(summary.due)).toBe(true)
  })
})
