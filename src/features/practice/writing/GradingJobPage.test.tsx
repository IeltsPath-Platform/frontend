import { render, screen, within } from '@testing-library/react'
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
function server(jobs: unknown[]) {
  fetchMock.mockImplementation(async (input) => {
    const path = new URL(String(input)).pathname
    if (path === '/api/assessments/grading-jobs/mine') return json(jobs)
    if (path === `/api/users/examiners/${examinerId}`) return json(profile)
    return json({}, 404)
  })
}
const show = (id = jobId) => render(<MemoryRouter initialEntries={[`/grading-jobs/${id}`]}><Routes>
  <Route path="/grading-jobs/:jobId" element={<GradingJobPage />} />
</Routes></MemoryRouter>)

describe('the page a late-examiner notice opens', () => {
  beforeEach(() => { fetchMock.mockReset(); vi.stubGlobal('fetch', fetchMock); setAccessToken('test-access-token'); window.localStorage.clear() })
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
