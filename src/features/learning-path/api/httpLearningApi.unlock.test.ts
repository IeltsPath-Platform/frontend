import { beforeEach, describe, expect, it, vi } from 'vitest'
import { apiRequest } from '@/lib/httpClient'
import { createHttpLearningApi } from './httpLearningApi'

vi.mock('@/lib/httpClient', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/httpClient')>()),
  apiRequest: vi.fn(),
}))

describe('course skill unlock request', () => {
  beforeEach(() => vi.mocked(apiRequest).mockReset())

  it('sends the purchase target and idempotency key to the learning API', async () => {
    vi.mocked(apiRequest).mockResolvedValue({ courseId: 'course-1', target: 'COMBO', pointCost: 45, status: 'ACTIVE', ledgerEntryId: 'ledger-1' })
    const result = await createHttpLearningApi().unlockCourse('course-1', 'COMBO', 'purchase-key')
    expect(apiRequest).toHaveBeenCalledWith('/api/learning/courses/course-1/unlocks', {
      auth: true, method: 'POST', body: { target: 'COMBO' }, headers: { 'Idempotency-Key': 'purchase-key' },
    })
    expect(result).toMatchObject({ target: 'COMBO', pointCost: 45, status: 'ACTIVE' })
  })
})
