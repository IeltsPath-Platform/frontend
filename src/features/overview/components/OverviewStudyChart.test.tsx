import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { overviewApi, type StudyDay, type StudyTimeStatistics } from '../api/overviewApi'
import { daysAgo, isoDate } from '../overviewViewModel'
import { OverviewStudyChart } from './OverviewStudyChart'

vi.mock('@/features/auth/authSession', () => ({ useAuthSession: () => ({ isLoggedIn: true, email: 'learner@example.test' }) }))
vi.mock('../api/overviewApi', () => ({ overviewApi: { time: vi.fn() } }))

const today = new Date(2026, 10, 8)
const day = (ago: number, seconds: number): StudyDay => ({ date: isoDate(daysAgo(today, ago)), timezone: 'Asia/Ho_Chi_Minh', actualSeconds: seconds, plannedSeconds: null, status: 'COMPLETE' })
const originalScroll = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'scrollIntoView')
beforeAll(() => Object.defineProperty(HTMLElement.prototype, 'scrollIntoView', { configurable: true, value: vi.fn() }))
afterAll(() => {
  if (originalScroll) Object.defineProperty(HTMLElement.prototype, 'scrollIntoView', originalScroll)
  else Reflect.deleteProperty(HTMLElement.prototype, 'scrollIntoView')
})
beforeEach(() => vi.resetAllMocks())

describe('overview study time chart', () => {
  it('uses recorded days for the chart and compares complete seven-day periods', () => {
    const days = Array.from({ length: 14 }, (_, ago) => day(ago, ago < 7 ? 7200 : 3600))
    render(<OverviewStudyChart totalSeconds={170400} days={days} today={today} />)
    expect(screen.getByText('47h 20m')).toBeVisible()
    expect(screen.getByText(/\+7h 00m so với 7 ngày trước/)).toBeVisible()
    expect(screen.getByRole('img', { name: 'Thời gian học từng ngày trong 7 ngày qua' })).toBeVisible()
    expect(screen.getAllByText('8/11/2026: 2h 00m')).toHaveLength(2)
  })

  it('does not treat an untracked day as zero or invent a comparison', () => {
    render(<OverviewStudyChart totalSeconds={null} days={[day(0, 3600)]} today={today} />)
    expect(screen.queryByText(/so với 7 ngày trước/)).not.toBeInTheDocument()
    expect(screen.getAllByText(/Chưa có dữ liệu/)).toHaveLength(6)
    expect(screen.getAllByText('8/11/2026: 1h 00m')).toHaveLength(2)
  })

  it('switches between seven and thirty days', () => {
    render(<OverviewStudyChart totalSeconds={3600} days={[day(0, 3600)]} today={today} />)
    const previousGraph = screen.getByRole('img', { name: 'Thời gian học từng ngày trong 7 ngày qua' })
    expect(screen.getByRole('button', { name: '7 ngày' })).toHaveAttribute('aria-pressed', 'true')
    fireEvent.click(screen.getByRole('button', { name: '30 ngày' }))
    expect(screen.getByRole('img', { name: 'Thời gian học từng ngày trong 30 ngày qua' })).toBeVisible()
    expect(screen.getByRole('img', { name: 'Thời gian học từng ngày trong 30 ngày qua' })).not.toBe(previousGraph)
    expect(screen.getByRole('button', { name: '30 ngày' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getAllByRole('listitem')).toHaveLength(30)
  })

  it('raises the scale to an hour when one day reaches an hour', () => {
    render(<OverviewStudyChart totalSeconds={3600} days={[day(0, 3600)]} today={today} />)
    expect(screen.getByText('1h')).toBeVisible()
    expect(screen.getByText('30 phút')).toBeVisible()
  })

  it('offers a fourteen-day view that keeps weekday and value labels', () => {
    render(<OverviewStudyChart totalSeconds={null} days={[day(0, 3600)]} today={today} />)
    fireEvent.click(screen.getByRole('button', { name: '14 ngày' }))
    expect(screen.getByRole('img', { name: 'Thời gian học từng ngày trong 14 ngày qua' })).toBeVisible()
    expect(screen.getAllByRole('listitem')).toHaveLength(14)
    expect(screen.getByText('1h 00m')).toBeVisible()
  })

  it('joins tracked days with a trend line and breaks it at an untracked day', () => {
    const days = [day(0, 3600), day(1, 1800), day(3, 900)]
    const { container } = render(<OverviewStudyChart totalSeconds={null} days={days} today={today} />)
    const polylines = container.querySelectorAll('.overview-study-trend polyline')
    expect(polylines).toHaveLength(1)
    expect(container.querySelectorAll('.overview-study-trend circle')).toHaveLength(3)
  })

  it('explains the daily goal marks when a planned amount is recorded', () => {
    const planned: StudyDay = { ...day(0, 2700), plannedSeconds: 1800 }
    const missed: StudyDay = { ...day(1, 600), plannedSeconds: 1800 }
    render(<OverviewStudyChart totalSeconds={3300} days={[planned, missed]} today={today} />)
    expect(screen.getByText(/Vạch là mục tiêu của ngày/)).toBeVisible()
  })

  it('compares average days when the two weeks are only partly recorded', () => {
    render(<OverviewStudyChart totalSeconds={10800} days={[day(0, 3600), day(8, 7200)]} today={today} />)
    expect(screen.getByText(/trung bình mỗi ngày học so với 7 ngày trước/)).toBeVisible()
    expect(screen.getByText('Tuần này có 1/7 ngày học được ghi nhận, tuần trước 1/7.')).toBeVisible()
  })

  it('keeps the graph during a course request and replays it once the new data arrives', async () => {
    const user = userEvent.setup()
    let resolve!: (value: StudyTimeStatistics) => void
    vi.mocked(overviewApi.time).mockReturnValue(new Promise((res) => { resolve = res }))
    const { container } = render(<OverviewStudyChart totalSeconds={3600} days={[day(0, 3600)]} today={today} courses={[{ id: 'course-1', name: 'IELTS Foundation' }]} />)
    const graph = screen.getByRole('img', { name: /Thời gian học từng ngày/ })
    screen.getByRole('combobox', { name: 'Lọc theo khóa học' }).focus()
    await user.keyboard('{Enter}{End}{Enter}')
    expect(screen.getByRole('img', { name: /Thời gian học từng ngày/ })).toBe(graph)
    expect(container.querySelector('.overview-chart-snapshot')).toHaveAttribute('inert')
    expect(screen.getByText('Đang cập nhật biểu đồ…')).toBeInTheDocument()
    expect(container.querySelector('.overview-study-chart-total strong')).toHaveTextContent('1h 00m')
    await act(async () => resolve({ availability: 'AVAILABLE', generatedAt: '', dataFrom: null, timezonePolicy: 'LOCAL', scope: 'COURSE', days: [day(0, 7200)] }))
    await waitFor(() => expect(screen.getByRole('img', { name: /Thời gian học từng ngày/ })).not.toBe(graph))
    expect(container.querySelector('.overview-study-chart-total strong')).toHaveTextContent('2h 00m')
    expect(screen.queryByText('Đang cập nhật biểu đồ…')).not.toBeInTheDocument()
  })
})
