import { fireEvent, render, screen, waitFor, within } from '@/test/render'
import { answerConfirm } from '@/test/confirm'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { clearAccessToken, setAccessToken } from '@/lib/httpClient'
import { courseId, draftId, makeCatalogPackage, makePackage, packageId, sectionId, sectionRequest, topicId } from '../testFixtures'
import { PackageEditorPage } from './PackageEditorPage'
import { PackagesPage } from './PackagesPage'

type Request = { path: string; query: URLSearchParams; method: string; body: unknown; options: RequestInit }
const requests: Request[] = []
const fetchMock = vi.fn<typeof fetch>()
const base = `/api/content/admin/packages/${packageId}`
const sectionBase = `${base}/versions/${draftId}/sections/${sectionId}`
const json = (value: unknown, status = 200) => new Response(status === 204 ? null : JSON.stringify(value), { status, headers: { 'Content-Type': 'application/json' } })
function backend(respond: (request: Request) => Response | Promise<Response>) {
  fetchMock.mockImplementation(async (input, options = {}) => {
    const url = new URL(String(input))
    const request: Request = { path: url.pathname, query: url.searchParams, method: options.method ?? 'GET', body: typeof options.body === 'string' ? JSON.parse(options.body) : options.body, options }
    requests.push(request)
    return respond(request)
  })
}
function Location() { const { pathname, search } = useLocation(); return <output data-testid="location">{pathname}{search}</output> }
function show(path = `/content-author/packages/${packageId}`) {
  return render(<MemoryRouter initialEntries={[path]}><Routes>
    <Route path="/content-author/packages" element={<PackagesPage />} />
    <Route path="/content-author/packages/:packageId" element={<PackageEditorPage />} />
  </Routes><Location /></MemoryRouter>)
}
describe('package authoring through HTTP', () => {
  beforeEach(() => { requests.length = 0; fetchMock.mockReset(); vi.stubGlobal('fetch', fetchMock); setAccessToken('test-access-token') })
  afterEach(() => { clearAccessToken(); vi.unstubAllGlobals(); vi.restoreAllMocks() })

  it('loads rich detail and saves section metadata through authenticated HTTP without losing fields', async () => {
    const pkg = structuredClone(makePackage())
    backend(({ path, method, body }) => {
      if (path === base && method === 'GET') return json(pkg)
      if (path === `${base}/publication-schedules`) return json([])
      if (path === sectionBase && method === 'PUT') {
        Object.assign(pkg.versions[1]!.sections[0]!, body)
        return json({ ...pkg.versions[1]!.sections[0]!, passage: null, audio: null, questions: [] })
      }
      throw new Error(`Unexpected request ${method} ${path}`)
    })
    show()
    fireEvent.click(await screen.findByRole('button', { name: 'Sửa Reading One' }))
    const form = screen.getByRole('form', { name: 'Sửa phần Reading One' })
    fireEvent.change(within(form).getByLabelText('Tiêu đề phần'), { target: { value: 'Revised via HTTP' } })
    fireEvent.submit(form)
    await waitFor(() => expect(requests.filter((request) => request.path === sectionBase && request.method === 'PUT')).toHaveLength(1))
    const write = requests.find((request) => request.method === 'PUT')!
    expect(write.body).toEqual({ ...sectionRequest, title: 'Revised via HTTP' })
    expect(write.options).toMatchObject({ credentials: 'include', headers: { Authorization: 'Bearer test-access-token', 'Content-Type': 'application/json' } })
    expect(await screen.findByRole('article', { name: 'Revised via HTTP' })).toBeInTheDocument()
    expect(requests.filter((request) => request.path === base && request.method === 'GET')).toHaveLength(2)
  })

  it.each(['TOPIC_TEST', 'COURSE_TEST'] as const)('filters the catalog and creates a %s with an empty draft before navigating', async (packageType) => {
    const pkg = structuredClone(makePackage([]))
    pkg.title = 'Final test created through HTTP'
    pkg.code = 'FINAL_HTTP'
    pkg.status = 'DRAFT'
    pkg.currentPublishedVersionId = null
    backend(({ path, method, body }) => {
      if (path === '/api/content/admin/packages' && method === 'GET') return json([makeCatalogPackage()])
      if (path === '/api/content/courses') return json([{ id: courseId, code: 'FOUNDATION', name: 'Foundation course', bandLevel: 5.5, status: 'ACTIVE', createdAt: '', updatedAt: '' }])
      if (path === '/api/content/topics') return json([{ id: topicId, code: 'READING', name: 'Reading topic', courseId, children: [] }])
      if (path === '/api/content/practice-tests/sources' || path === `/api/content/admin/topics/${topicId}/lessons`) return json([])
      if (path === '/api/content/admin/packages' && method === 'POST') { Object.assign(pkg, body); return json(pkg, 201) }
      if (path === `${base}/versions` && method === 'POST') {
        const version = { ...structuredClone(makePackage().versions[1]!), versionNumber: 1, sections: [] }
        pkg.versions.push(version)
        return json(version, 201)
      }
      if (path === base && method === 'GET') return json(pkg)
      if (path === `${base}/publication-schedules`) return json([])
      throw new Error(`Unexpected request ${method} ${path}`)
    })
    show('/content-author/packages')
    expect(await screen.findByRole('link', { name: /Reading practice/ })).toBeInTheDocument()
    fireEvent.change(screen.getByRole('combobox', { name: /Loại gói/ }), { target: { value: packageType } })
    await waitFor(() => expect(requests.filter((request) => request.path === '/api/content/admin/packages').at(-1)?.query.get('type')).toBe(packageType))
    fireEvent.click(screen.getByRole('button', { name: /Tạo gói mới|Gói mới/ }))
    const form = screen.getByRole('form', { name: 'Tạo gói câu hỏi' })
    fireEvent.change(within(form).getByLabelText('Mã gói'), { target: { value: 'FINAL_HTTP' } })
    fireEvent.change(within(form).getByLabelText('Tiêu đề gói'), { target: { value: pkg.title } })
    fireEvent.change(within(form).getByLabelText('Loại gói'), { target: { value: packageType } })
    await waitFor(() => expect(within(form).getByLabelText('Khóa học')).toBeEnabled())
    fireEvent.change(within(form).getByLabelText('Khóa học'), { target: { value: courseId } })
    if (packageType === 'TOPIC_TEST') {
      await waitFor(() => expect(within(form).getByLabelText('Chủ đề')).toBeEnabled())
      fireEvent.change(within(form).getByLabelText('Chủ đề'), { target: { value: topicId } })
    }
    fireEvent.submit(form)
    expect(await screen.findByRole('heading', { name: pkg.title })).toBeInTheDocument()
    expect(await screen.findByText('Phiên bản chưa có phần nào')).toBeInTheDocument()
    const writes = requests.filter((request) => request.method === 'POST')
    expect(writes).toHaveLength(2)
    expect(writes[0]!.path).toBe('/api/content/admin/packages')
    expect(writes[0]!.body).toEqual({ code: 'FINAL_HTTP', title: pkg.title, packageType, accessLevel: 'FREE', lessonId: null, sourceCode: null, topicId: packageType === 'TOPIC_TEST' ? topicId : null, courseId: packageType === 'COURSE_TEST' ? courseId : null })
    expect(writes[1]).toMatchObject({ path: `${base}/versions`, body: { rulesJson: '{}' } })
    expect(screen.getByTestId('location')).toHaveTextContent(`/content-author/packages/${packageId}`)
  })

  it('saves passage and audio, then adds, reorders and removes section questions through the real API client', async () => {
    const pkg = structuredClone(makePackage())
    pkg.packageType = 'PRACTICE_TEST'
    const current = pkg.versions[1]!.sections[0]!
    const questionId = '00000000-0000-4000-8000-000000000030'
    const questionVersionId = '00000000-0000-4000-8000-000000000031'
    const linkId = '00000000-0000-4000-8000-000000000032'
    backend(({ path, method, body, query }) => {
      if (path === base && method === 'GET') return json(pkg)
      if (path === `${base}/publication-schedules`) return json([])
      if (path === `${sectionBase}/passage` && method === 'PUT') { current.passage = (body as { text: string }).text; return json({ passage: current.passage }) }
      if (path === `${sectionBase}/audio` && method === 'PUT') {
        current.audio = { assetId: sectionId, mediaUrl: 'https://media.example/test.mp3', ...(body as { mediaReference: string; durationSeconds: number; transcript: string | null }) }
        return json(current.audio)
      }
      if (path === '/api/content/admin/questions' && method === 'GET') {
        expect(query.get('purpose')).toBe('EXAM')
        expect(query.get('status')).toBe('PUBLISHED')
        return json({ content: [{ id: questionId, questionType: 'MULTIPLE_CHOICE', skill: 'READING', status: 'PUBLISHED', purpose: 'EXAM', currentPublishedVersionId: questionVersionId }], page: 0, size: 100, totalElements: 1, totalPages: 1 })
      }
      if (path === `${sectionBase}/questions` && method === 'POST') {
        const linked = { id: linkId, questionVersionId, questionId, stem: 'A second question from the bank', purpose: 'EXAM', status: 'PUBLISHED', sortOrder: 2, maxScore: (body as { maxScore: number }).maxScore }
        current.questions.push(linked)
        return json({ ...linked, questionId: null, stem: null, purpose: null, status: null }, 201)
      }
      if (path === `${sectionBase}/questions/order` && method === 'PUT') {
        const ids = (body as { sectionQuestionIds: string[] }).sectionQuestionIds
        current.questions.forEach((question) => { question.sortOrder = ids.indexOf(question.id) + 1 })
        return json(null, 204)
      }
      if (path === `${sectionBase}/questions/${linkId}` && method === 'DELETE') { current.questions = current.questions.filter((question) => question.id !== linkId); return json(null, 204) }
      throw new Error(`Unexpected request ${method} ${path}`)
    })
    show()
    const passage = await screen.findByLabelText('Nội dung đoạn văn')
    fireEvent.change(passage, { target: { value: '  Passage saved through HTTP.  ' } })
    fireEvent.submit(screen.getByRole('form', { name: 'Đoạn văn của Reading One' }))
    await waitFor(() => expect(requests.filter((request) => request.path === base)).toHaveLength(2))
    expect(requests.find((request) => request.path === `${sectionBase}/passage`)!.body).toEqual({ text: '  Passage saved through HTTP.  ' })
    fireEvent.click(screen.getByText('Dùng file có sẵn'))
    fireEvent.change(screen.getByLabelText('Key audio'), { target: { value: 'listening/demo/ls1.mp3' } })
    fireEvent.change(screen.getByLabelText('Thời lượng audio (giây)'), { target: { value: '45' } })
    fireEvent.change(screen.getByLabelText('Transcript (tùy chọn)'), { target: { value: 'Author transcript' } })
    fireEvent.submit(screen.getByRole('form', { name: 'Audio của Reading One' }))
    await waitFor(() => expect(requests.filter((request) => request.path === base)).toHaveLength(3))
    expect(requests.find((request) => request.path === `${sectionBase}/audio`)!.body).toEqual({ mediaReference: 'listening/demo/ls1.mp3', durationSeconds: 45, transcript: 'Author transcript' })
    fireEvent.click(screen.getByRole('button', { name: 'Thêm câu hỏi' }))
    fireEvent.click(await screen.findByRole('checkbox'))
    fireEvent.change(screen.getByLabelText('Điểm tối đa'), { target: { value: '2' } })
    fireEvent.submit(screen.getByRole('form', { name: 'Thêm câu hỏi vào Reading One' }))
    expect(await screen.findByText('A second question from the bank')).toBeInTheDocument()
    expect(requests.find((request) => request.path === `${sectionBase}/questions` && request.method === 'POST')!.body).toEqual({ questionVersionId, maxScore: 2 })
    fireEvent.click(screen.getByRole('button', { name: 'Đưa câu 2 lên' }))
    await waitFor(() => expect(requests.filter((request) => request.path === `${sectionBase}/questions/order`)).toHaveLength(1))
    expect(requests.find((request) => request.path === `${sectionBase}/questions/order`)!.body).toEqual({ sectionQuestionIds: [linkId, current.questions.find((question) => question.id !== linkId)!.id] })
    await waitFor(() => expect(screen.getByRole('button', { name: 'Gỡ câu 1' })).toBeEnabled())
    fireEvent.click(screen.getByRole('button', { name: 'Gỡ câu 1' }))
    await answerConfirm(true)
    await waitFor(() => expect(screen.queryByText('A second question from the bank')).not.toBeInTheDocument())
    expect(requests.filter((request) => request.path === `${sectionBase}/questions/${linkId}` && request.method === 'DELETE')).toHaveLength(1)
  })

  it('previews author answers, schedules in UTC, cancels, and publishes a final test with confirmation', async () => {
    const pkg = structuredClone(makePackage())
    pkg.packageType = 'TOPIC_TEST'; pkg.topicId = topicId
    const version = pkg.versions[1]!
    const questionVersionId = version.sections[0]!.questions[0]!.questionVersionId
    let publishAt: string | null = null
    backend(({ path, method, body }) => {
      if (path === base && method === 'GET') return json(pkg)
      if (path === `${base}/publication-schedules`) return json(publishAt ? [{ packageId, versionId: draftId, publishAt, lastPublishError: null }] : [])
      if (path === `${base}/versions/${draftId}/preview`) return json({
        packageVersionId: draftId, packageId, packageType: 'TOPIC_TEST', topicId, rules: {},
        sections: [{ sectionId, title: 'Learner reading view', skill: 'READING', instructions: 'Read and answer.', sortOrder: 1, passage: 'Preview passage', audio: null,
          items: [{ questionVersionId, sortOrder: 1, stem: 'Preview question', options: { A: 'Correct option', B: 'Other option' }, hint: null, maxScore: 1, knowledgePointMappings: [] }] }],
        answers: [{ sectionId, audioTranscript: 'Author transcript', items: [{ questionVersionId, answerSpec: { type: 'CHOICE', correct: 'A' }, explanation: 'Author explanation', hint: null }] }],
      })
      if (path === `${base}/versions/${draftId}/schedule` && method === 'PUT') { publishAt = (body as { publishAt: string }).publishAt; version.publishAt = publishAt; return json({ packageId, versionId: draftId, publishAt, lastPublishError: null }) }
      if (path === `${base}/versions/${draftId}/schedule` && method === 'DELETE') { publishAt = null; version.publishAt = null; return json(null, 204) }
      if (path === `/api/content/packages/${packageId}/publish` && method === 'POST') { pkg.status = 'PUBLISHED'; pkg.currentPublishedVersionId = draftId; version.status = 'PUBLISHED'; return json(pkg) }
      throw new Error(`Unexpected request ${method} ${path}`)
    })
    show()
    fireEvent.click(await screen.findByRole('button', { name: 'Xem trước' }))
    const preview = await screen.findByRole('region', { name: 'Xem trước gói' })
    expect(await within(preview).findByText('Preview question')).toBeInTheDocument()
    expect(within(preview).getByText('Đáp án đúng: A')).not.toBeVisible()
    fireEvent.click(within(preview).getByText('Đáp án và giải thích'))
    expect(within(preview).getByText('Đáp án đúng: A')).toBeVisible()
    expect(within(preview).getByText('Author explanation')).toBeVisible()
    expect(within(preview).getByText('Transcript: Author transcript')).toBeVisible()
    fireEvent.click(within(preview).getByRole('button', { name: 'Đóng xem trước' }))
    const localTime = '2099-01-02T03:04'
    fireEvent.change(screen.getByLabelText('Thời gian xuất bản (giờ địa phương)'), { target: { value: localTime } })
    fireEvent.submit(screen.getByRole('form', { name: 'Lên lịch xuất bản' }))
    const cancel = await screen.findByRole('button', { name: 'Hủy lịch' })
    await waitFor(() => expect(cancel).toBeEnabled())
    expect(requests.find((request) => request.path.endsWith('/schedule') && request.method === 'PUT')!.body).toEqual({ publishAt: new Date(localTime).toISOString() })
    fireEvent.click(cancel)
    await waitFor(() => expect(screen.queryByRole('button', { name: 'Hủy lịch' })).not.toBeInTheDocument())
    await waitFor(() => expect(screen.getByRole('button', { name: 'Xuất bản ngay' })).toBeEnabled())
    fireEvent.click(screen.getByRole('button', { name: 'Xuất bản ngay' }))
    const popup = await answerConfirm(false)
    expect(popup).toHaveTextContent('học viên thi lại sẽ có thể nhận đề này')
    expect(requests.filter((request) => request.path.endsWith('/publish'))).toHaveLength(0)
    fireEvent.click(screen.getByRole('button', { name: 'Xuất bản ngay' }))
    await answerConfirm(true)
    expect(await screen.findByRole('heading', { name: 'Bản 2 · Đã xuất bản' })).toBeInTheDocument()
    expect(requests.filter((request) => request.path.endsWith('/publish'))).toHaveLength(1)
    expect(requests.find((request) => request.path.endsWith('/publish'))!.body).toEqual({ versionId: draftId })
    expect(screen.queryByRole('button', { name: 'Xuất bản ngay' })).not.toBeInTheDocument()
  })

  it('translates storage upload failures and retains the selected audio file without attaching it', async () => {
    backend(({ path, method }) => {
      if (path === base && method === 'GET') return json(makePackage())
      if (path === `${base}/publication-schedules`) return json([])
      if (path === '/api/content/admin/media/audio' && method === 'POST') return json({ message: 'Storage disabled', details: { code: 'STORAGE_UNAVAILABLE' } }, 503)
      throw new Error(`Unexpected request ${method} ${path}`)
    })
    show()
    const input = await screen.findByLabelText('File audio')
    const file = new File(['ID3-test-audio'], 'sample.mp3', { type: 'audio/mpeg' })
    fireEvent.change(input, { target: { files: [file] } })
    fireEvent.click(screen.getByRole('button', { name: 'Tải file audio' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('Kho lưu trữ chưa sẵn sàng, thử lại sau')
    const upload = requests.find((request) => request.path === '/api/content/admin/media/audio')!
    expect(upload.options.body).toBeInstanceOf(FormData)
    expect((upload.options.body as FormData).get('file')).toEqual(file)
    expect(upload.options.headers).not.toHaveProperty('Content-Type')
    expect((input as HTMLInputElement).files?.[0]).toBe(file)
    expect(requests.some((request) => request.path === `${sectionBase}/audio`)).toBe(false)
  })

  it('translates publication validation failures and leaves the draft editable without retrying', async () => {
    backend(({ path, method }) => {
      if (path === base && method === 'GET') return json(makePackage())
      if (path === `${base}/publication-schedules`) return json([{ packageId, versionId: draftId, publishAt: null, lastPublishError: 'QUESTION_ALREADY_USED' }])
      if (path === `/api/content/packages/${packageId}/publish` && method === 'POST') return json({ message: 'Wrong purpose', details: { code: 'QUESTION_PURPOSE_MISMATCH' } }, 422)
      throw new Error(`Unexpected request ${method} ${path}`)
    })
    show()
    await waitFor(() => expect(screen.getByRole('button', { name: 'Xuất bản ngay' })).toBeEnabled())
    expect(screen.getByText('Có câu đã thuộc một đề khác đã xuất bản')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Xuất bản ngay' }))
    await answerConfirm(true)
    expect(await screen.findByRole('alert')).toHaveTextContent('Có câu sai mục đích với loại đề')
    expect(screen.getByRole('button', { name: 'Sửa Reading One' })).toBeEnabled()
    expect(requests.filter((request) => request.path.endsWith('/publish'))).toHaveLength(1)
    expect(requests.filter((request) => request.path === base)).toHaveLength(1)
  })

  it('blocks a past publication date before sending a schedule request', async () => {
    backend(({ path, method }) => {
      if (path === base && method === 'GET') return json(makePackage())
      if (path === `${base}/publication-schedules`) return json([])
      throw new Error(`Unexpected request ${method} ${path}`)
    })
    show()
    await waitFor(() => expect(screen.getByRole('button', { name: 'Lên lịch' })).toBeEnabled())
    fireEvent.change(screen.getByLabelText('Thời gian xuất bản (giờ địa phương)'), { target: { value: '2000-01-02T03:04' } })
    fireEvent.submit(screen.getByRole('form', { name: 'Lên lịch xuất bản' }))
    expect(screen.getByRole('alert')).toHaveTextContent('Chọn thời gian xuất bản ở tương lai.')
    expect(screen.getByLabelText('Thời gian xuất bản (giờ địa phương)')).toHaveValue('2000-01-02T03:04')
    expect(requests.some((request) => request.method === 'PUT')).toBe(false)
  })

  it('previews backend option arrays in sort order with author answers and explanations', async () => {
    const questionVersionId = makePackage().versions[1]!.sections[0]!.questions[0]!.questionVersionId
    backend(({ path, method }) => {
      if (path === base && method === 'GET') return json(makePackage())
      if (path === `${base}/publication-schedules`) return json([])
      if (path === `${base}/versions/${draftId}/preview`) return json({
        packageVersionId: draftId, packageId, packageType: 'PRACTICE_SET', topicId: null, rules: {},
        sections: [{ sectionId, title: 'Array option preview', skill: 'READING', instructions: null, sortOrder: 1, passage: null, audio: null,
          items: [{ questionVersionId, sortOrder: 1, stem: 'Choose the matching meaning', options: [{ optionKey: 'B', content: 'Second option', sortOrder: 2 }, { optionKey: 'A', content: 'First option', sortOrder: 1 }], hint: null, maxScore: 1, knowledgePointMappings: [] }] }],
        answers: [{ sectionId, audioTranscript: null, items: [{ questionVersionId, answerSpec: { type: 'CHOICE', correct: 'A' }, explanation: 'The first option matches the passage.', hint: null }] }],
      })
      throw new Error(`Unexpected request ${method} ${path}`)
    })
    show()
    fireEvent.click(await screen.findByRole('button', { name: 'Xem trước' }))
    const preview = await screen.findByRole('region', { name: 'Xem trước gói' })
    expect(await within(preview).findByText('Choose the matching meaning')).toBeInTheDocument()
    const optionList = within(preview).getByText('First option', { exact: false, selector: 'li' }).closest('ul')!
    expect(within(optionList).getAllByRole('listitem').map((item) => item.textContent)).toEqual(['A. First option', 'B. Second option'])
    fireEvent.click(within(preview).getByText('Đáp án và giải thích'))
    expect(within(preview).getByText('Đáp án đúng: A')).toBeVisible()
    expect(within(preview).getByText('The first option matches the passage.')).toBeVisible()
  })
})
