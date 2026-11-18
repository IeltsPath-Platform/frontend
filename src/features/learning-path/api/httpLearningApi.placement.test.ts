import { beforeEach, describe, expect, it, vi } from 'vitest'
import { apiRequest } from '@/lib/httpClient'
import { createHttpLearningApi } from './httpLearningApi'

vi.mock('@/lib/httpClient', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/httpClient')>()),
  apiRequest: vi.fn(),
}))

describe('placement API', () => {
  beforeEach(() => vi.mocked(apiRequest).mockReset())

  it('loads pool options and the open assignment', async () => {
    const options = {
      pools: [{ pool: 'BAND_0_3', examCount: 2 }, { pool: 'BAND_3_5', examCount: 1 }, { pool: 'BAND_5_9', examCount: 0 }],
      limitPer24h: 3, retakesLeft: 2, nextRetakeAt: null, hasPlacement: true, currentBand: 4.5, openAssignment: null,
    }
    vi.mocked(apiRequest).mockResolvedValue(options)
    await expect(createHttpLearningApi().getPlacementOptions()).resolves.toEqual(options)
    expect(apiRequest).toHaveBeenCalledWith('/api/learning/placement-test/options', { auth: true })
  })

  it('assigns a pool and releases a failed start assignment', async () => {
    const assignment = { assignmentId: 'assignment-1', pool: 'BAND_3_5', packageId: 'package-1', packageVersionId: 'version-1', retakesLeft: 2, nextRetakeAt: null }
    vi.mocked(apiRequest).mockResolvedValueOnce(assignment).mockResolvedValueOnce(undefined)
    const api = createHttpLearningApi()
    await expect(api.assignPlacementTest('BAND_3_5')).resolves.toEqual(assignment)
    await api.releasePlacementAssignment('assignment-1')
    expect(apiRequest).toHaveBeenNthCalledWith(1, '/api/learning/placement-test/assignments', { auth: true, method: 'POST', body: { pool: 'BAND_3_5' } })
    expect(apiRequest).toHaveBeenNthCalledWith(2, '/api/learning/placement-test/assignments/assignment-1/release', { auth: true, method: 'POST' })
  })

  it('cancels an in-progress assessment attempt', async () => {
    vi.mocked(apiRequest).mockResolvedValue(undefined)
    await createHttpLearningApi().cancelAttempt('attempt-1')
    expect(apiRequest).toHaveBeenCalledWith('/api/assessments/attempts/attempt-1/cancel', { auth: true, method: 'POST' })
  })
})
