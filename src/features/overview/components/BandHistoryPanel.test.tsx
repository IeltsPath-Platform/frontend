import { act, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, useLocation } from 'react-router-dom'
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { overviewApi, type BandAvailability, type BandStatistics } from '../api/overviewApi'
import { bandRange } from '../bandHistoryModel'
import { BandHistoryPanel } from './BandHistoryPanel'

const session = vi.hoisted(() => ({ isLoggedIn: true, email: 'learner@example.test' }))
vi.mock('@/features/auth/authSession', () => ({ useAuthSession: () => session }))
vi.mock('../api/overviewApi', () => ({ overviewApi: { bands: vi.fn(), bandAvailability: vi.fn(), placementBand: vi.fn() } }))
const availability: BandAvailability = { options: [
  { seriesKind: 'MOCK', skill: 'OVERALL', latestSubmittedAt: '2026-11-09T10:00:00Z' },
  { seriesKind: 'OFFICIAL_PRACTICE', skill: 'READING', latestSubmittedAt: '2026-11-08T10:00:00Z' },
  { seriesKind: 'MOCK', skill: 'LISTENING', latestSubmittedAt: '2026-10-01T10:00:00Z' },
] }
const history: BandStatistics = { availability: 'AVAILABLE', generatedAt: '', dataFrom: null, seriesKind: 'OFFICIAL_PRACTICE', skill: 'READING', eligibilityReason: null, points: [
  { attemptId: 'first', submittedAt: '2026-10-02T10:00:00Z', band: 5, resultVersion: 1, pendingRegrade: false, gradingSource: 'TEACHER', measurementQuality: 'MEASURED', scoringVersion: '1' },
  { attemptId: 'last', submittedAt: '2026-11-02T10:00:00Z', band: 5.5, resultVersion: 1, pendingRegrade: false, gradingSource: 'TEACHER', measurementQuality: 'MEASURED', scoringVersion: '1' },
], baseline: 5, latest: 5.5, delta: .5, nextCursor: null }
function LocationProbe() { return <output aria-label="Current location">{useLocation().search}</output> }
function mount(query = '') { return render(<MemoryRouter initialEntries={[`/overview?tab=detailed-stats${query}`]}><BandHistoryPanel /><LocationProbe /></MemoryRouter>) }
const params = () => new URLSearchParams(screen.getByLabelText('Current location').textContent ?? '')
function deferred<T>() {
  let resolve!: (value: T) => void
  let reject!: (reason: Error) => void
  const promise = new Promise<T>((res, rej) => { resolve = res; reject = rej })
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
  session.email = 'learner@example.test'
  session.isLoggedIn = true
  vi.mocked(overviewApi.bandAvailability).mockResolvedValue(availability)
  vi.mocked(overviewApi.bands).mockResolvedValue(history)
  vi.mocked(overviewApi.placementBand).mockResolvedValue(null)
})

describe('BandHistoryPanel', () => {
  it('defaults to three months and the newest individual source and skill', async () => {
    mount()
    await screen.findByText('+0.5 BAND')
    const { from, to } = bandRange('3m')
    expect(overviewApi.bandAvailability).toHaveBeenCalledWith(from, to, expect.any(AbortSignal))
    expect(overviewApi.bands).toHaveBeenCalledWith(from, to, 'READING', 'OFFICIAL_PRACTICE', '', expect.any(AbortSignal))
    expect(screen.getByRole('button', { name: '3 tháng' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('button', { name: 'Reading' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('button', { name: 'Overall' })).toBeDisabled()
  })
  it('preserves explicit URL filters and chosen skills when the range changes', async () => {
    const user = userEvent.setup()
    mount('&period=6m&series=MOCK&skill=LISTENING&courseId=course-6')
    await screen.findByText('+0.5 BAND')
    await user.click(screen.getByRole('button', { name: 'Writing' }))
    await waitFor(() => expect(overviewApi.bands).toHaveBeenLastCalledWith(expect.any(String), expect.any(String), 'WRITING', 'MOCK', '', expect.any(AbortSignal)))
    vi.mocked(overviewApi.bandAvailability).mockResolvedValue({ options: [] })
    await user.click(screen.getByRole('button', { name: '1 năm' }))
    const { from, to } = bandRange('1y')
    await waitFor(() => expect(overviewApi.bands).toHaveBeenLastCalledWith(from, to, 'WRITING', 'MOCK', '', expect.any(AbortSignal)))
    expect(Object.fromEntries(params())).toEqual({ tab: 'detailed-stats', period: '1y', series: 'MOCK', skill: 'WRITING', courseId: 'course-6' })
  })
  it('honors available Overall and falls back when that source has no Overall', async () => {
    mount('&series=MOCK&skill=OVERALL')
    await screen.findByText('+0.5 BAND')
    expect(screen.getByRole('button', { name: 'Overall' })).toBeEnabled()
    expect(overviewApi.bands).toHaveBeenCalledWith(expect.any(String), expect.any(String), 'OVERALL', 'MOCK', '', expect.any(AbortSignal))
  })
  it('falls back from unavailable Overall to an available individual skill', async () => {
    mount('&series=OFFICIAL_PRACTICE&skill=OVERALL')
    await screen.findByText('+0.5 BAND')
    expect(overviewApi.bands).toHaveBeenCalledWith(expect.any(String), expect.any(String), 'READING', 'OFFICIAL_PRACTICE', '', expect.any(AbortSignal))
    expect(screen.getByRole('button', { name: 'Overall' })).toBeDisabled()
  })
  it('changes the source through the keyboard and offers no placement series', async () => {
    const user = userEvent.setup()
    mount()
    await screen.findByText('+0.5 BAND')
    screen.getByRole('combobox', { name: 'Loại bài thi' }).focus()
    await user.keyboard('{Enter}')
    expect(screen.queryByRole('option', { name: 'Đầu vào' })).not.toBeInTheDocument()
    screen.getByRole('option', { name: 'Thi thử' }).focus()
    await user.keyboard('{Enter}')
    await waitFor(() => expect(params().get('series')).toBe('MOCK'))
  })
  it('turns an old placement link into the practice series', async () => {
    mount('&series=PLACEMENT&skill=READING')
    await screen.findByText('+0.5 BAND')
    expect(overviewApi.bands).not.toHaveBeenCalledWith(expect.any(String), expect.any(String), expect.anything(), 'PLACEMENT', expect.anything(), expect.anything())
  })
  it('draws the placement band as a starting reference line for a skill the placement test grades', async () => {
    vi.mocked(overviewApi.placementBand).mockResolvedValue(4)
    const { container } = mount()
    expect(await screen.findByText('Đầu vào 4.0')).toBeInTheDocument()
    expect(container.querySelector('.band-ref-line.is-placement')).toBeInTheDocument()
    expect(screen.getByText('Bài đầu vào')).toBeInTheDocument()
  })
  it('has no placement reference for Speaking, which the placement test does not grade', async () => {
    const { container } = mount('&series=OFFICIAL_PRACTICE&skill=SPEAKING')
    await screen.findByText('+0.5 BAND')
    expect(container.querySelector('.band-ref-line.is-placement')).not.toBeInTheDocument()
    expect(overviewApi.placementBand).not.toHaveBeenCalled()
  })
  it('offers skill practice for an empty history without inventing improvement', async () => {
    vi.mocked(overviewApi.bandAvailability).mockResolvedValue({ options: [] })
    vi.mocked(overviewApi.bands).mockResolvedValue({ ...history, points: [], baseline: null, latest: null, delta: null })
    mount('&series=OFFICIAL_PRACTICE&skill=WRITING')
    expect(await screen.findByRole('link', { name: 'Làm bài luyện Writing' })).toHaveAttribute('href', '/practice-tests?skill=writing')
    expect(screen.queryByText('+0.5 BAND')).not.toBeInTheDocument()
  })
  it('shows one measurement without a connecting line or improvement', async () => {
    vi.mocked(overviewApi.bands).mockResolvedValue({ ...history, points: [history.points[1]], baseline: 5.5, latest: 5.5, delta: null })
    const { container } = mount()
    await screen.findByRole('img', { name: /Lịch sử band/ })
    expect(container.querySelectorAll('circle')).toHaveLength(1)
    expect(container.querySelector('.statistics-actual-line')).not.toBeInTheDocument()
    expect(screen.queryByText(/BAND$/)).not.toBeInTheDocument()
  })
  it('shows improvement and a connected history for multiple measurements', async () => {
    const { container } = mount()
    expect(await screen.findByText('+0.5 BAND')).toBeVisible()
    expect(container.querySelectorAll('circle')).toHaveLength(2)
    expect(container.querySelector('.statistics-actual-line')).toBeInTheDocument()
  })
  it('keeps the chart mounted during a skill request and redraws it when the new history arrives', async () => {
    const user = userEvent.setup()
    const next = deferred<BandStatistics>()
    vi.mocked(overviewApi.bands).mockImplementation((_from, _to, skill, series) => series === 'PLACEMENT'
      ? Promise.resolve({ ...history, latest: null }) : skill === 'WRITING' ? next.promise : Promise.resolve(history))
    const { container } = mount()
    const chart = await screen.findByRole('img', { name: /Lịch sử band/ })
    await user.click(screen.getByRole('button', { name: 'Writing' }))
    expect(screen.getByRole('img', { name: /Lịch sử band/ })).toBe(chart)
    expect(screen.getByRole('region', { name: 'Hành trình band của bạn' })).toHaveAttribute('aria-busy', 'true')
    expect(screen.getByText('Đang cập nhật biểu đồ…')).toHaveAttribute('role', 'status')
    expect(screen.getByText('Điểm Reading từ các lần thi đã được chấm.')).toBeInTheDocument()
    expect(container.querySelector('.band-chart')).toHaveClass('is-reading')
    expect(params().get('skill')).toBe('WRITING')
    await act(async () => next.resolve({ ...history, skill: 'WRITING', latest: 7, points: history.points.map((point) => ({ ...point, band: point.band + 1.5 })) }))
    await waitFor(() => expect(container.querySelector('.band-chart')).toHaveClass('is-writing'))
    expect(screen.getByRole('img', { name: /Lịch sử band/ })).not.toBe(chart)
    expect(container.querySelector('.statistics-actual-line')).toHaveAttribute('pathLength', '1')
    expect(screen.queryByText('Đang cập nhật biểu đồ…')).not.toBeInTheDocument()
    expect(screen.getByText('Điểm Writing từ các lần thi đã được chấm.')).toBeInTheDocument()
  })
  it('clears the retained chart if the account changes while a skill request is pending', async () => {
    const user = userEvent.setup()
    const next = deferred<BandStatistics>()
    const otherAvailability = deferred<BandAvailability>()
    vi.mocked(overviewApi.bands).mockImplementation((_from, _to, skill, series) => series === 'PLACEMENT'
      ? Promise.resolve({ ...history, latest: null }) : skill === 'WRITING' ? next.promise : Promise.resolve(history))
    const { rerender } = mount()
    await screen.findByRole('img', { name: /Lịch sử band/ })
    await user.click(screen.getByRole('button', { name: 'Writing' }))
    vi.mocked(overviewApi.bandAvailability).mockReturnValue(otherAvailability.promise)
    session.email = 'other@example.test'
    rerender(<MemoryRouter><BandHistoryPanel /><LocationProbe /></MemoryRouter>)
    expect(screen.queryByRole('img', { name: /Lịch sử band/ })).not.toBeInTheDocument()
    expect(screen.queryByText('+0.5 BAND')).not.toBeInTheDocument()
    await act(async () => next.resolve(history))
    expect(screen.queryByRole('img', { name: /Lịch sử band/ })).not.toBeInTheDocument()
  })
  it.each(['success', 'failure'] as const)('ignores stale availability %s after a range change', async (outcome) => {
    const user = userEvent.setup()
    const stale = deferred<BandAvailability>()
    vi.mocked(overviewApi.bandAvailability).mockReturnValueOnce(stale.promise).mockResolvedValue(availability)
    mount('&series=OFFICIAL_PRACTICE&skill=READING')
    await waitFor(() => expect(overviewApi.bandAvailability).toHaveBeenCalledTimes(1))
    await user.click(screen.getByRole('button', { name: '8 tuần' }))
    await screen.findByText('+0.5 BAND')
    expect(vi.mocked(overviewApi.bandAvailability).mock.calls[0][2].aborted).toBe(true)
    await act(async () => { if (outcome === 'success') stale.resolve({ options: [] }); else stale.reject(new Error('stale availability')) })
    expect(screen.getByRole('button', { name: 'Reading' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })
  it.each(['success', 'failure'] as const)('ignores stale history %s after a skill change', async (outcome) => {
    const user = userEvent.setup()
    const stale = deferred<BandStatistics>()
    mount()
    await screen.findByText('+0.5 BAND')
    vi.mocked(overviewApi.bands).mockReturnValueOnce(stale.promise)
    await user.click(screen.getByRole('button', { name: 'Writing' }))
    const writingRequest = vi.mocked(overviewApi.bands).mock.calls.find((call) => call[2] === 'WRITING')!
    await user.click(screen.getByRole('button', { name: 'Listening' }))
    await screen.findByText('Điểm Listening từ các lần thi đã được chấm.')
    expect(writingRequest[5].aborted).toBe(true)
    await act(async () => { if (outcome === 'success') stale.resolve({ ...history, points: [], delta: null }); else stale.reject(new Error('stale history')) })
    expect(screen.getByText('+0.5 BAND')).toBeVisible()
    expect(screen.getByText('Điểm Listening từ các lần thi đã được chấm.')).toBeInTheDocument()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })
  it.each(['bandAvailability', 'bands'] as const)('retries a failed %s request', async (method) => {
    const user = userEvent.setup()
    vi.mocked(overviewApi[method]).mockRejectedValueOnce(new Error('History unavailable'))
    mount()
    expect(await screen.findByRole('alert')).toHaveTextContent('History unavailable')
    await user.click(screen.getByRole('button', { name: 'Thử lại' }))
    expect(await screen.findByText('+0.5 BAND')).toBeVisible()
    expect(overviewApi[method]).toHaveBeenCalledTimes(2)
  })
})
