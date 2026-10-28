import { act, fireEvent, render, screen, waitFor, within } from '@/test/render'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { clearAccessToken, setAccessToken } from '@/lib/httpClient'
import { courseId, draftId, knowledgePointId, makeAnalysis, makeCourseDraft, makeStructure, packageId, topicId } from '../testFixtures'
import type { CourseDraft } from '../types'
import { CourseDraftsPage } from './CourseDraftsPage'
import { CourseDraftDetailPage } from './CourseDraftDetailPage'

type Request = { path: string; query: URLSearchParams; method: string; body: unknown }
const requests: Request[] = []
const fetchMock = vi.fn<typeof fetch>()
const base = '/api/content/admin/course-drafts'
const json = (body: unknown, status = 200) => new Response(status === 204 ? null : JSON.stringify(body), { status })
function backend(respond: (request: Request) => Response | Promise<Response>) {
  fetchMock.mockImplementation(async (input, options = {}) => {
    const url = new URL(String(input))
    const request = { path: url.pathname, query: url.searchParams, method: options.method ?? 'GET', body: typeof options.body === 'string' ? JSON.parse(options.body) : options.body }
    requests.push(request)
    if (request.path === '/api/content/admin/packages') return json([])
    if (request.path === '/api/content/knowledge-tree') return json({ nodes: [{ id: knowledgePointId, code: 'KP_PARAPHRASE', name: 'Nhận diện cách diễn đạt', skill: 'READING', kind: 'SKILL', status: 'ACTIVE', cefrLevel: 'C1' }], edges: [] })
    return respond(request)
  })
}
function Location() { const { pathname, search } = useLocation(); return <output data-testid="location">{pathname}{search}</output> }
function show(path = '/content-author/course-drafts') {
  return render(<MemoryRouter initialEntries={[path]}><Routes>
    <Route path="/content-author/course-drafts" element={<CourseDraftsPage />} />
    <Route path="/content-author/course-drafts/:draftId" element={<CourseDraftDetailPage />} />
  </Routes><Location /></MemoryRouter>)
}
async function settle() { await act(async () => { await Promise.resolve() }) }
function readyBackend(draft: CourseDraft = makeCourseDraft()) {
  backend(({ path, method }) => {
    if (path === `/api/content/admin/ai-drafts/${draftId}`) return json(draft)
    if (path === `${base}/${draftId}/analysis`) return json(makeAnalysis())
    throw new Error(`Unexpected ${method} ${path}`)
  })
}
describe('course draft pages through HTTP', () => {
  beforeEach(() => { requests.length = 0; fetchMock.mockReset(); vi.stubGlobal('fetch', fetchMock); setAccessToken('test-access-token') })
  afterEach(() => { clearAccessToken(); vi.unstubAllGlobals(); vi.useRealTimers() })

  it('lists only course drafts, pages the current filter and resets the page when status changes', async () => {
    backend(({ path, method }) => {
      if (path === '/api/content/admin/ai-drafts') return json(Array.from({ length: 20 }, (_, index) => makeCourseDraft({ id: `20000000-0000-4000-8000-${String(index + 10).padStart(12, '0')}` })))
      throw new Error(`Unexpected ${method} ${path}`)
    })
    show()
    await waitFor(() => expect(screen.getByRole('button', { name: 'Trang sau' })).toBeEnabled())
    expect(Object.fromEntries(requests[0]!.query)).toEqual({ kind: 'COURSE', page: '0', size: '20' })
    fireEvent.click(screen.getByRole('button', { name: 'Trang sau' }))
    await waitFor(() => expect(requests.at(-1)?.query.get('page')).toBe('1'))
    fireEvent.change(screen.getByLabelText('Trạng thái bản nháp khóa học'), { target: { value: 'FAILED' } })
    await waitFor(() => expect(Object.fromEntries(requests.at(-1)!.query)).toEqual({ kind: 'COURSE', status: 'FAILED', page: '0', size: '20' }))
  })

  it('creates a handwritten draft with an empty request and navigates without spending AI quota', async () => {
    backend(({ path, method }) => {
      if (path === '/api/content/admin/ai-drafts') return json([])
      if (path === base && method === 'POST') return json(makeCourseDraft(), 201)
      if (path === `/api/content/admin/ai-drafts/${draftId}`) return json(makeCourseDraft())
      if (path === `${base}/${draftId}/analysis`) return json(makeAnalysis())
      throw new Error(`Unexpected ${method} ${path}`)
    })
    show()
    fireEvent.click(screen.getByRole('button', { name: 'Dựng khóa học mới' }))
    expect(await screen.findByRole('heading', { name: 'Bản nháp khóa học' })).toBeInTheDocument()
    const writes = requests.filter((request) => request.method === 'POST')
    expect(writes).toEqual([{ path: base, query: new URLSearchParams(), method: 'POST', body: undefined }])
    expect(screen.getByTestId('location')).toHaveTextContent(`/content-author/course-drafts/${draftId}`)
  })

  it.each([202, 429])('submits the AI form through HTTP and handles status %i', async (status) => {
    const body = { bandLevel: 7, skills: ['READING', 'LISTENING'] as ('READING' | 'LISTENING')[], topics: [], knowledgePointIds: [knowledgePointId], lessonCount: 10, instructions: 'Keep the foundation lessons first.', includePrerequisites: false }
    backend(({ path, method }) => {
      if (path === '/api/content/admin/ai-drafts') return json([])
      if (path === '/api/content/admin/ai-drafts/courses') return status === 429 ? json({ message: 'Quota exceeded', details: { code: 'AI_QUOTA_EXCEEDED' } }, 429) : json(makeCourseDraft({ status: 'QUEUED', request: body, result: null }), 202)
      if (path === `/api/content/admin/ai-drafts/${draftId}`) return json(makeCourseDraft({ status: 'QUEUED', request: body, result: null }))
      throw new Error(`Unexpected ${method} ${path}`)
    })
    show()
    fireEvent.click(screen.getByRole('button', { name: 'Sinh kế hoạch bằng AI' }))
    const form = screen.getByRole('form', { name: 'Sinh bản nháp khóa học' })
    fireEvent.click(within(form).getByRole('radio', { name: '7.0' }))
    fireEvent.click(within(form).getByRole('checkbox', { name: 'Nghe' }))
    fireEvent.click(await within(form).findByRole('button', { name: 'Chọn điểm kiến thức' }))
    const chooser = await screen.findByRole('dialog', { name: 'Chọn điểm kiến thức' })
    fireEvent.click(within(chooser).getByRole('checkbox', { name: /KP_PARAPHRASE/ }))
    fireEvent.click(within(chooser).getByRole('button', { name: 'Lưu' }))
    await waitFor(() => expect(screen.queryByRole('dialog', { name: 'Chọn điểm kiến thức' })).not.toBeInTheDocument())
    fireEvent.change(within(form).getByLabelText('Số bài học'), { target: { value: '10' } })
    fireEvent.change(within(form).getByLabelText(/Hướng dẫn thêm/), { target: { value: body.instructions } })
    fireEvent.submit(form)
    if (status === 429) {
      expect(await screen.findByRole('alert')).toHaveTextContent('Bạn đã dùng hết lượt sinh hôm nay')
      expect(within(form).getByLabelText('Số bài học')).toHaveValue(10)
      expect(within(form).getByLabelText(/Hướng dẫn thêm/)).toHaveValue(body.instructions)
    } else {
      expect(await screen.findByRole('heading', { name: 'Bản nháp khóa học' })).toBeInTheDocument()
      expect(screen.getByTestId('location')).toHaveTextContent(`/content-author/course-drafts/${draftId}`)
    }
    const write = requests.filter((request) => request.path === '/api/content/admin/ai-drafts/courses')
    expect(write).toHaveLength(1)
    expect(write[0]!.body).toEqual(body)
  })

  it('polls queued and generating lists every five seconds and stops after ready', async () => {
    vi.useFakeTimers()
    let reads = 0
    backend(() => json([makeCourseDraft({ status: ['QUEUED', 'GENERATING', 'READY'][Math.min(reads++, 2)] as CourseDraft['status'], result: null })]))
    show()
    await settle()
    await act(async () => { await vi.advanceTimersByTimeAsync(4999) })
    expect(reads).toBe(1)
    await act(async () => { await vi.advanceTimersByTimeAsync(1) })
    expect(reads).toBe(2)
    await act(async () => { await vi.advanceTimersByTimeAsync(5000) })
    expect(reads).toBe(3)
    await act(async () => { await vi.advanceTimersByTimeAsync(15000) })
    expect(reads).toBe(3)
  })

  it('clears list polling when unmounted', async () => {
    vi.useFakeTimers()
    backend(() => json([makeCourseDraft({ status: 'GENERATING', result: null })]))
    const view = show()
    await settle()
    view.unmount()
    await act(async () => { await vi.advanceTimersByTimeAsync(15000) })
    expect(requests).toHaveLength(1)
  })

  it('does not approve an empty course even if the server analysis says valid', async () => {
    readyBackend(makeCourseDraft({ result: { course: null, topics: [], courseTest: null, practiceTestMilestones: [], gaps: [] } }))
    show(`/content-author/course-drafts/${draftId}`)
    await waitFor(() => expect(requests.some((request) => request.path.endsWith('/analysis'))).toBe(true))
    expect(screen.getByRole('button', { name: 'Duyệt khóa học' })).toBeDisabled()
    expect(requests.some((request) => request.path.endsWith('/approve'))).toBe(false)
  })

  it('approves only a saved valid structure and links to inactive content and draft final tests', async () => {
    const draft = makeCourseDraft()
    backend(({ path, method }) => {
      if (path === `/api/content/admin/ai-drafts/${draftId}`) return json(draft)
      if (path === `${base}/${draftId}/analysis`) return json(makeAnalysis({ warnings: [{ code: 'KP_NOT_COVERED', subject: knowledgePointId, related: null }], gaps: [{ knowledgePointId, reason: 'NO_PRACTICE_SET' }] }))
      if (path === `${base}/${draftId}/approve`) { draft.status = 'APPROVED'; return json({ draftId, courseId, topicIds: [topicId], lessonIds: [], finalTestPackageIds: [packageId] }) }
      throw new Error(`Unexpected ${method} ${path}`)
    })
    show(`/content-author/course-drafts/${draftId}`)
    await waitFor(() => expect(screen.getByRole('button', { name: 'Duyệt khóa học' })).toBeEnabled())
    fireEvent.click(screen.getByRole('button', { name: 'Duyệt khóa học' }))
    expect(screen.getByRole('alert')).toHaveTextContent('chưa kích hoạt')
    fireEvent.click(screen.getByRole('button', { name: 'Xác nhận duyệt khóa học' }))
    expect(await screen.findByRole('heading', { name: 'Đã tạo khóa học (chưa kích hoạt)' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Mở Khóa học & chủ đề' })).toHaveAttribute('href', '/content-author/courses')
    expect(screen.getByRole('link', { name: `Hoàn thiện đề cuối ${packageId}` })).toHaveAttribute('href', `/content-author/packages/${packageId}`)
    expect(screen.getByText('Khóa học và chủ đề: Chưa kích hoạt. Bài học và đề cuối: Nháp.')).toBeInTheDocument()
    expect(requests.filter((request) => request.path.endsWith('/approve'))).toHaveLength(1)
    await waitFor(() => expect(screen.queryByRole('button', { name: 'Duyệt khóa học' })).not.toBeInTheDocument())
  })

  describe('saving as the author edits', () => {
    const saveButton = () => screen.queryByRole('button', { name: 'Lưu cấu trúc' })
    const state = () => screen.getByText(/^(Đã lưu|Đang chờ lưu…|Đang lưu…|Chưa lưu được)/)
    const puts = () => requests.filter((request) => request.method === 'PUT')
    const analyses = () => requests.filter((request) => request.path.endsWith('/analysis'))
    const pause = (ms = 1600) => act(async () => { await vi.advanceTimersByTimeAsync(ms) })
    function open(putResponse: (submitted: ReturnType<typeof makeStructure>) => Response | Promise<Response>) {
      vi.useFakeTimers({ shouldAdvanceTime: true })
      backend(({ path, method, body }) => {
        if (path === `/api/content/admin/ai-drafts/${draftId}`) return json(makeCourseDraft())
        if (path === `${base}/${draftId}/analysis`) return json(makeAnalysis())
        if (path === `${base}/${draftId}` && method === 'PUT') return putResponse((body as { structure: ReturnType<typeof makeStructure> }).structure)
        throw new Error(`Unexpected ${method} ${path}`)
      })
      show(`/content-author/course-drafts/${draftId}`)
    }
    const canonical = (submitted: ReturnType<typeof makeStructure>, name = 'Canonical server name') => json(makeCourseDraft({ result: { ...submitted, course: { ...submitted.course!, name } } }))

    it('saves a pause after the last edit with no button, holds approval meanwhile, and takes the server copy when nothing changed since', async () => {
      open((submitted) => canonical(submitted))
      await waitFor(() => expect(screen.getByRole('button', { name: 'Duyệt khóa học' })).toBeEnabled())
      expect(state()).toHaveTextContent('Đã lưu')
      expect(saveButton()).not.toBeInTheDocument()

      fireEvent.change(screen.getByLabelText('Tên khóa học'), { target: { value: 'Edited course' } })
      expect(state()).toHaveTextContent('Đang chờ lưu…')
      expect(screen.getByRole('button', { name: 'Duyệt khóa học' })).toBeDisabled()
      expect(screen.getByRole('button', { name: 'Phân tích lại' })).toBeDisabled()
      await pause(1000)
      expect(puts()).toHaveLength(0)

      await pause(800)
      await waitFor(() => expect(screen.getByLabelText('Tên khóa học')).toHaveValue('Canonical server name'))
      expect(puts()).toHaveLength(1)
      expect(puts()[0]!.body).toEqual({ structure: { ...makeStructure(), course: { ...makeStructure().course!, name: 'Edited course' } } })
      await waitFor(() => expect(analyses()).toHaveLength(2))
      expect(requests.filter((request) => request.path === `/api/content/admin/ai-drafts/${draftId}`)).toHaveLength(1)
      await waitFor(() => expect(screen.getByRole('button', { name: 'Duyệt khóa học' })).toBeEnabled())
      expect(state()).toHaveTextContent('Đã lưu')
    })

    it('keeps what is typed while a save is running, then saves that too', async () => {
      let release: (response: Response) => void = () => undefined
      let first = true
      open((submitted) => {
        if (!first) return canonical(submitted, 'Second save')
        first = false
        return new Promise<Response>((resolve) => { release = (response) => resolve(response) }).then(() => canonical(submitted, 'Server copy of the first edit'))
      })
      await waitFor(() => expect(screen.getByRole('button', { name: 'Duyệt khóa học' })).toBeEnabled())

      fireEvent.change(screen.getByLabelText('Tên khóa học'), { target: { value: 'First edit' } })
      await pause()
      expect(state()).toHaveTextContent('Đang lưu…')
      expect(screen.getByLabelText('Tên khóa học')).toBeEnabled()
      fireEvent.change(screen.getByLabelText('Tên khóa học'), { target: { value: 'Typed during the save' } })
      await act(async () => { release(json({})) })

      expect(screen.getByLabelText('Tên khóa học')).toHaveValue('Typed during the save')
      await pause()
      await waitFor(() => expect(puts()).toHaveLength(2))
      expect((puts()[1]!.body as { structure: ReturnType<typeof makeStructure> }).structure.course!.name).toBe('Typed during the save')
    })

    it('says when it could not save, tells it once, does not keep retrying on its own and retries on request', async () => {
      let fail = true
      open((submitted) => fail ? json({ message: 'Máy chủ bận' }, 503) : canonical(submitted, 'Saved at last'))
      await waitFor(() => expect(screen.getByRole('button', { name: 'Duyệt khóa học' })).toBeEnabled())

      fireEvent.change(screen.getByLabelText('Tên khóa học'), { target: { value: 'Edited course' } })
      await pause()
      await waitFor(() => expect(state()).toHaveTextContent('Chưa lưu được'))
      expect(await screen.findByRole('alert')).toHaveTextContent('Máy chủ bận')
      await pause(6000)
      expect(puts()).toHaveLength(1)
      expect(screen.getByLabelText('Tên khóa học')).toHaveValue('Edited course')

      fail = false
      fireEvent.click(screen.getByRole('button', { name: 'Thử lại' }))
      await waitFor(() => expect(screen.getByLabelText('Tên khóa học')).toHaveValue('Saved at last'))
      expect(puts()).toHaveLength(2)
      expect(state()).toHaveTextContent('Đã lưu')
    })
  })

  it.each([
    { status: 409, code: 'CODE_CONFLICT', detailKey: 'conflicts', issue: { code: 'CODE_TAKEN', subject: 'READING_65', related: 'COURSE' }, label: 'Mã đã được sử dụng' },
    { status: 422, code: 'COURSE_DRAFT_INVALID', detailKey: 'errors', issue: { code: 'PREREQUISITE_ORDER', subject: knowledgePointId, related: 'foundation-kp' }, label: 'Kiến thức nền phải được dạy ở bài trước' },
  ])('shows actionable $status approval errors without retrying or losing the draft', async ({ status, code, detailKey, issue, label }) => {
    backend(({ path, method }) => {
      if (path === `/api/content/admin/ai-drafts/${draftId}`) return json(makeCourseDraft())
      if (path === `${base}/${draftId}/analysis`) return json(makeAnalysis())
      if (path === `${base}/${draftId}/approve`) return json({ message: 'Cannot approve', details: { code, [detailKey]: [issue] } }, status)
      throw new Error(`Unexpected ${method} ${path}`)
    })
    show(`/content-author/course-drafts/${draftId}`)
    await waitFor(() => expect(screen.getByRole('button', { name: 'Duyệt khóa học' })).toBeEnabled())
    fireEvent.click(screen.getByRole('button', { name: 'Duyệt khóa học' }))
    fireEvent.click(screen.getByRole('button', { name: 'Xác nhận duyệt khóa học' }))
    const error = await screen.findByText(new RegExp(label))
    expect(error.closest('[role="alert"]')).toHaveTextContent(issue.subject)
    expect(error.closest('[role="alert"]')).toHaveTextContent(issue.related)
    expect(screen.getByLabelText('Tên khóa học')).toHaveValue('Reading 6.5 course')
    expect(screen.getByLabelText('Tên khóa học')).toBeEnabled()
    expect(requests.filter((request) => request.path.endsWith('/approve'))).toHaveLength(1)
    expect(requests.filter((request) => request.path === `/api/content/admin/ai-drafts/${draftId}`)).toHaveLength(1)
  })

  it('keeps approval disabled when server analysis reports a prerequisite error', async () => {
    backend(({ path, method }) => {
      if (path === `/api/content/admin/ai-drafts/${draftId}`) return json(makeCourseDraft())
      if (path.endsWith('/analysis')) return json(makeAnalysis({ valid: false, errors: [{ code: 'PREREQUISITE_ORDER', subject: knowledgePointId, related: 'foundation-kp' }] }))
      throw new Error(`Unexpected ${method} ${path}`)
    })
    show(`/content-author/course-drafts/${draftId}`)
    const analysis = await screen.findByRole('region', { name: 'Kiểm tra bản nháp' })
    expect(await within(analysis).findByText(/Kiến thức nền phải được dạy ở bài trước/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Duyệt khóa học' })).toBeDisabled()
    expect(screen.queryByRole('link', { name: /Sinh câu hỏi/ })).not.toBeInTheDocument()
    expect(requests.some((request) => request.path.endsWith('/approve'))).toBe(false)
  })

  it('retains a rejected note on failure and sends it exactly once', async () => {
    backend(({ path, method }) => {
      if (path === `/api/content/admin/ai-drafts/${draftId}`) return json(makeCourseDraft())
      if (path.endsWith('/analysis')) return json(makeAnalysis())
      if (path === `/api/content/admin/ai-drafts/${draftId}/reject`) return json({ message: 'Không lưu được ghi chú' }, 503)
      throw new Error(`Unexpected ${method} ${path}`)
    })
    show(`/content-author/course-drafts/${draftId}`)
    const field = await screen.findByLabelText('Ghi chú từ chối')
    const note = '  Cần bổ sung kiến thức nền.\nGiữ nguyên ghi chú.  '
    fireEvent.change(field, { target: { value: note } })
    fireEvent.click(screen.getByRole('button', { name: 'Từ chối bản nháp' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('Không lưu được ghi chú')
    expect(field).toHaveValue(note)
    expect(requests.filter((request) => request.path.endsWith('/reject'))).toEqual([{ path: `/api/content/admin/ai-drafts/${draftId}/reject`, query: new URLSearchParams(), method: 'POST', body: { note } }])
  })

  it.each(['APPROVED', 'REJECTED'] as const)('keeps %s structures read only', async (status) => {
    readyBackend(makeCourseDraft({ status }))
    show(`/content-author/course-drafts/${draftId}`)
    expect(await screen.findByLabelText('Tên khóa học')).toBeDisabled()
    expect(screen.queryByText('Đã lưu')).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Duyệt khóa học' })).not.toBeInTheDocument()
    expect(requests.some((request) => request.path.endsWith('/analysis'))).toBe(false)
    expect(requests.some((request) => request.method === 'PUT')).toBe(false)
  })
})
