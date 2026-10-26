import { fireEvent, render, screen, within } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { clearAccessToken, setAccessToken } from '@/lib/httpClient'
import { ExaminerDashboardPage } from './ExaminerDashboardPage'
import { ExaminerProfilePage } from './ExaminerProfilePage'

const EXAMINER = '20000000-0000-4000-8000-0000000000e1'
vi.mock('@/features/auth/authSession', () => ({ useAuthSession: () => ({ userId: '20000000-0000-4000-8000-0000000000e1', userName: 'Lê Hiếu' }) }))

const summary = (overrides = {}) => ({ queued: 6, processing: 2, dueSoon: 3, overdue: 1, completedToday: 3, completedThisWeek: 11, receivedToday: 7, dailyLimit: 10, ...overrides })
const profile = (overrides = {}) => ({
  id: EXAMINER, displayName: 'Lê Hiếu', avatarUrl: null, bio: null, ieltsBand: 8,
  certificates: [{ name: 'IELTS Academic', issuer: 'British Council', year: 2023, score: '8.0' }], acceptingSubmissions: true, ...overrides,
})
const job = (index: number, overrides = {}) => ({
  id: `10000000-0000-4000-8000-00000000${String(1000 + index)}`, attemptId: null, attemptType: null, source: 'PRACTICE', skill: 'WRITING',
  task: 'TASK_2', status: 'QUEUED', claimedAt: null, createdAt: '2026-10-21T01:00:00Z', waitSeconds: 7200 + index, overdue: false, hasDraft: false, ...overrides,
})

type Call = { path: string; method: string; body: unknown }
const calls: Call[] = []
const fetchMock = vi.fn<typeof fetch>()
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })

const graded = (index: number, overrides = {}) => ({
  jobId: `60000000-0000-4000-8000-00000000${String(1000 + index)}`, source: 'PRACTICE', skill: 'WRITING', task: 'TASK_2', band: 6.5,
  completedAt: '2026-10-26T03:30:00Z', ...overrides,
})

function server({ summaryBody = summary(), profileBody = profile(), queued = [job(1)], processing = [], finished = [] }: {
  summaryBody?: unknown; profileBody?: unknown; queued?: unknown[]; processing?: unknown[]; finished?: unknown[]
} = {}) {
  fetchMock.mockImplementation(async (input, options = {}) => {
    const url = new URL(String(input))
    const call = { path: url.pathname, method: options.method ?? 'GET', body: typeof options.body === 'string' ? JSON.parse(options.body) : options.body }
    calls.push(call)
    if (url.pathname === '/api/assessments/examiners/me/summary') return json(summaryBody)
    if (url.pathname === '/api/assessments/examiners/me/completed') return json({ content: finished, page: 0, size: 5, totalElements: finished.length })
    if (url.pathname === '/api/users/me/examiner-profile') return json({ ...(profileBody as object), ...(call.body as object) })
    if (url.pathname.startsWith('/api/users/examiners/')) return json(profileBody)
    const list = url.searchParams.get('status') === 'PROCESSING' ? processing : queued
    return json({ content: list, page: 0, size: 100, totalElements: list.length })
  })
}

function show(path: string) {
  return render(<MemoryRouter initialEntries={[path]}><Routes>
    <Route path="/admin/examiner" element={<ExaminerDashboardPage />} />
    <Route path="/admin/examiner/profile" element={<ExaminerProfilePage />} />
  </Routes></MemoryRouter>)
}

beforeEach(() => { calls.length = 0; fetchMock.mockReset(); vi.stubGlobal('fetch', fetchMock); setAccessToken('test-access-token') })
afterEach(() => { clearAccessToken(); vi.unstubAllGlobals(); vi.restoreAllMocks() })

describe('ExaminerDashboardPage', () => {
  it('shows what waits, how much was taken today against the limit, and what was finished', async () => {
    server()
    show('/admin/examiner')

    const stats = await screen.findByRole('list', { name: 'Số bài theo trạng thái' })
    expect(within(stats).getByText('Chờ chấm').closest('a')).toHaveTextContent('6')
    expect(within(stats).getByText('Đang chấm').closest('a')).toHaveTextContent('2')
    expect(within(stats).getByText('Sắp quá hạn (36h)').closest('a')).toHaveTextContent('3')
    expect(within(stats).getByText('Quá hạn 48h').closest('a')).toHaveTextContent('1')
    expect(screen.getByText('Đã nhận 7/10 bài hôm nay')).toBeInTheDocument()
    expect(screen.getByRole('progressbar', { name: 'Số bài đã nhận hôm nay' })).toHaveAttribute('aria-valuenow', '70')
    expect(screen.getByText('Đã chấm hôm nay').nextSibling).toHaveTextContent('3')
    expect(screen.getByText('Đã chấm tuần này').nextSibling).toHaveTextContent('11')
    expect(screen.getByRole('heading', { name: 'Xin chào Lê Hiếu' })).toBeInTheDocument()
  })

  it('says so when the daily limit is reached, and shows only the count when the limit is unknown', async () => {
    server({ summaryBody: summary({ receivedToday: 10 }) })
    const { unmount } = show('/admin/examiner')
    expect(await screen.findByText(/Bạn đã nhận đủ số bài hôm nay/)).toBeInTheDocument()
    unmount()

    server({ summaryBody: summary({ dailyLimit: null }) })
    show('/admin/examiner')
    expect(await screen.findByText('Đã nhận 7 bài hôm nay')).toBeInTheDocument()
    expect(screen.queryByRole('progressbar')).not.toBeInTheDocument()
  })

  it('lists the five jobs closest to their deadline, each with a visible button to grade it, and counts the rest', async () => {
    server({ queued: Array.from({ length: 6 }, (_, index) => job(index)) })
    show('/admin/examiner')

    const todo = await screen.findByRole('region', { name: 'Việc cần làm' })
    const rows = (await within(todo).findAllByRole('row')).slice(1)
    expect(rows).toHaveLength(5)
    // The longest wait is due first: job 5, then 4 … 1. Job 0 waited least and is left out.
    expect(within(rows[0]).getByRole('link', { name: 'Chấm bài' })).toHaveAttribute('href', `/admin/grading/writing/${job(5).id}`)
    expect(within(todo).getAllByRole('link', { name: 'Chấm bài' })).toHaveLength(5)
    expect(todo.querySelector(`a[href$="${job(0).id}"]`)).toBeNull()
    expect(within(todo).getByText('Còn 1 bài nữa trong hàng đợi.')).toBeInTheDocument()
    expect(within(todo).getByRole('link', { name: /Xem hàng đợi/ })).toHaveAttribute('href', '/admin/grading/writing')
  })

  it('offers one button for the job to grade next, and continues a job that was started', async () => {
    server({ queued: [job(1), job(2)], processing: [job(3, { status: 'PROCESSING', waitSeconds: 90000 })] })
    show('/admin/examiner')

    const next = await screen.findByRole('link', { name: 'Tiếp tục chấm bài' })
    expect(next).toHaveAttribute('href', `/admin/grading/writing/${job(3).id}`)
  })

  it('offers a button to the queue when nothing can be graded yet', async () => {
    server({ queued: [] })
    show('/admin/examiner')

    expect(await screen.findByRole('link', { name: 'Mở hàng đợi chấm bài' })).toHaveAttribute('href', '/admin/grading/writing')
    expect(screen.queryByRole('link', { name: 'Chấm bài tiếp theo' })).not.toBeInTheDocument()
  })

  it('offers no grading link for work that belongs to an exam attempt', async () => {
    server({ queued: [job(1, { attemptId: job(9).id, attemptType: 'MOCK' })] })
    show('/admin/examiner')

    expect(await screen.findByText('Chưa hỗ trợ')).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Chấm bài' })).not.toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Chấm bài tiếp theo' })).not.toBeInTheDocument()
  })

  it('lists what the examiner graded most recently, each with a button to read it again', async () => {
    server({ finished: [graded(1, { band: 7 }), graded(2)] })
    show('/admin/examiner')

    const recent = await screen.findByRole('region', { name: 'Bài đã chấm gần đây' })
    const rows = (await within(recent).findAllByRole('row')).slice(1)
    expect(rows).toHaveLength(2)
    expect(rows[0]).toHaveTextContent('7.0')
    expect(within(rows[0]).getByRole('link', { name: 'Xem lại' })).toHaveAttribute('href', `/admin/grading/writing/${graded(1).jobId}/review`)
    expect(within(recent).getByRole('link', { name: /Xem tất cả bài đã chấm/ })).toHaveAttribute('href', '/admin/grading/writing?tab=done')
  })

  it('says so when nothing was graded yet', async () => {
    server({ finished: [] })
    show('/admin/examiner')

    expect(await screen.findByText('Bạn chưa chấm bài nào')).toBeInTheDocument()
  })

  it('has no profile block: the profile is a menu item of its own, and the dashboard is about the work', async () => {
    server()
    show('/admin/examiner')

    await screen.findByRole('region', { name: 'Hôm nay' })
    expect(screen.queryByRole('region', { name: 'Hồ sơ của tôi' })).not.toBeInTheDocument()
    expect(screen.queryByRole('checkbox', { name: /Đang nhận bài mới/ })).not.toBeInTheDocument()
  })

  it('says on the today block that the examiner paused new submissions', async () => {
    server({ profileBody: profile({ acceptingSubmissions: false }) })
    show('/admin/examiner')

    expect(await screen.findByText(/Bạn đang tạm dừng nhận bài mới/)).toBeInTheDocument()
  })

  it('keeps the other blocks when one of them cannot be loaded', async () => {
    fetchMock.mockImplementation(async (input) => {
      const path = new URL(String(input)).pathname
      if (path === '/api/assessments/examiners/me/summary') return json({ message: 'Dịch vụ chấm bài đang bận' }, 503)
      if (path.startsWith('/api/users/examiners/')) return json(profile())
      return json({ content: [], page: 0, size: 20, totalElements: 0 })
    })
    show('/admin/examiner')

    expect(await screen.findByText('Dịch vụ chấm bài đang bận')).toBeInTheDocument()
    expect(await screen.findByText('Chưa có bài nào chờ bạn chấm')).toBeInTheDocument()
    expect(screen.getByText('Bạn chưa chấm bài nào')).toBeInTheDocument()
  })
})

describe('ExaminerProfilePage', () => {
  const save = () => fireEvent.click(screen.getByRole('button', { name: 'Lưu hồ sơ' }))
  const puts = () => calls.filter((call) => call.method === 'PUT')

  it('fills the form from the profile and saves band, certificates and the switch', async () => {
    server()
    show('/admin/examiner/profile')

    expect(await screen.findByLabelText('Band IELTS')).toHaveValue('8')
    expect(screen.getByDisplayValue('IELTS Academic')).toBeInTheDocument()

    fireEvent.change(screen.getByLabelText('Band IELTS'), { target: { value: '8.5' } })
    fireEvent.click(screen.getByRole('button', { name: 'Thêm chứng chỉ' }))
    const second = screen.getByRole('group', { name: 'Chứng chỉ 2' })
    fireEvent.change(within(second).getByLabelText('Tên chứng chỉ'), { target: { value: ' CELTA ' } })
    fireEvent.change(within(second).getByLabelText('Năm'), { target: { value: '2020' } })
    fireEvent.click(screen.getByRole('checkbox', { name: 'Đang nhận bài mới' }))
    save()

    expect(await screen.findByText(/Đã lưu hồ sơ/)).toBeInTheDocument()
    expect(puts()).toHaveLength(1)
    expect(puts()[0].body).toEqual({
      ieltsBand: 8.5,
      certificates: [
        { name: 'IELTS Academic', issuer: 'British Council', year: 2023, score: '8.0' },
        { name: 'CELTA', issuer: null, year: 2020, score: null },
      ],
      acceptingSubmissions: false,
    })
  })

  it('sends no band when none is chosen, and drops a removed certificate', async () => {
    server()
    show('/admin/examiner/profile')

    fireEvent.change(await screen.findByLabelText('Band IELTS'), { target: { value: '' } })
    fireEvent.click(screen.getByRole('button', { name: 'Xóa chứng chỉ 1' }))
    save()

    await screen.findByText(/Đã lưu hồ sơ/)
    expect(puts()[0].body).toEqual({ ieltsBand: null, certificates: [], acceptingSubmissions: true })
  })

  it('refuses a certificate without a name or with an impossible year, and saves nothing', async () => {
    server()
    show('/admin/examiner/profile')
    await screen.findByLabelText('Band IELTS')

    fireEvent.click(screen.getByRole('button', { name: 'Thêm chứng chỉ' }))
    save()
    expect(await screen.findByRole('alert')).toHaveTextContent('Chứng chỉ 2: nhập tên chứng chỉ')

    const second = screen.getByRole('group', { name: 'Chứng chỉ 2' })
    fireEvent.change(within(second).getByLabelText('Tên chứng chỉ'), { target: { value: 'CELTA' } })
    fireEvent.change(within(second).getByLabelText('Năm'), { target: { value: '1900' } })
    save()
    expect(await screen.findByRole('alert')).toHaveTextContent('Chứng chỉ 2: năm phải từ 1950 đến 2100')
    expect(puts()).toHaveLength(0)
  })

  it('allows at most ten certificates', async () => {
    server({ profileBody: profile({ certificates: Array.from({ length: 10 }, (_, index) => ({ name: `Chứng chỉ ${index}` })) }) })
    show('/admin/examiner/profile')

    expect(await screen.findByRole('button', { name: 'Thêm chứng chỉ' })).toBeDisabled()
  })

  it('shows the server message when saving fails, and keeps what was typed', async () => {
    server()
    show('/admin/examiner/profile')
    await screen.findByLabelText('Band IELTS')
    fetchMock.mockImplementation(async () => json({ message: 'Hồ sơ không hợp lệ' }, 400))

    fireEvent.change(screen.getByLabelText('Band IELTS'), { target: { value: '7' } })
    save()

    expect(await screen.findByRole('alert')).toHaveTextContent('Hồ sơ không hợp lệ')
    expect(screen.getByLabelText('Band IELTS')).toHaveValue('7')
  })
})
