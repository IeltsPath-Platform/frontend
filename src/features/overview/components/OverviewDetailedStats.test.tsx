import { act, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, useLocation } from 'react-router-dom'
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { overviewApi, type ProgressStatistics, type BandStatistics } from '../api/overviewApi'
import { notebookApi } from '@/features/vocabulary/api/notebookApi'
import { OverviewDetailedStats } from './OverviewDetailedStats'

vi.mock('@/features/auth/authSession', () => ({ useAuthSession: () => ({ isLoggedIn: true, email: 'learner@example.test' }) }))
vi.mock('../api/overviewApi', () => ({ overviewApi: { allProgress: vi.fn(), progress: vi.fn(), bands: vi.fn(), bandAvailability: vi.fn(), report: vi.fn(), placementBand: vi.fn(), writingProgress: vi.fn() } }))
vi.mock('@/features/vocabulary/api/notebookApi', () => ({ notebookApi: { getVocabularyMap: vi.fn() } }))

const course = { courseId: 'course-1', name: 'IELTS Foundation', bandLevel: 5.5, completedLessons: 3, totalLessons: 10, percent: 30, startedAt: null, lastStudiedAt: null, activityProvenance: 'STUDY_SESSION', resumeTarget: { type: 'COURSE' as const, courseId: 'course-1' } }
const progress: ProgressStatistics = { availability: 'AVAILABLE', generatedAt: '', dataFrom: '', scope: 'ALL', curriculumRevision: '1', skills: ['LISTENING', 'READING', 'WRITING', 'SPEAKING'].map((skill) => ({ skill, completedLessons: 3, totalLessons: 10, percent: 30 })) as ProgressStatistics['skills'], courses: [course], page: 0, size: 4, totalCourses: 1, hasNext: false }
const bands: BandStatistics = { availability: 'AVAILABLE', generatedAt: '', dataFrom: null, seriesKind: 'MOCK', skill: 'LISTENING', eligibilityReason: null, points: [{ attemptId: 'first', submittedAt: '2026-10-02T10:00:00Z', band: 5, resultVersion: 1, pendingRegrade: false, gradingSource: 'TEACHER', measurementQuality: 'MEASURED', scoringVersion: '1' }, { attemptId: 'a', submittedAt: '2026-11-02T10:00:00Z', band: 5.5, resultVersion: 1, pendingRegrade: false, gradingSource: 'TEACHER', measurementQuality: 'MEASURED', scoringVersion: '1' }], baseline: 5, latest: 5.5, delta: .5, nextCursor: null }
const courses = Array.from({ length: 6 }, (_, index) => ({ ...course, courseId: `course-${index + 1}`, name: `IELTS Course ${index + 1}`, resumeTarget: { type: 'COURSE' as const, courseId: `course-${index + 1}` } }))
function selectedProgress(completedLessons: number, totalLessons: number): ProgressStatistics {
  return { ...progress, scope: 'COURSE', skills: progress.skills.map((skill) => ({ ...skill, completedLessons, totalLessons, percent: completedLessons / totalLessons * 100 })) }
}
function LocationProbe() { return <output aria-label="Current location">{useLocation().search}</output> }
function mount(query = '') { return render(<MemoryRouter initialEntries={[`/overview?tab=detailed-stats${query}`]}><OverviewDetailedStats /><LocationProbe /></MemoryRouter>) }
const skillCard = () => screen.getByRole('region', { name: 'Tiến Độ 4 Kỹ Năng' })
async function chooseCourse(user: ReturnType<typeof userEvent.setup>, name: string) {
  within(skillCard()).getByRole('combobox', { name: 'Khóa học' }).focus()
  await user.keyboard('{Enter}')
  screen.getByRole('option', { name }).focus()
  await user.keyboard('{Enter}')
}
function deferred<T>() {
  let resolve!: (value: T) => void
  let reject!: (reason: Error) => void
  const promise = new Promise<T>((resolvePromise, rejectPromise) => { resolve = resolvePromise; reject = rejectPromise })
  return { promise, resolve, reject }
}
const originalScroll = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'scrollIntoView')
beforeAll(() => Object.defineProperty(HTMLElement.prototype, 'scrollIntoView', { configurable: true, value: vi.fn() }))
afterAll(() => {
  if (originalScroll) Object.defineProperty(HTMLElement.prototype, 'scrollIntoView', originalScroll)
  else Reflect.deleteProperty(HTMLElement.prototype, 'scrollIntoView')
})

beforeEach(() => {
  vi.resetAllMocks()
  vi.mocked(overviewApi.allProgress).mockResolvedValue(progress)
  vi.mocked(overviewApi.progress).mockResolvedValue(progress)
  vi.mocked(overviewApi.bands).mockResolvedValue(bands)
  vi.mocked(overviewApi.placementBand).mockResolvedValue(null)
  vi.mocked(overviewApi.writingProgress).mockResolvedValue({ tasks: [] })
  vi.mocked(overviewApi.report).mockResolvedValue({ skills: [], estimatedBand: null, target: { targetBand: 7, gap: 1, examDate: null } })
  vi.mocked(overviewApi.bandAvailability).mockResolvedValue({ options: [{ seriesKind: 'MOCK', skill: 'LISTENING', latestSubmittedAt: '2026-11-02T10:00:00Z' }, { seriesKind: 'PLACEMENT', skill: 'LISTENING', latestSubmittedAt: '2026-10-02T10:00:00Z' }] })
  vi.mocked(notebookApi.getVocabularyMap).mockResolvedValue({ currentBand: 'B1', suggestedBand: 'A2', bands: [{ cefr: 'B1', band: '4.0–5.0', total: 100, learned: 70, learning: 40, needsReview: 30, notLearned: 30 }] })
})

describe('OverviewDetailedStats', () => {
  it('renders real section data and leaves excluded features out', async () => {
    mount()
    expect(await screen.findByText('+0.5 BAND')).toBeVisible()
    expect(screen.queryByRole('region', { name: 'Biểu đồ thời gian học' })).not.toBeInTheDocument()
    expect(screen.queryByRole('region', { name: 'Các Khóa Học Của Tôi' })).not.toBeInTheDocument()
    expect(screen.getByRole('progressbar', { name: 'Tỷ lệ từ vựng đã học' })).toHaveAttribute('value', '70')
    expect(screen.getByRole('progressbar', { name: /B1, IELTS 4.0–5.0/ })).toHaveAttribute('aria-valuetext', '70 trên 100 nghĩa đã học')
    expect(screen.getByText('40 đang học · 30 cần ôn')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Xem bản đồ chi tiết/ })).toHaveAttribute('href', '/vocabulary/map')
    expect(screen.queryByText(/Study Plan|Phản hồi từ mentor|AI nhận xét|Tiếp tục học/i)).not.toBeInTheDocument()
    expect(overviewApi.bands).toHaveBeenCalledWith(expect.any(String), expect.any(String), 'LISTENING', 'MOCK', '', expect.any(AbortSignal))
  })

  it('puts the band journey in its own block below skill progress and shows the target', async () => {
    mount()
    await screen.findByText('+0.5 BAND')
    const skills = screen.getByRole('region', { name: 'Tiến Độ 4 Kỹ Năng' })
    const journey = screen.getByRole('region', { name: 'Hành trình band của bạn' })
    expect(skills.contains(journey)).toBe(false)
    expect(skills.compareDocumentPosition(journey) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    expect(await screen.findByText('Mục tiêu 7.0', { selector: 'li' })).toBeInTheDocument()
  })

  it('keeps the band journey working when the target report cannot be loaded', async () => {
    vi.mocked(overviewApi.report).mockRejectedValue(new Error('report unavailable'))
    mount()
    expect(await screen.findByText('+0.5 BAND')).toBeVisible()
    expect(screen.queryByText(/Mục tiêu \d/)).not.toBeInTheDocument()
  })

  it('requests the selected rolling range for the bands and keeps progress independent of it', async () => {
    const user = userEvent.setup()
    mount()
    await screen.findByText('+0.5 BAND')
    await user.click(screen.getByRole('button', { name: '6 tháng' }))
    await waitFor(() => expect(overviewApi.bands).toHaveBeenLastCalledWith(expect.any(String), expect.any(String), 'LISTENING', 'MOCK', '', expect.any(AbortSignal)))
    expect(overviewApi.allProgress).toHaveBeenCalledTimes(1)
    expect(overviewApi.progress).not.toHaveBeenCalled()
    await user.click(screen.getByRole('button', { name: '8 tuần' }))
    expect(screen.getByRole('button', { name: '8 tuần' })).toHaveAttribute('aria-pressed', 'true')
  })

  it('never requests placement as a series, even from an old placement link', async () => {
    mount('&series=PLACEMENT&skill=SPEAKING')
    await screen.findByRole('region', { name: 'Hành trình band của bạn' })
    await waitFor(() => expect(overviewApi.bands).toHaveBeenCalledWith(expect.any(String), expect.any(String), 'SPEAKING', 'OFFICIAL_PRACTICE', '', expect.any(AbortSignal)))
    expect(overviewApi.bands).not.toHaveBeenCalledWith(expect.any(String), expect.any(String), expect.anything(), 'PLACEMENT', expect.anything(), expect.anything())
  })

  it('paginates band history and resets the cursor on a skill change', async () => {
    const user = userEvent.setup()
    vi.mocked(overviewApi.bands).mockResolvedValue({ ...bands, nextCursor: 'older-page' })
    mount()
    await user.click(await screen.findByRole('button', { name: 'Cũ hơn' }))
    await waitFor(() => expect(overviewApi.bands).toHaveBeenLastCalledWith(expect.any(String), expect.any(String), 'LISTENING', 'MOCK', 'older-page', expect.any(AbortSignal)))
    await user.click(screen.getByRole('button', { name: 'Reading' }))
    await waitFor(() => expect(overviewApi.bands).toHaveBeenLastCalledWith(expect.any(String), expect.any(String), 'READING', 'MOCK', '', expect.any(AbortSignal)))
    expect(screen.getByRole('button', { name: 'Mới hơn' })).toBeDisabled()
  })

  it('renders unavailable measurements without invented improvement or scores', async () => {
    vi.mocked(overviewApi.bands).mockResolvedValue({ ...bands, points: [], baseline: null, latest: null, delta: null })
    vi.mocked(overviewApi.allProgress).mockResolvedValue({ ...progress, courses: [], skills: [], totalCourses: 0 })
    vi.mocked(notebookApi.getVocabularyMap).mockResolvedValue({ bands: [], currentBand: null, suggestedBand: null })
    mount()
    expect(await screen.findByText('Chưa có kết quả trong khoảng này')).toBeVisible()
    expect(screen.queryByText(/BAND$/)).not.toBeInTheDocument()
    expect(screen.getByText('Hành trình band của bạn')).toBeVisible()
    expect(screen.getByText('Chưa xác định')).toBeVisible()
    expect(within(screen.getByRole('region', { name: 'Tiến Độ 4 Kỹ Năng' })).getByRole('link', { name: /Khám phá khóa học/ })).toBeVisible()
  })

  it('selects a course beyond the original four options and restores aggregate progress with All', async () => {
    const user = userEvent.setup()
    vi.mocked(overviewApi.allProgress).mockResolvedValue({ ...progress, courses, totalCourses: courses.length })
    vi.mocked(overviewApi.progress).mockResolvedValue(selectedProgress(7, 8))
    mount()
    await within(skillCard()).findByRole('progressbar', { name: 'Listening: 3/10 bài' })
    const aggregateRadar = skillCard().querySelector('.statistics-radar-fill')?.getAttribute('points')

    await chooseCourse(user, 'IELTS Course 6')

    expect(overviewApi.progress).toHaveBeenCalledWith(0, 'course-6', expect.any(AbortSignal))
    for (const skill of ['Listening', 'Reading', 'Writing', 'Speaking']) {
      expect(await within(skillCard()).findByRole('progressbar', { name: `${skill}: 7/8 bài` })).toHaveAttribute('value', '87.5')
    }
    expect(within(skillCard()).getAllByText('87,5%')).toHaveLength(4)
    expect(skillCard().querySelector('.statistics-radar-fill')?.getAttribute('points')).not.toBe(aggregateRadar)
    expect(new URLSearchParams(screen.getByLabelText('Current location').textContent ?? '').get('courseId')).toBe('course-6')
    expect(overviewApi.bands).toHaveBeenCalledTimes(1)
    expect(notebookApi.getVocabularyMap).toHaveBeenCalledTimes(1)

    await chooseCourse(user, 'Tất cả khóa đã bắt đầu')

    expect(await within(skillCard()).findByRole('progressbar', { name: 'Listening: 3/10 bài' })).toHaveAttribute('value', '30')
    expect(within(skillCard()).getAllByText('30%')).toHaveLength(4)
    expect(skillCard().querySelector('.statistics-radar-fill')?.getAttribute('points')).toBe(aggregateRadar)
    expect(new URLSearchParams(screen.getByLabelText('Current location').textContent ?? '').has('courseId')).toBe(false)
    expect(overviewApi.allProgress).toHaveBeenCalledTimes(1)
    expect(overviewApi.progress).toHaveBeenCalledTimes(1)
  })

  it('loads a course from the URL and preserves the other query filters when changing courses', async () => {
    const user = userEvent.setup()
    vi.mocked(overviewApi.allProgress).mockResolvedValue({ ...progress, courses, totalCourses: courses.length })
    vi.mocked(overviewApi.progress).mockResolvedValue(selectedProgress(1, 4))
    mount('&courseId=course-6&period=6m&series=OFFICIAL_PRACTICE&skill=READING&source=saved')

    expect(await within(skillCard()).findByRole('progressbar', { name: 'Reading: 1/4 bài' })).toHaveAttribute('value', '25')
    expect(within(skillCard()).getByRole('combobox', { name: 'Khóa học' })).toHaveTextContent('IELTS Course 6')
    expect(overviewApi.progress).toHaveBeenCalledWith(0, 'course-6', expect.any(AbortSignal))
    expect(overviewApi.bands).toHaveBeenCalledWith(expect.any(String), expect.any(String), 'READING', 'OFFICIAL_PRACTICE', '', expect.any(AbortSignal))

    await chooseCourse(user, 'IELTS Course 2')

    const params = new URLSearchParams(screen.getByLabelText('Current location').textContent ?? '')
    expect(Object.fromEntries(params)).toEqual({ tab: 'detailed-stats', courseId: 'course-2', period: '6m', series: 'OFFICIAL_PRACTICE', skill: 'READING', source: 'saved' })
    expect(overviewApi.bands).toHaveBeenCalledTimes(1)
    expect(notebookApi.getVocabularyMap).toHaveBeenCalledTimes(1)
  })

  it.each(['success', 'failure'] as const)('ignores a stale selected-course %s after rapid course changes', async (outcome) => {
    const user = userEvent.setup()
    const first = deferred<ProgressStatistics>()
    const second = deferred<ProgressStatistics>()
    const latest = deferred<ProgressStatistics>()
    vi.mocked(overviewApi.allProgress).mockResolvedValue({ ...progress, courses, totalCourses: courses.length })
    vi.mocked(overviewApi.progress).mockReturnValueOnce(first.promise).mockReturnValueOnce(second.promise).mockReturnValueOnce(latest.promise)
    mount()
    await within(skillCard()).findByRole('progressbar', { name: 'Listening: 3/10 bài' })
    const previousRadar = skillCard().querySelector('.statistics-radar')
    await chooseCourse(user, 'IELTS Course 1')
    expect(skillCard()).toHaveAttribute('aria-busy', 'true')
    expect(skillCard().querySelector('.statistics-radar')).toBe(previousRadar)
    expect(skillCard().querySelector('.overview-chart-snapshot')).toHaveAttribute('inert')
    expect(within(skillCard()).getByText('Đang cập nhật biểu đồ…')).toBeInTheDocument()
    await chooseCourse(user, 'IELTS Course 2')
    await chooseCourse(user, 'IELTS Course 1')
    expect(overviewApi.progress).toHaveBeenCalledTimes(3)
    expect(vi.mocked(overviewApi.progress).mock.calls[0][2].aborted).toBe(true)
    expect(vi.mocked(overviewApi.progress).mock.calls[1][2].aborted).toBe(true)
    await act(async () => { latest.resolve(selectedProgress(9, 10)) })
    expect(await within(skillCard()).findByRole('progressbar', { name: 'Listening: 9/10 bài' })).toHaveAttribute('value', '90')
    expect(skillCard().querySelector('.statistics-radar')).not.toBe(previousRadar)

    await act(async () => {
      second.resolve(selectedProgress(1, 10))
      if (outcome === 'success') first.resolve(selectedProgress(2, 10))
      else first.reject(new Error('Stale request failed'))
    })

    expect(within(skillCard()).getByRole('progressbar', { name: 'Listening: 9/10 bài' })).toHaveAttribute('value', '90')
    expect(within(skillCard()).queryByRole('alert')).not.toBeInTheDocument()
    expect(skillCard()).toHaveAttribute('aria-busy', 'false')
  })

  it('retries a selected-course failure and lets the learner recover by selecting All', async () => {
    const user = userEvent.setup()
    vi.mocked(overviewApi.allProgress).mockResolvedValue({ ...progress, courses, totalCourses: courses.length })
    vi.mocked(overviewApi.progress).mockRejectedValueOnce(new Error('Course progress unavailable')).mockResolvedValueOnce(selectedProgress(1, 2)).mockRejectedValueOnce(new Error('Another course unavailable'))
    mount()
    await within(skillCard()).findByRole('progressbar', { name: 'Listening: 3/10 bài' })
    await chooseCourse(user, 'IELTS Course 6')
    expect(await within(skillCard()).findByRole('alert')).toHaveTextContent('Course progress unavailable')
    expect(within(skillCard()).queryByRole('progressbar')).not.toBeInTheDocument()
    expect(within(skillCard()).getByRole('combobox', { name: 'Khóa học' })).toBeEnabled()

    await user.click(within(skillCard()).getByRole('button', { name: 'Thử lại' }))
    expect(await within(skillCard()).findByRole('progressbar', { name: 'Listening: 1/2 bài' })).toHaveAttribute('value', '50')
    expect(overviewApi.progress).toHaveBeenLastCalledWith(0, 'course-6', expect.any(AbortSignal))
    await chooseCourse(user, 'IELTS Course 2')
    expect(await within(skillCard()).findByRole('alert')).toHaveTextContent('Another course unavailable')
    expect(within(skillCard()).queryByRole('progressbar')).not.toBeInTheDocument()
    await chooseCourse(user, 'Tất cả khóa đã bắt đầu')
    expect(await within(skillCard()).findByRole('progressbar', { name: 'Listening: 3/10 bài' })).toBeVisible()
    expect(within(skillCard()).queryByRole('alert')).not.toBeInTheDocument()
    expect(overviewApi.allProgress).toHaveBeenCalledTimes(1)
  })

  it('retries a failed course catalog from the aggregate view', async () => {
    const user = userEvent.setup()
    vi.mocked(overviewApi.allProgress).mockRejectedValueOnce(new Error('Catalog unavailable')).mockResolvedValueOnce({ ...progress, courses, totalCourses: courses.length })
    mount()
    expect(await within(skillCard()).findByRole('alert')).toHaveTextContent('Catalog unavailable')
    expect(within(skillCard()).queryByRole('progressbar')).not.toBeInTheDocument()
    await user.click(within(skillCard()).getByRole('button', { name: 'Thử lại' }))
    expect(await within(skillCard()).findByRole('progressbar', { name: 'Listening: 3/10 bài' })).toBeVisible()
    await chooseCourse(user, 'IELTS Course 6')
    expect(overviewApi.progress).toHaveBeenCalledWith(0, 'course-6', expect.any(AbortSignal))
    expect(overviewApi.allProgress).toHaveBeenCalledTimes(2)
  })

  it('retries the catalog independently while preserving a deep-linked course and its progress', async () => {
    const user = userEvent.setup()
    vi.mocked(overviewApi.allProgress).mockRejectedValueOnce(new Error('Catalog unavailable')).mockResolvedValueOnce({ ...progress, courses, totalCourses: courses.length })
    vi.mocked(overviewApi.progress).mockResolvedValue(selectedProgress(3, 4))
    mount('&courseId=course-6')
    expect(await within(skillCard()).findByRole('alert')).toHaveTextContent('Không tải được danh sách khóa học: Catalog unavailable')
    expect(await within(skillCard()).findByRole('progressbar', { name: 'Listening: 3/4 bài' })).toHaveAttribute('value', '75')
    expect(within(skillCard()).getByRole('combobox', { name: 'Khóa học' })).toHaveTextContent('Khóa học đã chọn')

    await user.click(within(skillCard()).getByRole('button', { name: 'Tải lại danh sách' }))

    await waitFor(() => expect(within(skillCard()).getByRole('combobox', { name: 'Khóa học' })).toHaveTextContent('IELTS Course 6'))
    expect(within(skillCard()).queryByRole('alert')).not.toBeInTheDocument()
    expect(within(skillCard()).getByRole('progressbar', { name: 'Listening: 3/4 bài' })).toBeVisible()
    expect(overviewApi.progress).toHaveBeenCalledTimes(1)
    expect(overviewApi.allProgress).toHaveBeenCalledTimes(2)
  })

  it('keeps an empty course catalog usable without inventing course progress', async () => {
    const user = userEvent.setup()
    vi.mocked(overviewApi.allProgress).mockResolvedValue({ ...progress, courses: [], skills: [], totalCourses: 0 })
    mount()
    expect(await within(skillCard()).findByRole('link', { name: /Khám phá khóa học/ })).toHaveAttribute('href', '/learn')
    expect(within(skillCard()).queryByRole('progressbar')).not.toBeInTheDocument()
    expect(within(skillCard()).getAllByText('Chưa có nội dung')).toHaveLength(4)
    within(skillCard()).getByRole('combobox', { name: 'Khóa học' }).focus()
    await user.keyboard('{Enter}')
    expect(screen.getAllByRole('option')).toHaveLength(1)
    expect(screen.getByRole('option', { name: 'Tất cả khóa đã bắt đầu' })).toBeVisible()
    await user.keyboard('{Escape}')
    expect(overviewApi.progress).not.toHaveBeenCalled()
  })
})
