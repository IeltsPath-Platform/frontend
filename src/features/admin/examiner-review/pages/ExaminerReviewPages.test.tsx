import { fireEvent, render, screen, waitFor, within } from '@/test/render'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { clearAccessToken, setAccessToken } from '@/lib/httpClient'
import { overallBand } from '../lib/reviewLabels'
import { ExaminerReviewPage } from './ExaminerReviewPage'
import { ReviewEssayPage } from './ReviewEssayPage'

const jobId = '10000000-0000-4000-8000-000000000001'
const otherJob = '10000000-0000-4000-8000-000000000002'
const entry = (overrides = {}) => ({ id: jobId, submissionId: jobId, attemptType: 'TOPIC_GATE', source: 'TOPIC_GATE', skill: 'WRITING', task: 'TASK_2', status: 'QUEUED', reason: 'QA_SAMPLE', assignedExaminerId: null, claimedAt: null, createdAt: '2026-10-21T01:00:00Z', waitSeconds: 7200, overdue: false, ...overrides })
const page = (content: unknown[], totalElements = content.length) => ({ content, page: 0, size: 20, totalElements })
const essay = { jobId, attemptId: otherJob, attemptItemId: otherJob, prompt: 'Discuss both views.', essay: 'Some people think...', task: 'TASK_2', rubric: { code: 'TASK_2', criteria: [{ code: 'TR' }] }, source: 'TOPIC_GATE' }

type Call = { path: string; query: URLSearchParams; method: string; body: unknown }
const calls: Call[] = []
const fetchMock = vi.fn<typeof fetch>()
const json = (body: unknown, status = 200) => new Response(status === 204 ? null : JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })
function backend(respond: (call: Call) => Response) {
  fetchMock.mockImplementation(async (input, options = {}) => {
    const url = new URL(String(input))
    const call = { path: url.pathname, query: url.searchParams, method: options.method ?? 'GET', body: typeof options.body === 'string' ? JSON.parse(options.body) : options.body }
    calls.push(call)
    return respond(call)
  })
}
function Location() { const { pathname } = useLocation(); return <output data-testid="location">{pathname}</output> }
function show(path = '/content-author/examiner-review') {
  return render(<MemoryRouter initialEntries={[path]}><Routes>
    <Route path="/content-author/examiner-review" element={<ExaminerReviewPage />} />
    <Route path="/content-author/examiner-review/:jobId" element={<ReviewEssayPage />} />
  </Routes><Location /></MemoryRouter>)
}

describe('overallBand', () => {
  it('rounds the mean of the four criteria to the nearest half band', () => {
    expect(overallBand({ taskResponse: 6, coherence: 6, lexical: 6, grammar: 6 })).toBe(6)
    expect(overallBand({ taskResponse: 6, coherence: 6.5, lexical: 6.5, grammar: 6 })).toBe(6.5)
    expect(overallBand({ taskResponse: 6, coherence: 6, lexical: 6, grammar: 7 })).toBe(6.5)
    expect(overallBand({ taskResponse: 5.5, coherence: 6, lexical: 6, grammar: 6 })).toBe(6)
  })
})

describe('ExaminerReviewPage', () => {
  beforeEach(() => { calls.length = 0; fetchMock.mockReset(); vi.stubGlobal('fetch', fetchMock); setAccessToken('test-access-token') })
  afterEach(() => { clearAccessToken(); vi.unstubAllGlobals() })

  it('lists the queue with the wait time and flags essays that waited too long', async () => {
    backend(() => json(page([entry(), entry({ id: otherJob, overdue: true, waitSeconds: 200000, task: 'TASK_1' })])))
    show()

    expect(await screen.findByText('Quá 48 giờ')).toBeInTheDocument()
    expect(calls[0].path).toBe('/api/assessments/qa-reviews/queue')
    expect(calls[0].query.get('page')).toBe('0')
    const rows = screen.getAllByRole('row').slice(1)
    expect(rows[0]).toHaveTextContent('Task 2')
    expect(rows[0]).toHaveTextContent('Thi cuối chủ đề')
    expect(rows[0]).toHaveTextContent('2 giờ')
    expect(rows[0]).not.toHaveTextContent('Quá 48 giờ')
    expect(rows[1]).toHaveTextContent('Quá 48 giờ')
  })

  it('claims an essay and then opens the blind review screen', async () => {
    backend(({ path }) => path.endsWith('/claim') ? json(entry({ status: 'CLAIMED' })) : path.endsWith('/essay') ? json(essay) : json(page([entry()])))
    show()

    fireEvent.click(await screen.findByRole('button', { name: 'Nhận' }))

    await waitFor(() => expect(screen.getByTestId('location')).toHaveTextContent(`/content-author/examiner-review/${jobId}`))
    expect(calls.find((call) => call.method === 'POST')?.path).toBe(`/api/assessments/qa-reviews/${jobId}/claim`)
  })

  it('stays on the queue and shows the reason when an essay cannot be claimed', async () => {
    backend(({ method }) => method === 'POST' ? json({ message: 'Bài này đã có người nhận' }, 409) : json(page([entry()])))
    show()

    fireEvent.click(await screen.findByRole('button', { name: 'Nhận' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('Bài này đã có người nhận')
    expect(screen.getByTestId('location')).toHaveTextContent('/content-author/examiner-review')
  })

  it('shows the essays the caller already claimed with a link to continue', async () => {
    backend(({ path }) => json(path.endsWith('/mine') ? page([entry({ status: 'CLAIMED' })]) : page([])))
    show()
    fireEvent.click(await screen.findByRole('button', { name: 'Bài tôi đang chấm' }))

    const link = await screen.findByRole('link', { name: 'Chấm tiếp' })

    expect(link).toHaveAttribute('href', `/content-author/examiner-review/${jobId}`)
  })

  it('shows examiner quality sorted by the biggest difference, with a short id when the name is unknown', async () => {
    backend(({ path }) => path.endsWith('/examiner-quality')
      ? json([
        { examinerId: 'aaaaaaaa-0000-4000-8000-000000000001', examinerName: 'Linh Tran', reviewedEssays: 4, averageAbsoluteBandDifference: 0.5, overOneBandRate: 0.25 },
        { examinerId: 'bbbbbbbb-0000-4000-8000-000000000002', examinerName: null, reviewedEssays: 6, averageAbsoluteBandDifference: 1.25, overOneBandRate: 0.5 },
      ])
      : json(page([])))
    show()
    fireEvent.click(await screen.findByRole('button', { name: 'Chất lượng giám khảo' }))

    expect(await screen.findByText('Ít bài thì số liệu chưa đáng tin.')).toBeInTheDocument()
    const rows = screen.getAllByRole('row').slice(1)
    expect(rows[0]).toHaveTextContent('bbbbbbbb')
    expect(rows[0]).toHaveTextContent('1,25')
    expect(rows[0]).toHaveTextContent('50%')
    expect(rows[1]).toHaveTextContent('Linh Tran')
  })
})

describe('ReviewEssayPage', () => {
  beforeEach(() => { calls.length = 0; fetchMock.mockReset(); vi.stubGlobal('fetch', fetchMock); setAccessToken('test-access-token') })
  afterEach(() => { clearAccessToken(); vi.unstubAllGlobals() })

  const open = async () => { show(`/content-author/examiner-review/${jobId}`); await screen.findByText('Some people think...') }
  const select = (label: RegExp | string, value: string) => fireEvent.change(screen.getByLabelText(label), { target: { value } })

  it('shows the prompt, the essay and the blind-grading reminder but no original grade', async () => {
    backend(() => json(essay))
    await open()

    expect(screen.getByText('Discuss both views.')).toBeInTheDocument()
    expect(screen.getByText('Đây là chấm mù. Chấm theo rubric, không cần đoán điểm giám khảo.')).toBeInTheDocument()
    expect(screen.getByText('Rubric tham khảo')).toBeInTheDocument()
    expect(calls[0].path).toBe(`/api/assessments/qa-reviews/${jobId}/essay`)
  })

  it('fills the overall band from the four criteria and still lets the reviewer change it', async () => {
    backend(() => json(essay))
    await open()

    select(/Task Response/, '7')
    select(/Coherence/, '6.5')
    select(/Lexical/, '6.5')
    select(/Grammatical/, '6')
    expect(screen.getByLabelText('Band tổng')).toHaveValue('6.5')

    select('Band tổng', '7')
    expect(screen.getByLabelText('Band tổng')).toHaveValue('7')
  })

  it('submits the contract body and returns to the list', async () => {
    backend(({ method }) => method === 'POST' ? json(null, 204) : json(essay))
    await open()
    select(/Task Response/, '6')
    select(/Coherence/, '6.5')
    select(/Lexical/, '7')
    select(/Grammatical/, '6.5')
    fireEvent.change(screen.getByLabelText(/Ghi chú/), { target: { value: 'Task response is underdeveloped.' } })

    fireEvent.click(screen.getByRole('button', { name: 'Nộp bài chấm lại' }))

    await waitFor(() => expect(screen.getByTestId('location')).toHaveTextContent('/content-author/examiner-review'))
    const post = calls.find((call) => call.method === 'POST')!
    expect(post.path).toBe('/api/assessments/qa-reviews')
    expect(post.body).toEqual({ gradingJobId: jobId, reviewerBand: 6.5, reviewerCriteria: { taskResponse: 6, coherence: 6.5, lexical: 7, grammar: 6.5 }, note: 'Task response is underdeveloped.' })
  })

  it('shows the server message and keeps the form when the review is refused', async () => {
    backend(({ method }) => method === 'POST' ? json({ message: 'Bạn là giám khảo gốc của bài này' }, 403) : json(essay))
    await open()
    fireEvent.change(screen.getByLabelText(/Ghi chú/), { target: { value: 'Giữ lại' } })

    fireEvent.click(screen.getByRole('button', { name: 'Nộp bài chấm lại' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('Bạn là giám khảo gốc của bài này')
    expect(screen.getByLabelText(/Ghi chú/)).toHaveValue('Giữ lại')
    expect(screen.getByTestId('location')).toHaveTextContent(`/content-author/examiner-review/${jobId}`)
    expect(within(document.body).getByRole('button', { name: 'Nộp bài chấm lại' })).toBeEnabled()
  })

  it('rejects an id that is not a UUID without calling the API', () => {
    backend(() => json(essay))
    show('/content-author/examiner-review/not-a-uuid')

    expect(screen.getByRole('alert')).toHaveTextContent('ID bài chấm lại không hợp lệ.')
    expect(calls).toHaveLength(0)
  })
})
