import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { clearAccessToken, setAccessToken } from '@/lib/httpClient'
import { GradedReviewPage } from './GradedReviewPage'
import { SpeakingGradingPage } from './SpeakingGradingPage'
import { WritingGradingPage } from './WritingGradingPage'
import { WritingQueuePage } from './WritingQueuePage'

const EXAMINER = '20000000-0000-4000-8000-0000000000e1'
vi.mock('@/features/auth/authSession', () => ({ useAuthSession: () => ({ userId: '20000000-0000-4000-8000-0000000000e1' }) }))

const jobId = '10000000-0000-4000-8000-000000000001'
const otherJob = '10000000-0000-4000-8000-000000000002'
const ESSAY = 'The figure have rose dramatically. Business led in 2010.'

const entry = (overrides = {}) => ({ id: jobId, attemptId: null, attemptType: null, source: 'PRACTICE', skill: 'WRITING', task: 'TASK_2', status: 'QUEUED', reason: 'HUMAN_CREDIT', assignedExaminerId: null, claimedAt: null, createdAt: '2026-10-21T01:00:00Z', waitSeconds: 7200, overdue: false, requestedExaminerId: null, hasDraft: false, ...overrides })
const page = (content: unknown[], totalElements = content.length) => ({ content, page: 0, size: 20, totalElements })
const essay = (overrides = {}) => ({ jobId, attemptId: null, attemptItemId: null, prompt: 'Some people think cities should plant trees.', essay: ESSAY, task: 'TASK_2', rubric: null, source: 'PRACTICE', ...overrides })
const errorType = (overrides = {}) => ({ id: 'e1', code: 'VERB_FORM', name: 'Verb form', category: 'GRAMMAR', severity: 2, knowledgePointId: null, fixHint: 'Check the verb form.', status: 'ACTIVE', reviewStatus: 'DRAFT', ...overrides })
const ERROR_TYPES = [
  errorType(),
  errorType({ id: 'e2', code: 'LINKER_MISUSE', name: 'Linker misuse', category: 'COHERENCE', reviewStatus: 'APPROVED' }),
  errorType({ id: 'e3', code: 'SKIM_FAIL', name: 'Skimming', category: 'READING_STRATEGY' }),
  errorType({ id: 'e4', code: 'OLD_CODE', name: 'Retired', status: 'INACTIVE' }),
]

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
/** A server that holds one job: the learner's essay, a draft if given, and the catalogue. */
function workspaceServer({ draft = null, essayBody = essay(), claim = () => json(entry({ status: 'PROCESSING' })), complete = () => json(null, 204) }: { draft?: unknown; essayBody?: unknown; claim?: () => Response; complete?: () => Response } = {}) {
  backend(({ path, method }) => {
    if (path.endsWith('/claim')) return claim()
    if (path.endsWith('/essay')) return json(essayBody)
    if (path.endsWith('/human-review/draft')) return method === 'PUT' ? json(null, 204) : draft ? json(draft) : json(null, 204)
    if (path.endsWith('/human-review')) return complete()
    if (path === '/api/content/error-types') return json(ERROR_TYPES)
    return json(page([]))
  })
}
function Location() { const { pathname } = useLocation(); return <output data-testid="location">{pathname}</output> }
function show(path = '/admin/grading/writing', state?: unknown) {
  const [pathname, search] = path.split('?')
  return render(<MemoryRouter initialEntries={[{ pathname, search: search ? `?${search}` : '', state }]}><Routes>
    <Route path="/admin/grading/writing" element={<WritingQueuePage />} />
    <Route path="/admin/grading/writing/:jobId" element={<WritingGradingPage />} />
    <Route path="/admin/grading/writing/:jobId/review" element={<GradedReviewPage />} />
    <Route path="/admin/grading/speaking" element={<SpeakingGradingPage />} />
  </Routes><Location /></MemoryRouter>)
}
const setup = () => { calls.length = 0; fetchMock.mockReset(); vi.stubGlobal('fetch', fetchMock); setAccessToken('test-access-token'); window.localStorage.clear() }
const teardown = () => { clearAccessToken(); vi.unstubAllGlobals(); vi.restoreAllMocks() }

const thirdJob = '10000000-0000-4000-8000-000000000003'
const lessonJob = '20000000-0000-4000-8000-000000000002'
const summaryBody = (overrides = {}) => ({ queued: 2, processing: 1, dueSoon: 0, overdue: 1, completedToday: 0, completedThisWeek: 3, receivedToday: 7, dailyLimit: 10, ...overrides })
const profileBody = (overrides = {}) => ({ id: EXAMINER, displayName: 'Lê Hiếu', avatarUrl: null, bio: null, ieltsBand: 8, certificates: [], acceptingSubmissions: true, ...overrides })
/** A server for the queue screen: the two lists, the examiner's numbers and profile, and the profile save. */
const graded = (id: string, overrides = {}) => ({ jobId: id, source: 'PRACTICE', skill: 'WRITING', task: 'TASK_2', band: 6.5, completedAt: '2026-10-26T03:30:00Z', ...overrides })
const gradedReview = (overrides = {}) => ({
  jobId, source: 'PRACTICE', skill: 'WRITING', task: 'TASK_2', prompt: 'Some people think cities should plant trees.', essay: ESSAY, band: 6.5,
  criteria: [{ criterion: 'taskResponse', band: 6, comment: 'Trả lời đủ ý.' }, { criterion: 'grammar', band: 6.5, comment: 'Cần chia động từ.' }],
  errorCodes: ['VERB_FORM'], feedback: 'Bài khá, cần chia động từ.',
  annotations: [{ excerpt: 'have rose', start: 11, end: 20, errorCode: 'VERB_FORM', suggestion: 'have risen' }],
  completedAt: '2026-10-26T03:30:00Z', ...overrides,
})
function queueServer({ queued = [], processing = [], finished = [], summary = summaryBody(), profile = profileBody() }: { queued?: unknown[]; processing?: unknown[]; finished?: unknown[]; summary?: unknown; profile?: unknown } = {}) {
  backend(({ path, query, body }) => {
    if (path === '/api/assessments/examiners/me/summary') return json(summary)
    if (path === '/api/assessments/examiners/me/completed') return json(page(finished))
    if (path === '/api/users/me/examiner-profile') return json({ ...(profile as object), ...(body as object) })
    if (path.startsWith('/api/users/examiners/')) return json(profile)
    return json(page(query.get('status') === 'PROCESSING' ? processing : queued))
  })
}
const rowsOfTable = () => screen.getAllByRole('row').slice(1)

describe('WritingQueuePage', () => {
  beforeEach(setup)
  afterEach(teardown)

  it("lists the examiner's open Writing jobs, nearest deadline first, and never a learner name", async () => {
    queueServer({
      queued: [entry(), entry({ id: otherJob, source: 'LESSON', task: 'TASK_1', waitSeconds: 200000, overdue: true })],
      processing: [entry({ id: thirdJob, status: 'PROCESSING', hasDraft: true, waitSeconds: 10000 })],
    })
    show()

    expect(await screen.findByText('Quá hạn 8 giờ')).toBeInTheDocument()
    const listCalls = calls.filter((call) => call.path === '/api/assessments/grading-jobs')
    expect(listCalls.map((call) => call.query.get('status')).sort()).toEqual(['PROCESSING', 'QUEUED'])
    expect(listCalls.every((call) => call.query.get('mode') === 'HUMAN' && call.query.get('size') === '100')).toBe(true)
    const rows = rowsOfTable()
    expect(rows).toHaveLength(3)
    expect(rows[0]).toHaveTextContent('Writing · Task 1')
    expect(rows[0]).toHaveTextContent('Bài học')
    expect(rows[0]).toHaveTextContent('Quá hạn')
    expect(rows[1]).toHaveTextContent('Đang chấm · có nháp')
    expect(within(rows[1]).getByRole('link', { name: 'Tiếp tục chấm' })).toHaveAttribute('href', `/admin/grading/writing/${thirdJob}`)
    expect(rows[2]).toHaveTextContent('Luyện tập')
    expect(rows[2]).toHaveTextContent('Còn 2 ngày')
    expect(within(rows[2]).getByRole('link', { name: 'Chấm bài' })).toHaveAttribute('href', `/admin/grading/writing/${jobId}`)
    expect(screen.getByText(/bạn không thấy tên học viên/)).toBeInTheDocument()
    expect(screen.queryByText(/Học viên:/)).not.toBeInTheDocument()
  })

  it('does not repeat the dashboard numbers: the tabs count the jobs, one line says what the tabs cannot', async () => {
    queueServer({ queued: [entry()] })
    show()

    const line = await screen.findByRole('status', { name: 'Số liệu hàng đợi' })
    expect(line).toHaveTextContent('Hôm nay đã nhận 7 / 10 bài')
    expect(line).toHaveTextContent('1 bài quá hạn 48 giờ')
    expect(screen.queryByRole('list', { name: 'Số liệu hàng đợi' })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Chờ chấm (1)' })).toBeInTheDocument()
    expect(screen.getByText(/Mỗi ngày bạn nhận tối đa 10 bài mới/)).toBeInTheDocument()
  })

  it('opens on the tab the dashboard linked to', async () => {
    queueServer({ queued: [entry()], processing: [entry({ id: thirdJob, status: 'PROCESSING', hasDraft: true, waitSeconds: 10000 })] })
    const first = show('/admin/grading/writing?tab=processing')
    await screen.findByRole('table')
    expect(screen.getByRole('button', { name: /^Đang chấm/ })).toHaveAttribute('aria-pressed', 'true')
    expect(rowsOfTable()).toHaveLength(1)
    first.unmount()

    show('/admin/grading/writing?tab=queued')
    await screen.findByRole('table')
    expect(screen.getByRole('button', { name: /^Chờ chấm/ })).toHaveAttribute('aria-pressed', 'true')
  })
  it('shows what the examiner already graded on its own tab, newest first, each with a button to read it again', async () => {
    queueServer({ queued: [entry()], finished: [graded(thirdJob, { band: 7 }), graded(lessonJob, { source: 'LESSON' })] })
    show()
    fireEvent.click(await screen.findByRole('button', { name: 'Đã chấm (2)' }))

    const rows = rowsOfTable()
    expect(rows).toHaveLength(2)
    expect(rows[0]).toHaveTextContent('7.0')
    expect(rows[0]).toHaveTextContent('Đã chấm')
    expect(within(rows[0]).getByRole('link', { name: 'Xem lại' })).toHaveAttribute('href', `/admin/grading/writing/${thirdJob}/review`)
    expect(rows[1]).toHaveTextContent('Bài học')
    expect(screen.queryByLabelText('Hạn chấm')).not.toBeInTheDocument()

    fireEvent.change(screen.getByLabelText('Nguồn'), { target: { value: 'LESSON' } })
    expect(rowsOfTable()).toHaveLength(1)
  })

  it('opens on the finished jobs when asked to, and says so when there are none', async () => {
    queueServer({ finished: [] })
    show('/admin/grading/writing?tab=done')

    expect(await screen.findByText('Bạn chưa chấm bài Writing nào')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Đã chấm (0)' })).toHaveAttribute('aria-pressed', 'true')
  })

  it('marks a job that will be late soon, from 36 hours after the learner chose the examiner', async () => {
    queueServer({ queued: [entry(), entry({ id: thirdJob, waitSeconds: 40 * 3600 })] })
    show()

    await screen.findByRole('table')
    const rows = rowsOfTable()
    expect(rows[0]).toHaveTextContent('Sắp quá hạn')
    expect(rows[0]).toHaveTextContent('Còn 8 giờ')
    expect(rows[1]).not.toHaveTextContent('Sắp quá hạn')
    expect(rows[1]).toHaveTextContent('Chờ chấm')
  })

  it('leaves Speaking out and offers no grading link for work that belongs to an exam attempt', async () => {
    queueServer({ queued: [entry({ id: otherJob, skill: 'SPEAKING' }), entry({ attemptId: otherJob, attemptType: 'MOCK', source: 'MOCK' })] })
    show()

    const rows = (await screen.findAllByRole('row')).slice(1)
    expect(rows).toHaveLength(1)
    expect(rows[0]).toHaveTextContent('Thi thử')
    expect(rows[0]).toHaveTextContent('Chưa hỗ trợ')
    expect(within(rows[0]).queryByRole('link')).not.toBeInTheDocument()
    expect(screen.getAllByText(/chưa chấm được trên màn hình này/).length).toBeGreaterThan(0)
  })

  it.each([
    ['overdue', 'Quá hạn (1)', 'Quá hạn'],
    ['due-soon', 'Sắp quá hạn (1)', 'Sắp quá hạn'],
  ])('opens on only the %s jobs when the dashboard sends the examiner there', async (tab, button, badge) => {
    queueServer({
      queued: [
        entry({ id: lessonJob, overdue: true, waitSeconds: 50 * 3600 }),
        entry({ id: thirdJob, waitSeconds: 40 * 3600 }),
        entry({ waitSeconds: 3600 }),
      ],
    })
    show(`/admin/grading/writing?tab=${tab}`)

    await screen.findByRole('table')
    expect(screen.getByRole('button', { name: button })).toHaveAttribute('aria-pressed', 'true')
    expect(rowsOfTable()).toHaveLength(1)
    expect(rowsOfTable()[0]).toHaveTextContent(badge)
  })

  it('offers every source in the filter, lessons included, even when no job comes from it yet', async () => {
    queueServer({ queued: [entry()] })
    show()
    await screen.findByRole('table')

    const options = within(screen.getByLabelText('Nguồn')).getAllByRole('option').map((option) => option.textContent)
    expect(options).toEqual(['Tất cả', 'Bài học', 'Luyện tập'])

    fireEvent.change(screen.getByLabelText('Nguồn'), { target: { value: 'LESSON' } })
    expect(screen.getByText('Không có bài nào khớp bộ lọc')).toBeInTheDocument()
  })

  it('narrows the list by tab, source and job code', async () => {
    queueServer({
      queued: [entry(), entry({ id: lessonJob, source: 'LESSON', waitSeconds: 9000 })],
      processing: [entry({ id: thirdJob, status: 'PROCESSING', waitSeconds: 8000 })],
    })
    show()
    await screen.findByRole('table')
    expect(screen.getByRole('button', { name: 'Tất cả (3)' })).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Đang chấm (1)' }))
    expect(rowsOfTable()).toHaveLength(1)
    expect(rowsOfTable()[0]).toHaveTextContent('Tiếp tục chấm')

    fireEvent.click(screen.getByRole('button', { name: 'Tất cả (3)' }))
    fireEvent.change(screen.getByLabelText('Nguồn'), { target: { value: 'LESSON' } })
    expect(rowsOfTable()).toHaveLength(1)
    expect(rowsOfTable()[0]).toHaveTextContent('Bài học')

    fireEvent.change(screen.getByLabelText('Nguồn'), { target: { value: '' } })
    fireEvent.change(screen.getByLabelText('Tìm theo mã bài'), { target: { value: '#200000' } })
    expect(rowsOfTable()).toHaveLength(1)
    expect(rowsOfTable()[0]).toHaveTextContent('#200000')
    fireEvent.change(screen.getByLabelText('Tìm theo mã bài'), { target: { value: 'khong-co' } })
    expect(screen.getByText('Không có bài nào khớp bộ lọc')).toBeInTheDocument()

    fireEvent.change(screen.getByLabelText('Tìm theo mã bài'), { target: { value: '' } })
    fireEvent.change(screen.getByLabelText('Hạn chấm'), { target: { value: 'DUE_LAST' } })
    expect(rowsOfTable()[0]).toHaveTextContent('Còn 2 ngày')
  })

  it('pages the list ten jobs at a time', async () => {
    const many = Array.from({ length: 12 }, (_, index) => entry({ id: `10000000-0000-4000-8000-00000000${String(1000 + index)}`, waitSeconds: 1000 + index }))
    queueServer({ queued: many })
    show()

    expect(await screen.findByText('Hiển thị 10 / 12 · Trang 1 / 2')).toBeInTheDocument()
    expect(rowsOfTable()).toHaveLength(10)
    fireEvent.click(screen.getByRole('button', { name: 'Sau ›' }))
    expect(screen.getByText('Hiển thị 2 / 12 · Trang 2 / 2')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Sau ›' })).toBeDisabled()
    fireEvent.click(screen.getByRole('button', { name: '‹ Trước' }))
    expect(rowsOfTable()).toHaveLength(10)
  })

  it('has no pause control: the daily limit is enforced when a learner picks the examiner', async () => {
    queueServer()
    show()
    expect(await screen.findByText('Chưa có bài Writing nào chờ bạn chấm')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Tạm dừng' })).not.toBeInTheDocument()
    expect(calls.some((call) => call.path.startsWith('/api/users/examiners/'))).toBe(false)
  })

  it('says so when nothing waits, and when the list cannot be loaded', async () => {
    queueServer()
    const { unmount } = show()
    expect(await screen.findByText('Chưa có bài Writing nào chờ bạn chấm')).toBeInTheDocument()
    unmount()

    backend(() => json({ message: 'Dịch vụ chấm bài đang bận' }, 503))
    show()
    expect(await screen.findByRole('alert')).toHaveTextContent('Dịch vụ chấm bài đang bận')
    expect(screen.getByText(/Không tải được số liệu/)).toBeInTheDocument()
  })

  it('confirms a finished grading when it comes back from the workspace', async () => {
    queueServer()
    show('/admin/grading/writing', { completed: true })

    expect(await screen.findByText(/Đã hoàn tất chấm bài/)).toBeInTheDocument()
  })
})

describe('GradedReviewPage', () => {
  beforeEach(setup)
  afterEach(teardown)
  const open = () => show(`/admin/grading/writing/${jobId}/review`)

  it('shows what the examiner gave, the marked errors and the essay, read-only and without any learner identity', async () => {
    backend(({ path }) => (path === `/api/assessments/examiners/me/completed/${jobId}` ? json(gradedReview()) : json({}, 404)))
    open()

    const result = await screen.findByRole('region', { name: 'Kết quả bạn đã chấm' })
    expect(result).toHaveTextContent('6.5')
    expect(result).toHaveTextContent('Task Response / Achievement')
    expect(result).toHaveTextContent('Trả lời đủ ý.')
    expect(result).toHaveTextContent('Bài khá, cần chia động từ.')
    expect(screen.getByRole('region', { name: 'Đề bài' })).toHaveTextContent('Some people think cities should plant trees.')
    expect(screen.getByRole('region', { name: 'Bài viết của học viên' }).querySelector('mark')).toHaveTextContent('have rose')
    const errors = screen.getByRole('region', { name: 'Các lỗi đã ghi nhận' })
    expect(errors).toHaveTextContent('have rose')
    expect(errors).toHaveTextContent('have risen')
    expect(errors).toHaveTextContent('VERB_FORM')
    expect(screen.getByRole('link', { name: /Về danh sách đã chấm/ })).toHaveAttribute('href', '/admin/grading/writing?tab=done')
    expect(screen.queryByRole('button', { name: /Hoàn tất|Lưu nháp/ })).not.toBeInTheDocument()
    expect(screen.queryByText(/Học viên:/)).not.toBeInTheDocument()
    expect(calls.every((call) => call.method === 'GET')).toBe(true)
  })

  it('shows the chart of a Task 1 prompt under the prompt', async () => {
    backend(() => json(gradedReview({ images: [{ url: 'https://cdn.example/chart.png', altText: 'Bar chart of sales' }] })))
    open()

    const prompt = await screen.findByRole('region', { name: 'Đề bài' })
    expect(within(prompt).getByRole('img', { name: 'Bar chart of sales' })).toHaveAttribute('src', 'https://cdn.example/chart.png')
  })

  it('leaves out the error list when nothing was marked', async () => {
    backend(() => json(gradedReview({ annotations: null, errorCodes: [] })))
    open()

    await screen.findByRole('region', { name: 'Kết quả bạn đã chấm' })
    expect(screen.queryByRole('region', { name: 'Các lỗi đã ghi nhận' })).not.toBeInTheDocument()
  })

  it('says so when the review is not the examiner’s or is not finished', async () => {
    backend(() => json({ message: 'Graded review not found' }, 404))
    open()

    expect(await screen.findByRole('alert')).toBeInTheDocument()
  })
})

describe('SpeakingGradingPage', () => {
  it('says Speaking grading is not open yet', () => {
    show('/admin/grading/speaking')
    expect(screen.getByRole('heading', { name: 'Chấm Speaking' })).toBeInTheDocument()
    expect(screen.getByText('Chấm Speaking chưa mở')).toBeInTheDocument()
  })
})

describe('WritingGradingPage', () => {
  beforeEach(setup)
  afterEach(teardown)

  const open = async () => { show(`/admin/grading/writing/${jobId}`); await screen.findByText(/dramatically/) }
  const band = (label: string, value: string) => fireEvent.change(screen.getByLabelText(`Band ${label}`), { target: { value } })
  const comment = (label: string, value: string) => fireEvent.change(screen.getByLabelText(`Nhận xét ${label}`), { target: { value } })
  const CRITERIA_LABELS = ['Task Response / Achievement', 'Coherence and Cohesion', 'Lexical Resource', 'Grammatical Range and Accuracy']
  const gradeEverything = () => {
    CRITERIA_LABELS.forEach((label, index) => { band(label, ['6', '6.5', '7', '6.5'][index]); comment(label, `Nhận xét ${index + 1}`) })
    fireEvent.change(screen.getByLabelText('Nhận xét chung'), { target: { value: 'Bài khá, cần chia động từ.' } })
  }
  const markError = (excerpt = 'have rose') => {
    fireEvent.change(screen.getByLabelText(/Đoạn có lỗi/), { target: { value: excerpt } })
    fireEvent.change(screen.getByLabelText('Loại lỗi'), { target: { value: 'VERB_FORM' } })
    fireEvent.change(screen.getByLabelText('Gợi ý sửa'), { target: { value: 'have risen' } })
    fireEvent.click(screen.getByRole('button', { name: 'Thêm lỗi' }))
  }

  it('shows the chart the learner saw under the prompt, and opens it full size', async () => {
    workspaceServer({ essayBody: essay({ task: 'TASK_1', images: [{ url: 'https://cdn.example/chart.png', altText: null }] }) })
    await open()

    const chart = within(screen.getByRole('region', { name: 'Đề bài' })).getByRole('img', { name: 'Biểu đồ của đề bài' })
    expect(chart).toHaveAttribute('src', 'https://cdn.example/chart.png')
    expect(chart.closest('a')).toHaveAttribute('href', 'https://cdn.example/chart.png')
  })

  it('takes the job first, then shows the prompt and the essay without any learner identity', async () => {
    workspaceServer()
    await open()

    expect(calls[0].method).toBe('POST')
    expect(calls[0].path).toBe(`/api/assessments/grading-jobs/${jobId}/claim`)
    expect(calls.map((call) => call.path)).toEqual(expect.arrayContaining([`/api/assessments/grading-jobs/${jobId}/essay`, `/api/assessments/grading-jobs/${jobId}/human-review/draft`, '/api/content/error-types']))
    expect(screen.getByText('Some people think cities should plant trees.')).toBeInTheDocument()
    expect(screen.getByText(/Bạn không thấy tên học viên/)).toBeInTheDocument()
    expect(screen.getByRole('region', { name: 'Bài viết của học viên' })).toHaveTextContent(ESSAY)
    expect(screen.queryByText(/Học viên:/)).not.toBeInTheDocument()
  })

  it('offers only the active error kinds that apply to an essay, grouped by kind', async () => {
    workspaceServer()
    await open()

    const kinds = within(screen.getByLabelText('Loại lỗi')).getAllByRole('option').map((option) => option.textContent)
    expect(kinds).toEqual(['Chọn loại lỗi', 'Verb form · VERB_FORM', 'Linker misuse · LINKER_MISUSE'])
    fireEvent.change(screen.getByLabelText('Nhóm lỗi'), { target: { value: 'COHERENCE' } })
    expect(within(screen.getByLabelText('Loại lỗi')).getAllByRole('option').map((option) => option.textContent)).toEqual(['Chọn loại lỗi', 'Linker misuse · LINKER_MISUSE'])
  })

  it('marks an error from a typed quote: it is highlighted, numbered and listed with its correction', async () => {
    workspaceServer()
    await open()

    markError()

    expect(screen.getByText(/Lỗi đã ghi nhận \(1\)/)).toBeInTheDocument()
    const region = screen.getByRole('region', { name: 'Bài viết của học viên' })
    expect(region.querySelector('mark')).toHaveTextContent('have rose')
    expect(screen.getByText('have risen')).toBeInTheDocument()
    expect(screen.getByText('Verb form')).toBeInTheDocument()
    expect(screen.getByLabelText(/Đoạn có lỗi/)).toHaveValue('')
    fireEvent.click(screen.getByRole('button', { name: 'Xóa lỗi 1' }))
    expect(screen.getByText('Chưa ghi nhận lỗi nào.')).toBeInTheDocument()
    expect(region.querySelector('mark')).toBeNull()
  })

  it('shows why an error cannot be marked and keeps what was typed', async () => {
    workspaceServer()
    await open()

    fireEvent.change(screen.getByLabelText(/Đoạn có lỗi/), { target: { value: 'not in the essay' } })
    fireEvent.change(screen.getByLabelText('Loại lỗi'), { target: { value: 'VERB_FORM' } })
    fireEvent.change(screen.getByLabelText('Gợi ý sửa'), { target: { value: 'x' } })
    fireEvent.click(screen.getByRole('button', { name: 'Thêm lỗi' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('Không tìm thấy đoạn này trong bài viết.')
    expect(screen.getByLabelText(/Đoạn có lỗi/)).toHaveValue('not in the essay')
  })

  it('fills the quote from the text the examiner selected in the essay', async () => {
    workspaceServer()
    await open()
    const region = screen.getByRole('region', { name: 'Bài viết của học viên' })
    const text = region.querySelector('span')!.firstChild!
    vi.spyOn(window, 'getSelection').mockReturnValue({
      isCollapsed: false, rangeCount: 1, removeAllRanges: vi.fn(),
      getRangeAt: () => ({ commonAncestorContainer: text, startContainer: text, startOffset: 4, endContainer: text, endOffset: 10 }),
    } as unknown as Selection)

    fireEvent.mouseUp(region)

    expect(screen.getByLabelText(/Đoạn có lỗi/)).toHaveValue('figure')
  })

  it('works the overall band out from the four criteria, with no way to type or pick it, and only allows finishing when ready', async () => {
    workspaceServer()
    await open()
    const finish = screen.getByRole('button', { name: 'Hoàn tất chấm' })
    expect(finish).toBeDisabled()
    expect(screen.getByLabelText('Band tổng')).toHaveTextContent('—')
    expect(screen.getByText(/Chấm đủ 4 tiêu chí, band tổng sẽ tự hiện/)).toBeInTheDocument()

    gradeEverything()

    // The overall band is shown, not an input: nothing to type in, no plus or minus, no quick picks for it.
    const overall = screen.getByLabelText('Band tổng')
    expect(overall).toHaveTextContent('6.5')
    expect(overall.tagName).toBe('OUTPUT')
    expect(screen.queryByRole('textbox', { name: 'Band tổng' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Tăng Band tổng|Giảm Band tổng/ })).not.toBeInTheDocument()
    expect(screen.queryByRole('group', { name: 'Chọn nhanh Band tổng' })).not.toBeInTheDocument()
    // The working is on screen, so the examiner can check it: (6.0 + 6.5 + 7.0 + 6.5) ÷ 4 = 6.5.
    expect(screen.getByText('(6.0 + 6.5 + 7.0 + 6.5) ÷ 4 = 6.5, làm tròn thành 6.5.')).toBeInTheDocument()
    expect(finish).toBeEnabled()
  })

  it('follows the criteria: change one and the overall band changes with it, rounded to the nearest half band', async () => {
    workspaceServer()
    await open()
    gradeEverything()
    expect(screen.getByLabelText('Band tổng')).toHaveTextContent('6.5')

    // Lexical 7.0 → 5.5: (6.0 + 6.5 + 5.5 + 6.5) ÷ 4 = 6.125, which rounds down to 6.0.
    const lexical = screen.getByLabelText('Band Lexical Resource')
    fireEvent.change(lexical, { target: { value: '5.5' } })
    fireEvent.blur(lexical)

    expect(screen.getByLabelText('Band tổng')).toHaveTextContent('6.0')
    expect(screen.getByText('(6.0 + 6.5 + 5.5 + 6.5) ÷ 4 = 6.125, làm tròn thành 6.0.')).toBeInTheDocument()
  })
  it('scores a criterion with the plus and minus buttons, half a band at a time', async () => {
    workspaceServer()
    await open()
    const field = () => screen.getByLabelText('Band Lexical Resource')

    // Nothing is filled in: the box is empty, and the first press is half a band.
    expect(field()).toHaveValue('')
    fireEvent.click(screen.getByRole('button', { name: 'Tăng Band Lexical Resource' }))
    expect(field()).toHaveValue('0.5')

    // A usual band is one click away, then the buttons move from there.
    fireEvent.click(within(screen.getByRole('group', { name: 'Chọn nhanh Band Lexical Resource' })).getByRole('button', { name: '6.0' }))
    expect(field()).toHaveValue('6.0')
    fireEvent.click(screen.getByRole('button', { name: 'Tăng Band Lexical Resource' }))
    expect(field()).toHaveValue('6.5')
    fireEvent.click(screen.getByRole('button', { name: 'Giảm Band Lexical Resource' }))
    fireEvent.click(screen.getByRole('button', { name: 'Giảm Band Lexical Resource' }))
    expect(field()).toHaveValue('5.5')
  })

  it('adds a usual sentence to a comment with one click, and does not add it twice', async () => {
    workspaceServer()
    await open()
    const box = () => screen.getByLabelText('Nhận xét Grammatical Range and Accuracy')
    const group = screen.getByRole('group', { name: 'Gợi ý cho Nhận xét Grammatical Range and Accuracy' })

    fireEvent.click(within(group).getByRole('button', { name: /Còn lỗi chia động từ và thì/ }))
    fireEvent.click(within(group).getByRole('button', { name: /Hay sai mạo từ/ }))
    fireEvent.click(within(group).getByRole('button', { name: /Còn lỗi chia động từ và thì/ }))

    expect(box()).toHaveValue('Còn lỗi chia động từ và thì. Hay sai mạo từ và số ít, số nhiều.')
  })

  it('puts the essay and the scoring side by side with a bar to resize them', async () => {
    workspaceServer()
    await open()

    const bar = screen.getByRole('separator', { name: 'Kéo để đổi độ rộng hai cột' })
    expect(bar).toHaveAttribute('aria-valuenow', '58')
    fireEvent.keyDown(bar, { key: 'ArrowRight' })
    expect(bar).toHaveAttribute('aria-valuenow', '60')
    fireEvent.click(screen.getByRole('button', { name: 'Mở rộng chấm điểm' }))
    expect(bar).toHaveAttribute('aria-valuenow', '36')
    expect(screen.getByRole('region', { name: 'Chấm điểm' })).toBeInTheDocument()
  })

  it('saves a draft with what is filled in so far and says when', async () => {
    workspaceServer()
    await open()
    band('Task Response / Achievement', '6')
    markError()

    fireEvent.click(screen.getByRole('button', { name: 'Lưu nháp' }))

    expect(await screen.findByText(/Đã lưu nháp lúc/)).toBeInTheDocument()
    const put = calls.find((call) => call.method === 'PUT')!
    expect(put.path).toBe(`/api/assessments/grading-jobs/${jobId}/human-review/draft`)
    expect(put.body).toMatchObject({
      band: null, feedback: '', errorCodes: ['VERB_FORM'],
      criteria: [{ criterion: 'taskResponse', band: 6, comment: '' }, { criterion: 'coherence', band: null, comment: '' }, { criterion: 'lexical', band: null, comment: '' }, { criterion: 'grammar', band: null, comment: '' }],
      annotations: [{ excerpt: 'have rose', start: 11, end: 20, errorCode: 'VERB_FORM', suggestion: 'have risen' }],
    })
  })

  it('brings back a saved draft', async () => {
    workspaceServer({ draft: { savedAt: '2026-10-21T13:41:00Z', payload: {
      band: 6.5, feedback: 'Bài khá.',
      criteria: [{ criterion: 'taskResponse', band: 6, comment: 'Trả lời đủ ý.' }, { criterion: 'coherence', band: 6.5, comment: 'Mạch lạc.' }],
      annotations: [{ excerpt: 'have rose', start: 11, end: 20, errorCode: 'VERB_FORM', suggestion: 'have risen' }, { excerpt: 'gone', start: 0, end: 4, errorCode: 'X', suggestion: 'y' }],
    } } })
    await open()

    expect(screen.getByLabelText('Band Task Response / Achievement')).toHaveValue('6.0')
    expect(screen.getByLabelText('Nhận xét Task Response / Achievement')).toHaveValue('Trả lời đủ ý.')
    expect(screen.getByLabelText('Nhận xét chung')).toHaveValue('Bài khá.')
    expect(screen.getByText(/Lỗi đã ghi nhận \(1\)/)).toBeInTheDocument()
    expect(screen.getByText(/Đã lưu nháp lúc/)).toBeInTheDocument()
  })

  it('asks for confirmation, then sends the contract body and returns to the queue', async () => {
    workspaceServer()
    await open()
    markError()
    gradeEverything()

    fireEvent.click(screen.getByRole('button', { name: 'Hoàn tất chấm' }))
    expect(calls.some((call) => call.path.endsWith('/human-review') && call.method === 'POST')).toBe(false)
    fireEvent.click(within(screen.getByRole('group', { name: 'Xác nhận hoàn tất' })).getByRole('button', { name: 'Xác nhận hoàn tất' }))

    await waitFor(() => expect(screen.getByTestId('location')).toHaveTextContent('/admin/grading/writing'))
    expect(await screen.findByText(/Đã hoàn tất chấm bài/)).toBeInTheDocument()
    const post = calls.find((call) => call.method === 'POST' && call.path.endsWith('/human-review'))!
    expect(post.path).toBe(`/api/assessments/grading-jobs/${jobId}/human-review`)
    expect(post.body).toEqual({
      band: 6.5,
      criteria: [
        { criterion: 'taskResponse', band: 6, comment: 'Nhận xét 1' }, { criterion: 'coherence', band: 6.5, comment: 'Nhận xét 2' },
        { criterion: 'lexical', band: 7, comment: 'Nhận xét 3' }, { criterion: 'grammar', band: 6.5, comment: 'Nhận xét 4' },
      ],
      errorCodes: ['VERB_FORM'],
      feedback: 'Bài khá, cần chia động từ.',
      annotations: [{ excerpt: 'have rose', start: 11, end: 20, errorCode: 'VERB_FORM', suggestion: 'have risen' }],
    })
  })

  it('goes back to grading when the examiner does not confirm', async () => {
    workspaceServer()
    await open()
    gradeEverything()

    fireEvent.click(screen.getByRole('button', { name: 'Hoàn tất chấm' }))
    fireEvent.click(screen.getByRole('button', { name: 'Quay lại chấm' }))

    expect(screen.getByRole('button', { name: 'Hoàn tất chấm' })).toBeEnabled()
    expect(screen.queryByRole('group', { name: 'Xác nhận hoàn tất' })).not.toBeInTheDocument()
  })

  it('shows the reason the server refused and keeps everything that was filled in', async () => {
    workspaceServer({ complete: () => json({ message: 'Mã lỗi không có trong danh mục' }, 422) })
    await open()
    markError()
    gradeEverything()

    fireEvent.click(screen.getByRole('button', { name: 'Hoàn tất chấm' }))
    fireEvent.click(screen.getByRole('button', { name: 'Xác nhận hoàn tất' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('Mã lỗi không có trong danh mục')
    expect(screen.getByLabelText('Nhận xét chung')).toHaveValue('Bài khá, cần chia động từ.')
    expect(screen.getByText(/Lỗi đã ghi nhận \(1\)/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Hoàn tất chấm' })).toBeEnabled()
    expect(screen.getByTestId('location')).toHaveTextContent(`/admin/grading/writing/${jobId}`)
  })

  it('stops with the reason when the job cannot be taken, and does not read the essay', async () => {
    workspaceServer({ claim: () => json({ message: 'Bài này đã có giám khảo khác' }, 409) })
    show(`/admin/grading/writing/${jobId}`)

    expect(await screen.findByRole('alert')).toHaveTextContent('Bài này đã có giám khảo khác')
    expect(calls.some((call) => call.path.endsWith('/essay'))).toBe(false)
  })

  it('explains that work belonging to an exam attempt cannot be graded here, and shows no form', async () => {
    workspaceServer({ essayBody: essay({ attemptId: otherJob, attemptItemId: otherJob, source: 'MOCK' }) })
    show(`/admin/grading/writing/${jobId}`)

    expect(await screen.findByRole('alert')).toHaveTextContent('chưa chấm được trên màn hình này')
    expect(screen.queryByRole('button', { name: 'Hoàn tất chấm' })).not.toBeInTheDocument()
  })

  it('rejects an id that is not a UUID without calling the API', () => {
    workspaceServer()
    show('/admin/grading/writing/not-a-uuid')

    expect(screen.getByRole('alert')).toHaveTextContent('ID bài chấm không hợp lệ.')
    expect(calls).toHaveLength(0)
  })
})
