import { fireEvent, render, screen, within } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { clearAccessToken, setAccessToken } from '@/lib/httpClient'
import { ExaminerDashboardPage } from './ExaminerDashboardPage'
import { ExaminerProfilePage } from './ExaminerProfilePage'

const EXAMINER = '20000000-0000-4000-8000-0000000000e1'
vi.mock('@/features/auth/authSession', () => ({ useAuthSession: () => ({ userId: '20000000-0000-4000-8000-0000000000e1', userName: 'Lê Hiếu' }) }))

const summary = (overrides = {}) => ({ queued: 6, processing: 2, dueSoon: 3, overdue: 1, completedToday: 3, completedThisWeek: 11, receivedToday: 7, dailyLimit: 10, overdueLimit: 5, ...overrides })
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
    <Route path="/examiner" element={<ExaminerDashboardPage />} />
    <Route path="/examiner/profile" element={<ExaminerProfilePage />} />
  </Routes></MemoryRouter>)
}

beforeEach(() => { calls.length = 0; fetchMock.mockReset(); vi.stubGlobal('fetch', fetchMock); setAccessToken('test-access-token') })
afterEach(() => { clearAccessToken(); vi.unstubAllGlobals(); vi.restoreAllMocks() })

describe('ExaminerDashboardPage', () => {
  it('shows what waits, how late it is, how much was taken today against the limit, and what was finished', async () => {
    server()
    show('/examiner')

    const queue = await screen.findByRole('region', { name: 'Hàng đợi' })
    const states = await within(queue).findByRole('list', { name: 'Số bài theo trạng thái' })
    expect(within(states).getByText('Chờ chấm').closest('a')).toHaveTextContent('6')
    expect(within(states).getByText('Đang chấm').closest('a')).toHaveTextContent('2')
    expect(within(states).getByText('Sắp quá hạn (36h)').closest('a')).toHaveTextContent('3')
    expect(within(states).getByText('Quá hạn 48h').closest('a')).toHaveTextContent('1')

    // 8 open jobs, 3 late soon and 1 late: 4 are still on time.
    expect(within(queue).getByRole('img', { name: /8 bài đang mở/ })).toBeInTheDocument()
    expect(within(queue).getByText('Còn hạn').closest('li')).toHaveTextContent('4')
    expect(within(queue).getByText('Sắp quá hạn').closest('li')).toHaveTextContent('3')
    expect(within(queue).getByText('Quá hạn').closest('li')).toHaveTextContent('1')

    expect(within(queue).getByText('Đã nhận 7/10 bài hôm nay')).toBeInTheDocument()
    // The centre of the donut says 70%; the legend repeats it as the share of the taken slice.
    expect(within(within(queue).getByRole('img', { name: 'Đã nhận 7 trên 10 bài hôm nay' })).getByText('70%')).toBeInTheDocument()
    expect(within(queue).getByText('Đã chấm hôm nay').nextSibling).toHaveTextContent('3')
    expect(within(queue).getByText('Đã chấm tuần này').nextSibling).toHaveTextContent('11')
  })

  it('has no greeting bar: the page opens on the numbers and keeps only a hidden title for screen readers', async () => {
    server()
    show('/examiner')

    await screen.findByRole('list', { name: 'Số bài theo trạng thái' })
    expect(screen.queryByText(/Xin chào/)).not.toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 1, name: 'Tổng quan chấm bài' })).toBeInTheDocument()
  })

  it('says so when the daily limit is reached, and shows only the count when the limit is unknown', async () => {
    server({ summaryBody: summary({ receivedToday: 10 }) })
    const { unmount } = show('/examiner')
    expect(await screen.findByText(/Bạn đã nhận đủ số bài hôm nay/)).toBeInTheDocument()
    unmount()

    server({ summaryBody: summary({ dailyLimit: null }) })
    show('/examiner')
    expect(await screen.findByText('Đã nhận 7 bài hôm nay')).toBeInTheDocument()
    expect(screen.queryByRole('img', { name: /bài hôm nay/ })).not.toBeInTheDocument()
  })

  it('draws no deadline chart when nothing is open', async () => {
    server({ summaryBody: summary({ queued: 0, processing: 0, dueSoon: 0, overdue: 0 }) })
    show('/examiner')

    expect(await screen.findByText('Không có bài đang mở.')).toBeInTheDocument()
    expect(screen.queryByRole('img', { name: /bài đang mở/ })).not.toBeInTheDocument()
  })

  it('opens the matching tab of the queue from each number', async () => {
    server()
    show('/examiner')

    const stats = await screen.findByRole('list', { name: 'Số bài theo trạng thái' })
    expect(within(stats).getByText('Chờ chấm').closest('a')).toHaveAttribute('href', '/examiner/grading/writing?tab=queued')
    expect(within(stats).getByText('Đang chấm').closest('a')).toHaveAttribute('href', '/examiner/grading/writing?tab=processing')
    expect(within(stats).getByText('Sắp quá hạn (36h)').closest('a')).toHaveAttribute('href', '/examiner/grading/writing?tab=due-soon')
    expect(within(stats).getByText('Quá hạn 48h').closest('a')).toHaveAttribute('href', '/examiner/grading/writing?tab=overdue')
    expect(within(screen.getByRole('region', { name: 'Hàng đợi' })).getByRole('link', { name: /Mở hàng đợi/ })).toHaveAttribute('href', '/examiner/grading/writing')
  })

  it('shows only the jobs that cannot wait, late ones first, each with why and a button, and counts the rest', async () => {
    server({
      queued: [
        job(1, { overdue: true, waitSeconds: 200000 }),
        job(2, { waitSeconds: 40 * 3600 }),
        job(3, { waitSeconds: 3600 }),
        job(4, { waitSeconds: 7200 }),
      ],
      processing: [job(5, { status: 'PROCESSING', hasDraft: true, waitSeconds: 30 * 3600 })],
    })
    show('/examiner')

    const todo = await screen.findByRole('region', { name: 'Việc cần làm ngay' })
    const cards = within(todo).getAllByRole('listitem')
    expect(cards).toHaveLength(3)
    // Late first, then late soon, then the one started and left. The two jobs that only wait are not here.
    expect(cards[0]).toHaveTextContent('Quá hạn')
    expect(cards[0]).toHaveTextContent('học viên đổi giáo viên')
    expect(within(cards[0]).getByRole('link', { name: 'Chấm bài' })).toHaveAttribute('href', `/examiner/grading/writing/${job(1).id}`)
    expect(cards[1]).toHaveTextContent('Sắp quá hạn')
    expect(cards[2]).toHaveTextContent('Đang chấm dở')
    expect(within(cards[2]).getByRole('link', { name: 'Tiếp tục chấm' })).toHaveAttribute('href', `/examiner/grading/writing/${job(5).id}`)
    expect(todo.querySelector(`a[href$="${job(3).id}"]`)).toBeNull()
    expect(within(todo).getByText('Còn 2 bài khác trong hàng đợi.')).toBeInTheDocument()
    expect(within(todo).getByRole('link', { name: /Xem toàn bộ hàng đợi/ })).toHaveAttribute('href', '/examiner/grading/writing')
  })

  it('does not repeat the queue: with nothing urgent it says so and offers only the next job', async () => {
    server({ queued: Array.from({ length: 6 }, (_, index) => job(index)) })
    show('/examiner')

    const todo = await screen.findByRole('region', { name: 'Việc cần làm ngay' })
    expect(within(todo).getByText(/Không có bài nào gấp/)).toBeInTheDocument()
    // One card, the job that waited longest, not a table of five.
    expect(within(todo).getAllByRole('listitem')).toHaveLength(1)
    expect(within(todo).queryByRole('table')).not.toBeInTheDocument()
    expect(within(todo).getByRole('link', { name: 'Chấm bài' })).toHaveAttribute('href', `/examiner/grading/writing/${job(5).id}`)
    expect(within(todo).getByText('Còn 5 bài khác trong hàng đợi.')).toBeInTheDocument()
  })

  it('says so when nothing waits for the examiner', async () => {
    server({ queued: [] })
    show('/examiner')

    expect(await screen.findByText('Chưa có bài nào chờ bạn chấm')).toBeInTheDocument()
  })

  it('offers no grading link for work that belongs to an exam attempt', async () => {
    server({ queued: [job(1, { attemptId: job(9).id, attemptType: 'MOCK' })] })
    show('/examiner')

    expect(await screen.findByText(/chưa chấm được trên màn hình này/)).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Chấm bài' })).not.toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Chấm bài tiếp theo' })).not.toBeInTheDocument()
  })

  it('sums up graded work in charts without listing a single job; the finished jobs are a tab of the queue', async () => {
    server({ finished: [graded(1, { band: 7 }), graded(2, { band: 6, task: 'TASK_1', source: 'TOPIC_GATE' })] })
    show('/examiner')

    const results = await screen.findByRole('region', { name: 'Kết quả chấm' })
    // Bands 7 and 6 average 6.5.
    expect(await within(results).findByText('Band trung bình')).toHaveTextContent('Band trung bình 6.5')
    expect(within(results).getByText('Task 1').closest('li')).toHaveTextContent('1')
    expect(within(results).getByText('Task 2').closest('li')).toHaveTextContent('1')
    expect(within(results).getByText('Luyện tập').closest('li')).toHaveTextContent('1')
    expect(within(results).getByText('Thi cuối chủ đề').closest('li')).toHaveTextContent('1')
    expect(within(results).getByRole('img', { name: /theo band tổng/ })).toBeInTheDocument()
    expect(within(results).getByRole('img', { name: /7 ngày gần nhất/ })).toBeInTheDocument()

    expect(screen.queryByRole('link', { name: 'Xem lại' })).not.toBeInTheDocument()
    expect(within(results).queryByRole('table')).not.toBeInTheDocument()
    expect(within(results).getByRole('link', { name: /Xem các bài đã chấm/ })).toHaveAttribute('href', '/examiner/grading/writing?tab=done')
    expect(calls.some((call) => call.path === '/api/assessments/examiners/me/completed')).toBe(true)
  })

  it('says so when nothing was graded yet', async () => {
    server({ finished: [] })
    show('/examiner')

    const results = await screen.findByRole('region', { name: 'Kết quả chấm' })
    expect(await within(results).findByText('Chưa chấm bài nào')).toBeInTheDocument()
  })

  it('says the charts cover only the newest jobs when the examiner graded more than were read', async () => {
    fetchMock.mockImplementation(async (input) => {
      const path = new URL(String(input)).pathname
      if (path === '/api/assessments/examiners/me/summary') return json(summary())
      if (path === '/api/assessments/examiners/me/completed') return json({ content: [graded(1)], page: 0, size: 100, totalElements: 250 })
      if (path.startsWith('/api/users/examiners/')) return json(profile())
      return json({ content: [], page: 0, size: 100, totalElements: 0 })
    })
    show('/examiner')

    expect(await screen.findByText('Tính trên 1 bài chấm gần nhất.')).toBeInTheDocument()
  })

  it('has no profile block: the profile is a menu item of its own, and the dashboard is about the work', async () => {
    server()
    show('/examiner')

    await screen.findByRole('region', { name: 'Hàng đợi' })
    expect(screen.queryByRole('region', { name: 'Hồ sơ của tôi' })).not.toBeInTheDocument()
    expect(screen.queryByRole('checkbox', { name: /Đang nhận bài mới/ })).not.toBeInTheDocument()
  })

  it('does not edit the profile from the queue block: that is in the account menu', async () => {
    server()
    show('/examiner')

    const queue = await screen.findByRole('region', { name: 'Hàng đợi' })
    expect(within(queue).queryByRole('link', { name: /Sửa hồ sơ/ })).not.toBeInTheDocument()
  })

  it('tells the examiner why learners cannot choose them: too many late jobs, and how to open again', async () => {
    server({ summaryBody: summary({ overdue: 5 }) })
    const { unmount } = show('/examiner')
    expect(await screen.findByText(/Bạn có 5 bài quá hạn nên học viên tạm chưa chọn được bạn/)).toBeInTheDocument()
    expect(screen.getByText(/xuống dưới 5 bài quá hạn/)).toBeInTheDocument()
    unmount()

    server({ summaryBody: summary({ overdue: 4 }) })
    show('/examiner')
    await screen.findByText('Đã nhận 7/10 bài hôm nay')
    expect(screen.queryByText(/tạm chưa chọn được bạn/)).not.toBeInTheDocument()
  })

  it('says on the today block that the examiner paused new submissions', async () => {
    server({ profileBody: profile({ acceptingSubmissions: false }) })
    show('/examiner')

    expect(await screen.findByText(/Bạn đang tạm dừng nhận bài mới/)).toBeInTheDocument()
  })

  it('keeps the other blocks when one of them cannot be loaded', async () => {
    fetchMock.mockImplementation(async (input) => {
      const path = new URL(String(input)).pathname
      if (path === '/api/assessments/examiners/me/summary') return json({ message: 'Dịch vụ chấm bài đang bận' }, 503)
      if (path.startsWith('/api/users/examiners/')) return json(profile())
      return json({ content: [], page: 0, size: 20, totalElements: 0 })
    })
    show('/examiner')

    expect(await screen.findByText('Dịch vụ chấm bài đang bận')).toBeInTheDocument()
    expect(await screen.findByText('Chưa có bài nào chờ bạn chấm')).toBeInTheDocument()
  })

  it('keeps the queue numbers when the graded jobs cannot be loaded', async () => {
    fetchMock.mockImplementation(async (input) => {
      const path = new URL(String(input)).pathname
      if (path === '/api/assessments/examiners/me/summary') return json(summary())
      if (path === '/api/assessments/examiners/me/completed') return json({ message: 'Không đọc được bài đã chấm' }, 503)
      if (path.startsWith('/api/users/examiners/')) return json(profile())
      return json({ content: [], page: 0, size: 100, totalElements: 0 })
    })
    show('/examiner')

    expect(await screen.findByText('Không đọc được bài đã chấm')).toBeInTheDocument()
    expect(await screen.findByRole('list', { name: 'Số bài theo trạng thái' })).toBeInTheDocument()
  })
})

describe('ExaminerProfilePage', () => {
  const save = () => fireEvent.click(screen.getByRole('button', { name: 'Lưu hồ sơ' }))
  const puts = () => calls.filter((call) => call.method === 'PUT')

  it('fills the form from the profile and saves band, certificates and the switch', async () => {
    server()
    show('/examiner/profile')

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
    show('/examiner/profile')

    fireEvent.change(await screen.findByLabelText('Band IELTS'), { target: { value: '' } })
    fireEvent.click(screen.getByRole('button', { name: 'Xóa chứng chỉ 1' }))
    save()

    await screen.findByText(/Đã lưu hồ sơ/)
    expect(puts()[0].body).toEqual({ ieltsBand: null, certificates: [], acceptingSubmissions: true })
  })

  it('refuses a certificate without a name or with an impossible year, and saves nothing', async () => {
    server()
    show('/examiner/profile')
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
    show('/examiner/profile')

    expect(await screen.findByRole('button', { name: 'Thêm chứng chỉ' })).toBeDisabled()
  })

  it('shows the server message when saving fails, and keeps what was typed', async () => {
    server()
    show('/examiner/profile')
    await screen.findByLabelText('Band IELTS')
    fetchMock.mockImplementation(async () => json({ message: 'Hồ sơ không hợp lệ' }, 400))

    fireEvent.change(screen.getByLabelText('Band IELTS'), { target: { value: '7' } })
    save()

    expect(await screen.findByRole('alert')).toHaveTextContent('Hồ sơ không hợp lệ')
    expect(screen.getByLabelText('Band IELTS')).toHaveValue('7')
  })
})
