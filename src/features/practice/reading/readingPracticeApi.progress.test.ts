import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const apiRequest = vi.hoisted(() => vi.fn())
vi.mock('@/lib/httpClient', () => ({ apiRequest }))

import { getCatalogProgress } from './readingPracticeApi'

describe('getCatalogProgress', () => {
  beforeEach(() => { apiRequest.mockResolvedValue({ completed: [] }) })
  afterEach(() => { apiRequest.mockReset() })

  it.each(['SPEAKING', 'WRITING'] as const)('reads %s from Learning, which keeps those answers', async (skill) => {
    await getCatalogProgress('PART', undefined, skill)

    expect(apiRequest).toHaveBeenCalledWith(`/api/learning/practice-progress?skill=${skill}&scope=PART`, expect.objectContaining({ auth: true }))
  })

  it.each(['READING', 'LISTENING'] as const)('reads %s from Assessment, which keeps those attempts', async (skill) => {
    await getCatalogProgress('FULL', undefined, skill)

    expect(apiRequest).toHaveBeenCalledWith(`/api/assessments/practice/progress?skill=${skill}&scope=FULL`, expect.objectContaining({ auth: true }))
  })
})
