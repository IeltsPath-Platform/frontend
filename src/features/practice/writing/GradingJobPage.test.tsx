import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { clearAccessToken, setAccessToken } from '@/lib/httpClient'
import { GradingJobPage } from './GradingJobPage'

vi.mock('@/components/SiteNavbar', () => ({ SiteNavbar: () => null }))

const jobId = '50000000-0000-4000-8000-000000000001'
const examinerId = '20000000-0000-4000-8000-000000000001'
const profile = { id: examinerId, displayName: 'Ms Lan Phương', avatarUrl: null, bio: null, ieltsBand: 8.5, certificates: [], acceptingSubmissions: true }
const job = (overrides = {}) => ({
  id: jobId, reviewSubmissionId: null, skill: 'WRITING', source: 'MOCK', state: 'OVERDUE', examinerId,
  requestedAt: '2026-10-21T01:00:00Z', deadline: '2026-10-23T01:00:00Z', canChoose: true, changesLeft: 2, createdAt: '2026-10-21T00:59:00Z', ...overrides,
})

const fetchMock = vi.fn<typeof fetch>()
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })
const posts: string[] = []
function server(jobs: unknown[] | (() => unknown[]), reviews: () => Response = () => json({}, 404), cancel: () => Response = () => json({}, 404)) {
  fetchMock.mockImplementation(async (input, options = {}) => {
    const path = new URL(String(input)).pathname
    if (options.method === 'POST') posts.push(path)
    if (path === '/api/assessments/grading-jobs/mine') return json(typeof jobs === 'function' ? jobs() : jobs)
    if (path === '/api/learning/examiner-reviews') return reviews()
    if (path.endsWith('/cancel')) return cancel()
    if (path === `/api/users/examiners/${examinerId}`) return json(profile)
    return json({}, 404)
  })
}
const show = (id = jobId) => render(<MemoryRouter initialEntries={[`/grading-jobs/${id}`]}><Routes>
  <Route path="/grading-jobs/:jobId" element={<GradingJobPage />} />
</Routes></MemoryRouter>)

describe('the page a late-examiner notice opens', () => {
  beforeEach(() => { posts.length = 0; fetchMock.mockReset(); vi.stubGlobal('fetch', fetchMock); setAccessToken('test-access-token'); window.localStorage.clear() })
  afterEach(() => { clearAccessToken(); vi.unstubAllGlobals() })

  it('shows who is late and offers to keep waiting or to change, whatever the job came from', async () => {
    server([job(), job({ id: '50000000-0000-4000-8000-000000000002', state: 'COMPLETED' })])
    show()

    const notice = await screen.findByRole('region', { name: 'Giáo viên chưa chấm bài' })
    expect(await within(notice).findByRole('button', { name: 'Tiếp tục chờ Ms Lan Phương' })).toBeInTheDocument()
    expect(within(notice).getByRole('button', { name: 'Yêu cầu đổi giáo viên' })).toBeInTheDocument()
    expect(await screen.findByRole('region', { name: 'Giáo viên chấm bài' })).toHaveTextContent('Ms Lan Phương')
    expect(screen.queryByRole('region', { name: 'Trạng thái chấm bài' })).not.toBeInTheDocument()
  })

  it('shows the deadline of a job that still has time, with no notice', async () => {
    server([job({ state: 'WAITING', canChoose: false })])
    show()

    const state = await screen.findByRole('region', { name: 'Trạng thái chấm bài' })
    expect(state).toHaveTextContent('Giáo viên đang chấm bài của bạn')
    expect(state).toHaveTextContent('Hạn chấm:')
    expect(screen.queryByRole('region', { name: 'Giáo viên chưa chấm bài' })).not.toBeInTheDocument()
  })

  it('says so when the job is finished', async () => {
    server([job({ state: 'COMPLETED', canChoose: false })])
    show()

    expect(await screen.findByRole('region', { name: 'Trạng thái chấm bài' })).toHaveTextContent('Giáo viên đã chấm xong bài này.')
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Giáo viên đã chấm xong bài')
  })

  describe('a late essay whose examiner can no longer be changed', () => {
    const reviewId = '60000000-0000-4000-8000-000000000009'
    const late = (overrides = {}) => job({ reviewSubmissionId: reviewId, source: 'PRACTICE', canChoose: false, changesLeft: 0, canCancel: true, ...overrides })

    it('offers to cancel and take the credit back, asks first, and shows the job cancelled afterwards', async () => {
      let current: unknown[] = [late()]
      server(() => current, undefined, () => { current = [late({ state: 'CANCELLED', canCancel: false })]; return json({ status: 'CANCELLED' }) })
      show()

      fireEvent.click(await screen.findByRole('button', { name: 'Hủy yêu cầu và nhận lại lượt' }))
      const dialog = await screen.findByRole('dialog', { name: /Hủy yêu cầu chấm bài/ })
      expect(posts).not.toContain(`/api/learning/examiner-reviews/${reviewId}/cancel`)
      fireEvent.click(within(dialog).getByRole('button', { name: 'Hủy và nhận lại lượt' }))

      await waitFor(() => expect(posts).toContain(`/api/learning/examiner-reviews/${reviewId}/cancel`))
      expect(await screen.findByRole('heading', { level: 1, name: 'Đã hủy yêu cầu chấm bài' })).toBeInTheDocument()
      const state = await screen.findByRole('region', { name: 'Trạng thái chấm bài' })
      expect(state).toHaveTextContent('Lượt giáo viên chấm đã được hoàn lại')
      expect(within(state).getByRole('link', { name: 'Về danh sách bài giáo viên chấm' })).toHaveAttribute('href', '/writing-reviews')
      expect(screen.queryByRole('button', { name: 'Hủy yêu cầu và nhận lại lượt' })).not.toBeInTheDocument()
    })

    it('keeps the request when the learner changes their mind', async () => {
      server([late()])
      show()

      fireEvent.click(await screen.findByRole('button', { name: 'Hủy yêu cầu và nhận lại lượt' }))
      const dialog = await screen.findByRole('dialog', { name: /Hủy yêu cầu chấm bài/ })
      fireEvent.click(within(dialog).getByRole('button', { name: 'Giữ yêu cầu' }))

      await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
      expect(posts).toHaveLength(0)
    })

    it('says why when the server refuses, and when the credit could not be given back yet', async () => {
      server([late()], undefined, () => json({ message: 'x', code: 'HUMAN_REVIEW_UNAVAILABLE' }, 503))
      show()

      fireEvent.click(await screen.findByRole('button', { name: 'Hủy yêu cầu và nhận lại lượt' }))
      fireEvent.click(within(await screen.findByRole('dialog', { name: /Hủy yêu cầu chấm bài/ })).getByRole('button', { name: 'Hủy và nhận lại lượt' }))

      expect(await screen.findByRole('alert')).toHaveTextContent('hãy bấm hủy lại để nhận lại lượt')
    })

    it('offers nothing to cancel while an examiner change is left or the job is not late', async () => {
      server([late({ canCancel: false, canChoose: true, changesLeft: 1 })])
      show()

      await screen.findByRole('region', { name: 'Giáo viên chưa chấm bài' })
      expect(screen.queryByRole('button', { name: 'Hủy yêu cầu và nhận lại lượt' })).not.toBeInTheDocument()
    })
  })

  describe('a finished Practice or Lesson essay', () => {
    const reviewId = '60000000-0000-4000-8000-000000000001'
    const submissionId = '70000000-0000-4000-8000-000000000001'
    const finishedJob = () => job({ state: 'COMPLETED', canChoose: false, reviewSubmissionId: reviewId, source: 'PRACTICE' })
    const reviewItem = { submissionId, reviewSubmissionId: reviewId, source: 'PRACTICE', task: 'TASK_2', promptPreview: 'Some people…', wordCount: 260, requestedAt: '2026-10-21T01:00:00Z' }

    it('leads straight to the result of that essay, so the learner does not have to look for it', async () => {
      server([finishedJob()], () => json({ items: [reviewItem], page: 0, size: 50, hasNext: false }))
      show()

      const state = await screen.findByRole('region', { name: 'Trạng thái chấm bài' })
      await waitFor(() => expect(within(state).getByRole('link', { name: /Xem kết quả chấm/ })).toHaveAttribute('href', `/practice/writing/submissions/${submissionId}/result`))
      expect(within(state).queryByRole('button', { name: /Kiểm tra lại/ })).not.toBeInTheDocument()
    })

    it('falls back to the list of graded essays when the essay cannot be found', async () => {
      server([finishedJob()], () => json({ message: 'busy' }, 503))
      show()

      const state = await screen.findByRole('region', { name: 'Trạng thái chấm bài' })
      expect(within(state).getByRole('link', { name: /Xem kết quả chấm/ })).toHaveAttribute('href', '/writing-reviews')
    })
  })

  it('has nothing to press while the job waits, and checks again by itself every minute', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    try {
      let current: unknown[] = [job({ state: 'WAITING', canChoose: false })]
      server(() => current)
      show()

      const state = await screen.findByRole('region', { name: 'Trạng thái chấm bài' })
      expect(within(state).queryByRole('button')).not.toBeInTheDocument()
      expect(within(state).queryByRole('link')).not.toBeInTheDocument()

      current = [job({ state: 'COMPLETED', canChoose: false })]
      await vi.advanceTimersByTimeAsync(61_000)
      await waitFor(() => expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Giáo viên đã chấm xong bài'))
    } finally {
      vi.useRealTimers()
    }
  })

  it('says the job is not the learner’s when it is not in their list', async () => {
    server([job()])
    show('50000000-0000-4000-8000-0000000000ff')

    expect(await screen.findByRole('alert')).toHaveTextContent('Không tìm thấy bài chấm này')
  })

  it('shows the error and lets the learner try again when the jobs cannot be loaded', async () => {
    fetchMock.mockImplementation(async () => json({ message: 'Dịch vụ chấm bài đang bận' }, 503))
    show()

    expect(await screen.findByRole('alert')).toHaveTextContent('Chưa tải được nội dung')
    expect(screen.getByRole('button', { name: 'Thử lại' })).toBeInTheDocument()
  })
})
