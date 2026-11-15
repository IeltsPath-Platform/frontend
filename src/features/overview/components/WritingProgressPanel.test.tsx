import { fireEvent, render, screen, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { overviewApi, type WritingProgress, type WritingProgressPoint, type WritingProgressTask } from '../api/overviewApi'
import { WritingProgressPanel } from './WritingProgressPanel'

const session = vi.hoisted(() => ({ isLoggedIn: true, email: 'learner@example.test' }))
vi.mock('@/features/auth/authSession', () => ({ useAuthSession: () => session }))
vi.mock('../api/overviewApi', () => ({ overviewApi: { writingProgress: vi.fn() } }))
const { startStudyPointPractice } = vi.hoisted(() => ({ startStudyPointPractice: vi.fn() }))
vi.mock('@/features/learning-path/lib/studyPointPractice', () => ({ startStudyPointPractice }))

const point = (n: number, band: number, extra: Partial<WritingProgressPoint> = {}): WritingProgressPoint => ({
  submissionId: `s-${n}`, source: 'LESSON', gradedAt: `2026-11-0${n}T10:00:00Z`, overallBand: band,
  criteria: { TR: band, CC: band + 0.5, LR: band, GRA: band - 0.5 }, ...extra,
})
const task = (code: 'TASK_1' | 'TASK_2', points: WritingProgressPoint[], extra: Partial<WritingProgressTask> = {}): WritingProgressTask => ({
  task: code, insufficient: points.length < 3, points, recurringErrors: [], fixedErrors: [], ...extra,
})
const empty = (code: 'TASK_1' | 'TASK_2') => task(code, [])

function mount(progress: WritingProgress) {
  vi.mocked(overviewApi.writingProgress).mockResolvedValue(progress)
  return render(<MemoryRouter><WritingProgressPanel /></MemoryRouter>)
}

beforeEach(() => {
  vi.resetAllMocks()
  startStudyPointPractice.mockReset()
  session.email = 'learner@example.test'
  session.isLoggedIn = true
})

describe('WritingProgressPanel', () => {
  it('sends a learner with no graded essay to Writing practice instead of drawing an empty chart', async () => {
    mount({ tasks: [empty('TASK_1'), empty('TASK_2')] })

    expect(await screen.findByText('Bạn chưa có bài Writing nào được chấm.')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Luyện Writing' })).toHaveAttribute('href', '/practice-tests?skill=writing')
    expect(document.querySelector('svg')).toBeNull()
  })

  it('shows the scores as a table and asks for more essays when a task has fewer than three', async () => {
    mount({ tasks: [task('TASK_1', [point(1, 5), point(2, 5.5)], { insufficient: true }), empty('TASK_2')] })

    expect(await screen.findByText('Mới có 2 bài Task 1. Cần ít nhất 3 bài để thấy xu hướng band.')).toHaveAttribute('role', 'status')
    expect(document.querySelector('svg')).toBeNull()
    expect(screen.getAllByRole('row')).toHaveLength(3)
  })

  it('draws the trend for three essays, with a legend, a readout of the newest essay and the table view', async () => {
    mount({ tasks: [empty('TASK_1'), task('TASK_2', [point(1, 5), point(2, 5.5), point(3, 6)])] })

    const chart = await screen.findByRole('img', { name: 'Band tổng qua 3 bài Task 2, từ 5.0 đến 6.0' })
    expect(chart).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Task 2 (3)' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByLabelText('Chú giải')).toHaveTextContent('TR · Task Response')
    expect(screen.getByText(/Bài 3\/3/).closest('p')).toHaveTextContent('Tổng 6.0')
    expect(screen.getAllByRole('row')).toHaveLength(4)
  })

  it('reads another essay into the readout when the learner points at it or focuses it', async () => {
    mount({ tasks: [empty('TASK_1'), task('TASK_2', [point(1, 5), point(2, 5.5), point(3, 6)])] })
    await screen.findByRole('img')

    fireEvent.focus(screen.getByLabelText(/^Bài 1, /))

    expect(screen.getByText(/Bài 1\/3/).closest('p')).toHaveTextContent('Tổng 5.0')
  })

  it('marks where the way of grading changed', async () => {
    mount({ tasks: [empty('TASK_1'), task('TASK_2', [point(1, 5, { promptVersion: 'v1' }), point(2, 5.5, { promptVersion: 'v1' }), point(3, 6, { promptVersion: 'v2' })])] })

    expect(await screen.findByText('Đổi cách chấm')).toBeInTheDocument()
  })

  it('switches between the two tasks', async () => {
    mount({ tasks: [task('TASK_1', [point(1, 4), point(2, 4.5), point(3, 5)]), task('TASK_2', [point(1, 6), point(2, 6.5), point(3, 7), point(4, 7)])] })
    await screen.findByRole('img', { name: /Task 2/ })

    fireEvent.click(screen.getByRole('button', { name: 'Task 1 (3)' }))

    expect(screen.getByRole('img', { name: 'Band tổng qua 3 bài Task 1, từ 4.0 đến 5.0' })).toBeInTheDocument()
    expect(screen.getByLabelText('Chú giải')).toHaveTextContent('TA · Task Achievement')
  })

  it('lists at most five recurring errors with how many essays, the rule, and a practice button only where there is a set', async () => {
    const recurringErrors = ['A', 'B', 'C', 'D', 'E', 'F'].map((code, index) => ({
      errorCode: code, errorName: `Lỗi ${code}`, fixHint: `Quy tắc ${code}`, essaysWithError: 3, essaysTotal: 5, lastSeenAt: '2026-11-03T10:00:00Z',
      practiceKnowledgePointId: index === 0 ? 'kp-1' : undefined,
    }))
    mount({ tasks: [empty('TASK_1'), task('TASK_2', [point(1, 5), point(2, 5.5), point(3, 6)], { recurringErrors })] })

    const section = await screen.findByRole('region', { name: 'Lỗi hay gặp' })
    expect(within(section).getAllByRole('listitem')).toHaveLength(5)
    expect(within(section).getAllByText('3/5 bài')).toHaveLength(5)
    expect(within(section).getByText('Quy tắc A')).toBeInTheDocument()
    expect(within(section).getAllByRole('button', { name: 'Luyện lỗi này' })).toHaveLength(1)

    fireEvent.click(within(section).getByRole('button', { name: 'Luyện lỗi này' }))
    await vi.waitFor(() => expect(startStudyPointPractice).toHaveBeenCalledTimes(1))
    expect(startStudyPointPractice.mock.calls[0][0]).toMatchObject({ practiceKnowledgePointId: 'kp-1', code: 'A' })
  })

  it('lists the errors that no longer come back', async () => {
    mount({ tasks: [empty('TASK_1'), task('TASK_2', [point(1, 5), point(2, 5.5), point(3, 6)], {
      fixedErrors: [{ errorCode: 'ARTICLE', errorName: 'Mạo từ', lastSeenAt: '2026-10-01T10:00:00Z', cleanEssaysSince: 3 }],
    })] })

    const section = await screen.findByRole('region', { name: 'Lỗi đã khắc phục' })
    expect(section).toHaveTextContent('Mạo từ')
    expect(section).toHaveTextContent('Không lặp lại ở 3 bài gần nhất.')
  })

  it('says so and offers a retry when the progress cannot be read', async () => {
    vi.mocked(overviewApi.writingProgress).mockRejectedValue(new Error('Không tải được dữ liệu.'))
    render(<MemoryRouter><WritingProgressPanel /></MemoryRouter>)

    expect(await screen.findByRole('alert')).toHaveTextContent('Không tải được dữ liệu.')
    expect(screen.getByRole('button', { name: 'Thử lại' })).toBeInTheDocument()
  })
})
