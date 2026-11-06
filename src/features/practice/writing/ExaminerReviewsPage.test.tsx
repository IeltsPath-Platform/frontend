import { fireEvent, render, screen, within } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { clearAccessToken, setAccessToken } from '@/lib/httpClient'
import { ExaminerReviewsPage } from './ExaminerReviewsPage'

vi.mock('@/components/SiteNavbar', () => ({ SiteNavbar: () => null }))

const id = (n: number) => `30000000-0000-4000-8000-${String(n).padStart(12, '0')}`
const item = (n: number, overrides = {}) => ({
  submissionId: id(n), reviewSubmissionId: id(100 + n), source: 'FREE_WRITING', task: 'TASK_2', promptPreview: `Prompt number ${n}`,
  wordCount: 260, requestedAt: `2026-10-2${n}T01:00:00Z`, ...overrides,
})
const job = (n: number, overrides = {}) => ({
  id: id(200 + n), reviewSubmissionId: id(100 + n), skill: 'WRITING', source: 'PRACTICE', state: 'WAITING', examinerId: id(9),
  requestedAt: '2026-10-25T01:00:00Z', deadline: '2026-10-27T01:00:00Z', canChoose: false, changesLeft: 2, createdAt: '2026-10-25T01:00:00Z', ...overrides,
})
const done = (n: number, band: number) => job(n, { state: 'COMPLETED', band, completedAt: '2026-10-26T03:00:00Z' })

const calls: string[] = []
const fetchMock = vi.fn<typeof fetch>()
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })

function server({ pages, jobs = [] as unknown[], jobsFail = false }: { pages: unknown[][]; jobs?: unknown[]; jobsFail?: boolean }) {
  fetchMock.mockImplementation(async (input) => {
    const url = new URL(String(input))
    calls.push(url.pathname + url.search)
    if (url.pathname === '/api/learning/examiner-reviews') {
      const page = Number(url.searchParams.get('page'))
      return json({ items: pages[page] ?? [], page, size: 10, hasNext: page < pages.length - 1 })
    }
    if (url.pathname === '/api/assessments/grading-jobs/mine') return jobsFail ? json({ message: 'down' }, 503) : json(jobs)
    return json({}, 404)
  })
}

const LIST_NAME = 'Bài đã gửi giáo viên'
const listed = () => screen.findByRole('region', { name: LIST_NAME })
/** The lines of the list, one per essay. */
const bodyRows = () => within(screen.getByRole('region', { name: LIST_NAME })).getAllByRole('listitem')

const show = () => render(<MemoryRouter initialEntries={['/writing-reviews']}><Routes>
  <Route path="/writing-reviews" element={<ExaminerReviewsPage />} />
  <Route path="/practice-tests" element={<p>Danh mục Writing</p>} />
  <Route path="/practice/writing/submissions/:submissionId/result" element={<p>Chi tiết bài</p>} />
</Routes></MemoryRouter>)

describe('the list a "your essay was graded" notice opens', () => {
  beforeEach(() => { calls.length = 0; fetchMock.mockReset(); vi.stubGlobal('fetch', fetchMock); setAccessToken('test-access-token') })
  afterEach(() => { clearAccessToken(); vi.unstubAllGlobals() })

  it('lists the graded essay first with its band and a button to read the comments, and the waiting one after it', async () => {
    server({ pages: [[item(1), item(2)]], jobs: [job(1), done(2, 6.5)] })
    show()

    await listed()
    const rows = bodyRows()
    expect(rows).toHaveLength(2)
    expect(rows[0]).toHaveTextContent('Prompt number 2')
    expect(rows[0]).toHaveTextContent('Đã chấm')
    expect(within(rows[0]).getByLabelText('Band 6.5')).toHaveTextContent('6.5')
    expect(within(rows[0]).getByRole('link', { name: 'Xem nhận xét' })).toHaveAttribute('href', `/practice/writing/submissions/${id(2)}/result`)
    expect(rows[1]).toHaveTextContent('Đang chờ chấm')
    expect(within(rows[1]).queryByLabelText(/Band/)).not.toBeInTheDocument()
    expect(within(rows[1]).getByRole('link', { name: 'Xem bài' })).toHaveAttribute('href', `/practice/writing/submissions/${id(1)}/result`)
  })

  it('leads to the home page with the house icon alone, without a back button or a catalogue step', async () => {
    server({ pages: [[item(1)]], jobs: [job(1)] })
    show()

    await listed()
    expect(screen.getByRole('link', { name: 'Trang chủ' })).toHaveAttribute('href', '/')
    expect(screen.queryByRole('link', { name: /Quay lại/ })).not.toBeInTheDocument()
    expect(screen.queryByText('Luyện tập Writing')).not.toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 1, name: 'Bài giáo viên đã chấm' })).toBeInTheDocument()
  })

  it('opens an essay on the screen with the comments and the marked errors', async () => {
    server({ pages: [[item(1)]], jobs: [done(1, 7)] })
    show()

    fireEvent.click(await screen.findByRole('link', { name: 'Xem nhận xét' }))

    expect(await screen.findByText('Chi tiết bài')).toBeInTheDocument()
  })

  it('filters by graded and waiting, with the counts on the buttons', async () => {
    server({ pages: [[item(1), item(2), item(3)]], jobs: [done(1, 6), job(2), job(3, { state: 'OVERDUE' })] })
    show()
    await listed()

    expect(screen.getByRole('button', { name: /^Tất cả\s*3$/ })).toHaveAttribute('aria-pressed', 'true')
    fireEvent.click(screen.getByRole('button', { name: /^Đã chấm\s*1$/ }))
    expect(bodyRows()).toHaveLength(1)
    fireEvent.click(screen.getByRole('button', { name: /^Đang chờ chấm\s*2$/ }))
    expect(bodyRows()).toHaveLength(2)
    expect(screen.getByText('Quá hạn 48 giờ')).toBeInTheDocument()
  })

  it('loads older essays on request and adds them under the ones already shown', async () => {
    server({ pages: [[item(1)], [item(2)]], jobs: [done(1, 6), done(2, 7)] })
    show()
    await listed()

    fireEvent.click(screen.getByRole('button', { name: /Xem thêm/ }))

    expect(await screen.findByText('Prompt number 2')).toBeInTheDocument()
    expect(bodyRows()).toHaveLength(2)
    expect(calls.filter((call) => call.startsWith('/api/learning/examiner-reviews'))).toHaveLength(2)
    expect(screen.queryByRole('button', { name: /Xem thêm/ })).not.toBeInTheDocument()
  })

  it('says so when nothing was sent to a teacher yet', async () => {
    server({ pages: [[]] })
    show()

    expect(await screen.findByText('Bạn chưa gửi bài nào cho giáo viên')).toBeInTheDocument()
    expect(screen.queryByRole('region', { name: LIST_NAME })).not.toBeInTheDocument()
  })

  it('still lists the essays, as waiting, when the state of the jobs cannot be read', async () => {
    server({ pages: [[item(1)]], jobsFail: true })
    show()

    expect(await screen.findByText('Prompt number 1')).toBeInTheDocument()
    expect(await screen.findByText(/Chưa lấy được trạng thái chấm bài/)).toBeInTheDocument()
  })

  it('shows an error with a way to try again when the list cannot be loaded', async () => {
    fetchMock.mockImplementation(async () => json({ message: 'Dịch vụ đang bận' }, 503))
    show()

    expect(await screen.findByRole('button', { name: /Thử lại/ })).toBeInTheDocument()
  })
})
