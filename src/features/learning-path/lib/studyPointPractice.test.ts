import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { EssayStudyPoint } from '~types/learningPath'
import { ApiError } from '../api'
import { startStudyPointPractice } from './studyPointPractice'

const { startFreePractice, reportApiError } = vi.hoisted(() => ({ startFreePractice: vi.fn(), reportApiError: vi.fn() }))
vi.mock('../api', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../api')>()), learningApi: { startFreePractice },
}))
vi.mock('./reviewGate', () => ({ reportApiError }))

const point: EssayStudyPoint = {
  kind: 'CRITERION', criterionCode: 'CC', band: 5.5, knowledgePointId: 'kp-1',
  code: 'DEMO_WRITING_CRITERION_CC', name: 'Mạch lạc và liên kết (CC)', title: 'Cohesion', reason: null,
}

describe('startStudyPointPractice', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    startFreePractice.mockResolvedValue({ attemptId: 'attempt-9' })
  })

  it('starts the knowledge point and navigates with the return path and point details', async () => {
    const navigate = vi.fn()
    await startStudyPointPractice(point, '/learn/lessons/l1', navigate)
    expect(startFreePractice).toHaveBeenCalledExactlyOnceWith('kp-1')
    expect(navigate).toHaveBeenCalledExactlyOnceWith('/learn/practice/attempt-9', {
      state: { freePractice: { pointName: point.name, pointCode: point.code, backTo: '/learn/lessons/l1' } },
    })
  })

  it.each([
    ['Cohesion', 'Cohesion'],
    [null, 'Bộ luyện tự do'],
  ])('uses a fallback name when only title %s is available', async (title, expected) => {
    const navigate = vi.fn()
    await startStudyPointPractice({ ...point, name: null, code: null, title }, '/back?tab=practice', navigate)
    expect(navigate).toHaveBeenCalledWith('/learn/practice/attempt-9', {
      state: { freePractice: { pointName: expected, pointCode: '', backTo: '/back?tab=practice' } },
    })
  })

  it('does nothing without a knowledge point', async () => {
    const navigate = vi.fn()
    await startStudyPointPractice({ ...point, knowledgePointId: null }, '/back', navigate)
    expect(startFreePractice).not.toHaveBeenCalled()
    expect(navigate).not.toHaveBeenCalled()
  })

  it('reports and rethrows a refusal without navigating', async () => {
    const error = new ApiError(409, 'FREE_PRACTICE_EXHAUSTED', 'exhausted')
    startFreePractice.mockRejectedValueOnce(error)
    const navigate = vi.fn()
    await expect(startStudyPointPractice(point, '/back', navigate)).rejects.toBe(error)
    expect(reportApiError).toHaveBeenCalledExactlyOnceWith(error)
    expect(navigate).not.toHaveBeenCalled()
  })
})
