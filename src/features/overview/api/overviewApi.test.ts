import { afterEach, describe, expect, it, vi } from 'vitest'
import { overviewApi, type ProgressStatistics } from './overviewApi'

function page(index: number, totalCourses: number, hasNext: boolean): ProgressStatistics {
  return {
    availability: 'AVAILABLE', generatedAt: '', dataFrom: '', scope: 'STARTED_COURSES', curriculumRevision: '1', skills: [],
    page: index, size: 20, totalCourses, hasNext,
    courses: Array.from({ length: Math.min(20, totalCourses - index * 20) }, (_, offset) => ({
      courseId: `c${index * 20 + offset}`, name: 'IELTS', bandLevel: 7, completedLessons: 1, totalLessons: 10, percent: 10,
      startedAt: null, lastStudiedAt: null, activityProvenance: 'RECORDED', resumeTarget: { type: 'COURSE', courseId: `c${index * 20 + offset}` },
    })),
  }
}
afterEach(() => vi.restoreAllMocks())

describe('overviewApi.allProgress', () => {
  it('loads every course beyond the first page with the same cancellation signal', async () => {
    const progress = vi.spyOn(overviewApi, 'progress').mockResolvedValueOnce(page(0, 45, true)).mockResolvedValueOnce(page(1, 45, true)).mockResolvedValueOnce(page(2, 45, false))
    const signal = new AbortController().signal
    const result = await overviewApi.allProgress(signal)
    expect(result.courses).toHaveLength(45)
    expect(result.courses.at(-1)?.courseId).toBe('c44')
    expect(progress.mock.calls).toEqual([[0, '', signal, 20], [1, '', signal, 20], [2, '', signal, 20]])
    expect(result.hasNext).toBe(false)
  })

  it('does not show a partial list when a later request fails', async () => {
    vi.spyOn(overviewApi, 'progress').mockResolvedValueOnce(page(0, 25, true)).mockRejectedValueOnce(new DOMException('Aborted', 'AbortError'))
    await expect(overviewApi.allProgress(new AbortController().signal)).rejects.toMatchObject({ name: 'AbortError' })
  })

  it('asks for a reload when pagination shifts and repeats a course', async () => {
    const next = page(1, 21, false)
    next.courses[0].courseId = 'c0'
    vi.spyOn(overviewApi, 'progress').mockResolvedValueOnce(page(0, 21, true)).mockResolvedValueOnce(next)
    await expect(overviewApi.allProgress(new AbortController().signal)).rejects.toThrow('Chưa tải đủ')
  })

  it('bounds fetching at the supported maximum instead of looping on bad pagination', async () => {
    const progress = vi.spyOn(overviewApi, 'progress').mockImplementation(async (index) => page(index, 100, true))
    await expect(overviewApi.allProgress(new AbortController().signal)).rejects.toThrow('Chưa tải đủ')
    expect(progress).toHaveBeenCalledTimes(5)
  })
})
