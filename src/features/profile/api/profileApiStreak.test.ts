import { beforeEach, describe, expect, it, vi } from 'vitest'

const apiRequest = vi.fn()
vi.mock('@/lib/httpClient', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/httpClient')>()),
  apiRequest: (...args: unknown[]) => apiRequest(...args),
}))

import { profileApi } from './profileApi'

describe('profileApi.getStreak', () => {
  beforeEach(() => { apiRequest.mockReset() })

  it('reads the streak the Learning Service counts, not the old client-reported one', async () => {
    apiRequest.mockResolvedValue({
      currentDays: 6, longestDays: 16, freezeAvailable: false, nextFreezeCost: 10, activeToday: true, lostStreakDays: 0,
    })

    const streak = await profileApi.getStreak()

    expect(apiRequest).toHaveBeenCalledWith('/api/learning/me/streak', { auth: true })
    expect(streak.currentDays).toBe(6)
    expect(streak.longestDays).toBe(16)
  })

  it('shows no streak when the request fails', async () => {
    apiRequest.mockRejectedValue(new Error('offline'))

    expect(await profileApi.getStreak()).toEqual({ currentDays: 0, longestDays: 0 })
  })
})
