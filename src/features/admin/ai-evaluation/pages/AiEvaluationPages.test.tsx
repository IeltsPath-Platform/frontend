import { act, fireEvent, render, screen, waitFor } from '@/test/render'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { clearAccessToken, setAccessToken } from '@/lib/httpClient'
import { AiEvaluationPage } from './AiEvaluationPage'
import { EvaluationRunPage } from './EvaluationRunPage'

const base = '/api/assessments/admin'
const runId = '10000000-0000-4000-8000-000000000001'
const goldId = '20000000-0000-4000-8000-000000000001'
const activations = [
  { task: 'TASK_1', promptVersion: null, runId: null, activatedAt: null },
  { task: 'TASK_2', promptVersion: 'TASK_2@3+tplv1', runId, activatedAt: '2026-10-20T03:00:00Z' },
]
const row = (overrides = {}) => ({ id: runId, task: 'TASK_2', model: 'm-1', promptVersion: 'TASK_2@3+tplv1', status: 'DONE', n: 12, withinHalfBand: 0.76, mae: 0.4, qwk: 0.64, passed: false, startedAt: '2026-10-22T01:00:00Z', finishedAt: '2026-10-22T01:05:00Z', ...overrides })
const detail = (overrides = {}) => ({
  ...row(), thresholds: { withinHalfBand: 0.8, qwk: 0.6 }, perCriterion: { TR: { n: 12, withinHalfBand: 0.6, mae: 0.7, qwk: 0.5 }, GRA: { n: 12, withinHalfBand: 0.9, mae: 0.3, qwk: 0.7 } },
  errorCodeFalsePositive: 0.1, failureCode: null,
  items: [
    { goldId, llmBand: 6.5, llmCriteria: {}, llmErrorCodes: [], diff: { examinerBand: 6, absoluteBandDifference: 0.5 } },
    { goldId: '20000000-0000-4000-8000-000000000002', llmBand: 5, llmCriteria: {}, llmErrorCodes: [], diff: { examinerBand: 7, absoluteBandDifference: 2 } },
  ], ...overrides,
})
const page = (content: unknown[]) => ({ content, page: 0, size: 20, totalElements: content.length })

type Call = { path: string; query: URLSearchParams; method: string; body: unknown }
const calls: Call[] = []
const fetchMock = vi.fn<typeof fetch>()
const json = (body: unknown, status = 200) => new Response(status === 204 ? null : JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })
function backend(respond: (call: Call) => Response) {
  fetchMock.mockImplementation(async (input, options = {}) => {
    const url = new URL(String(input))
    const call = { path: url.pathname, query: url.searchParams, method: options.method ?? 'GET', body: typeof options.body === 'string' ? JSON.parse(options.body) : options.body }
    calls.push(call)
    if (call.path === `${base}/ai-prompt-activations` && call.method === 'GET') return json(activations)
    return respond(call)
  })
}
function Location() { const { pathname } = useLocation(); return <output data-testid="location">{pathname}</output> }
function show(path = '/content-author/ai-evaluation') {
  return render(<MemoryRouter initialEntries={[path]}><Routes>
    <Route path="/content-author/ai-evaluation" element={<AiEvaluationPage />} />
    <Route path="/content-author/ai-evaluation/runs/:runId" element={<EvaluationRunPage />} />
  </Routes><Location /></MemoryRouter>)
}
async function settle() { await act(async () => { await Promise.resolve() }) }

describe('AiEvaluationPage', () => {
  beforeEach(() => { calls.length = 0; fetchMock.mockReset(); vi.stubGlobal('fetch', fetchMock); setAccessToken('test-access-token') })
  afterEach(() => { clearAccessToken(); vi.unstubAllGlobals(); vi.useRealTimers() })

  it('warns that a task has not been validated and names the version a validated task uses', async () => {
    backend(() => json(page([])))
    show()

    expect(await screen.findByText(/Task 1 chưa được kiểm định\. AI đang chấm học viên bằng rubric hiện tại/)).toBeInTheDocument()
    expect(screen.getByText(/Task 2 đang dùng bản TASK_2@3\+tplv1/)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Xem lượt đánh giá' })).toHaveAttribute('href', `/content-author/ai-evaluation/runs/${runId}`)
  })

  it('lists the gold set of a task with the examiner band and where it came from', async () => {
    backend(() => json(page([{ id: goldId, task: 'TASK_2', examinerBand: 6.5, source: 'COMPARISON', essayPreview: 'Some people think', createdAt: '2026-10-22T01:00:00Z' }])))
    show()

    expect(await screen.findByText('Bài đối chiếu')).toBeInTheDocument()
    expect(screen.getByText('Some people think')).toBeInTheDocument()
    fireEvent.change(screen.getByLabelText('Lọc theo Task'), { target: { value: 'TASK_1' } })
    await waitFor(() => expect(calls.at(-1)?.query.get('task')).toBe('TASK_1'))
  })

  it('needs chart facts for a Task 1 gold essay and sends the form as the contract describes', async () => {
    backend(({ path, method }) => method === 'POST' && path === `${base}/ai-gold-essays` ? json({ id: goldId }, 201) : json(page([])))
    show()
    fireEvent.click(await screen.findByRole('button', { name: 'Thêm bài chuẩn' }))
    fireEvent.change(screen.getByLabelText('Task bài chuẩn'), { target: { value: 'TASK_1' } })
    fireEvent.change(screen.getByLabelText('Đề bài'), { target: { value: 'Describe the chart.' } })
    fireEvent.change(screen.getByLabelText('Bài viết chuẩn'), { target: { value: 'The chart shows...' } })
    fireEvent.change(screen.getByLabelText('Số liệu biểu đồ (bắt buộc)'), { target: { value: '   ' } })

    fireEvent.click(screen.getByRole('button', { name: 'Lưu bài chuẩn' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('Task 1 cần số liệu biểu đồ')
    expect(calls.some((call) => call.method === 'POST')).toBe(false)

    fireEvent.change(screen.getByLabelText('Số liệu biểu đồ (bắt buộc)'), { target: { value: 'Sales rose from 10 to 30.' } })
    fireEvent.click(screen.getByRole('button', { name: 'Lưu bài chuẩn' }))

    await waitFor(() => expect(calls.some((call) => call.method === 'POST')).toBe(true))
    expect(calls.find((call) => call.method === 'POST')!.body).toEqual({ task: 'TASK_1', prompt: 'Describe the chart.', chartFacts: 'Sales rose from 10 to 30.', essay: 'The chart shows...', examinerBand: 6.5 })
  })

  it('imports the comparisons and reports how many essays were added', async () => {
    backend(({ path, method }) => method === 'POST' && path.endsWith('/import-comparisons') ? json({ imported: 3 }) : json(page([])))
    show()

    fireEvent.click(await screen.findByRole('button', { name: /Nhập từ các bài AI và giám khảo/ }))

    expect(await screen.findByText('Đã nhập 3 bài')).toBeInTheDocument()
  })

  it('starts an evaluation for the chosen task and opens the run', async () => {
    backend(({ path, method }) => {
      if (method === 'POST' && path === `${base}/ai-evaluations`) return json({ id: runId }, 202)
      if (path === `${base}/ai-evaluations/${runId}`) return json(detail({ status: 'RUNNING', passed: null, withinHalfBand: null, qwk: null }))
      return json(page([]))
    })
    show()
    fireEvent.click(await screen.findByRole('button', { name: 'Các lượt đánh giá' }))
    fireEvent.change(await screen.findByLabelText('Task cần đánh giá'), { target: { value: 'TASK_1' } })

    fireEvent.click(screen.getByRole('button', { name: 'Chạy đánh giá' }))

    await waitFor(() => expect(screen.getByTestId('location')).toHaveTextContent(`/runs/${runId}`))
    expect(calls.find((call) => call.method === 'POST')!.body).toEqual({ task: 'TASK_1' })
  })

  it('reloads runs every five seconds while one is running and stops when it is done', async () => {
    vi.useFakeTimers()
    let runs = 0
    backend(({ path }) => {
      if (path === `${base}/ai-evaluations`) { runs += 1; return json(page([row(runs < 3 ? { status: 'RUNNING', passed: null, withinHalfBand: null, qwk: null } : {})])) }
      return json(page([]))
    })
    show()
    await settle()
    fireEvent.click(screen.getByRole('button', { name: 'Các lượt đánh giá' }))
    await settle()
    expect(runs).toBe(1)
    expect(screen.getByText('Đang chạy')).toBeInTheDocument()

    await act(async () => { await vi.advanceTimersByTimeAsync(5000) })
    expect(runs).toBe(2)
    await act(async () => { await vi.advanceTimersByTimeAsync(5000) })
    expect(runs).toBe(3)
    expect(screen.getByText('Đã xong')).toBeInTheDocument()
    await act(async () => { await vi.advanceTimersByTimeAsync(20000) })
    expect(runs).toBe(3)
  })
})

describe('EvaluationRunPage', () => {
  beforeEach(() => { calls.length = 0; fetchMock.mockReset(); vi.stubGlobal('fetch', fetchMock); setAccessToken('test-access-token') })
  afterEach(() => { clearAccessToken(); vi.unstubAllGlobals() })

  it('compares each metric with its threshold and sorts the essays by the biggest difference', async () => {
    backend(() => json(detail()))
    show(`/content-author/ai-evaluation/runs/${runId}`)

    expect(await screen.findByText(/Lệch không quá 0,5 band: 76% \(cần ≥ 80%\)/)).toBeInTheDocument()
    expect(screen.getByText(/Độ đồng thuận QWK: 0\.64 \(cần ≥ 0\.60\)/)).toBeInTheDocument()
    expect(screen.getByText('TR')).toBeInTheDocument()
    const rows = screen.getAllByRole('row')
    const essays = rows.filter((candidate) => candidate.textContent?.includes('20000000'))
    expect(essays[0]).toHaveTextContent('2')
    expect(screen.getByText(/sửa mô tả band ở/)).toBeInTheDocument()
  })

  it('does not allow activating a run that did not pass', async () => {
    backend(() => json(detail({ passed: false })))
    show(`/content-author/ai-evaluation/runs/${runId}`)

    expect(await screen.findByRole('button', { name: 'Kích hoạt bản này' })).toBeDisabled()
  })

  it('asks for confirmation and activates a passed run', async () => {
    let activated = false
    backend(({ path, method }) => {
      if (method === 'POST' && path === `${base}/ai-prompt-activations`) { activated = true; return json(null, 204) }
      return json(detail({ passed: true, withinHalfBand: 0.85 }))
    })
    show(`/content-author/ai-evaluation/runs/${runId}`)
    fireEvent.click(await screen.findByRole('button', { name: 'Kích hoạt bản này' }))
    expect(screen.getByText(/mọi bài Writing của học viên/)).toBeInTheDocument()
    expect(activated).toBe(false)

    fireEvent.click(screen.getByRole('button', { name: 'Xác nhận kích hoạt' }))

    expect(await screen.findByText(/Đã kích hoạt bản chấm/)).toBeInTheDocument()
    expect(calls.find((call) => call.method === 'POST')!.body).toEqual({ runId })
  })

  it('explains the refusal when the server says the run has not passed', async () => {
    backend(({ method }) => method === 'POST' ? json({ message: 'x', details: { code: 'EVALUATION_NOT_PASSED' } }, 409) : json(detail({ passed: true })))
    show(`/content-author/ai-evaluation/runs/${runId}`)
    fireEvent.click(await screen.findByRole('button', { name: 'Kích hoạt bản này' }))
    fireEvent.click(screen.getByRole('button', { name: 'Xác nhận kích hoạt' }))

    await waitFor(() => expect(screen.getAllByRole('alert').map((alert) => alert.textContent)).toContain('Lượt này chưa đạt nên không kích hoạt được.'))
  })

  it('says so when a run failed', async () => {
    backend(() => json(detail({ status: 'FAILED', passed: null, failureCode: 'NOT_CONFIGURED' })))
    show(`/content-author/ai-evaluation/runs/${runId}`)

    expect(await screen.findByText(/Không hoàn thành đánh giá \(NOT_CONFIGURED\)/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Kích hoạt bản này' })).toBeDisabled()
  })
})
