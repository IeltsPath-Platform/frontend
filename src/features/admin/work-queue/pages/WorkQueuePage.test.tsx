import { fireEvent, render, screen, waitFor, within } from '@/test/render'
import { MemoryRouter, useLocation } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { clearAccessToken, setAccessToken } from '@/lib/httpClient'
import { KIND_HELP } from '../lib/workQueueLabels'
import { WorkQueuePage } from './WorkQueuePage'

const ids = {
  gap: '10000000-0000-4000-8000-000000000001', easy: '10000000-0000-4000-8000-000000000002',
  edge: '10000000-0000-4000-8000-000000000003', lost: '10000000-0000-4000-8000-000000000004',
  kp: '20000000-0000-4000-8000-000000000001', question: '30000000-0000-4000-8000-000000000001',
  from: '20000000-0000-4000-8000-000000000002', to: '20000000-0000-4000-8000-000000000003',
}
const item = (overrides: Record<string, unknown>) => ({ queue: 'CONTENT_AUTHOR', status: 'OPEN', createdAt: '2026-10-23T01:00:00Z', ...overrides })
const gap = item({ id: ids.gap, kind: 'CONTENT_GAP', subjectRef: ids.kp, detail: `{"knowledgePointId":"${ids.kp}"}`, subject: { type: 'KNOWLEDGE_POINT', id: ids.kp, code: 'PARA', name: 'Paraphrase', occurrences: 5 } })
const easy = item({ id: ids.easy, kind: 'QUESTION_TOO_EASY', subjectRef: ids.question, detail: '{"attempts":120,"correctRate":0.97}', status: 'IN_PROGRESS', subject: { type: 'QUESTION', questionId: ids.question, questionVersionId: ids.question, stemPreview: 'Which statement is supported?' } })
const edge = item({ id: ids.edge, kind: 'EDGE_SUSPECT', subjectRef: ids.from, detail: '{"probes":30,"passRate":0.9,"rootRate":0.05}', subject: { type: 'EDGE', from: { id: ids.from, code: 'KP_A', name: 'Skimming' }, to: { id: ids.to, code: 'KP_B', name: 'Scanning' } } })
const lost = item({ id: ids.lost, kind: 'CONTENT_GAP', subjectRef: ids.kp, detail: '{}', subject: null })
const done = item({ id: '10000000-0000-4000-8000-000000000005', kind: 'QUESTION_TOO_HARD', status: 'DONE', detail: '{"attempts":50,"correctRate":0.1}', action: 'Viết lại đề', result: 'Đã sửa', subject: { type: 'QUESTION', questionId: ids.question, stemPreview: 'A hard one' } })

type Call = { path: string; query: URLSearchParams; method: string; body: unknown }
const calls: Call[] = []
const fetchMock = vi.fn<typeof fetch>()
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })
function backend(list: unknown[], patch: () => Response = () => json({})) {
  fetchMock.mockImplementation(async (input, options = {}) => {
    const url = new URL(String(input))
    const call = { path: url.pathname, query: url.searchParams, method: options.method ?? 'GET', body: typeof options.body === 'string' ? JSON.parse(options.body) : options.body }
    calls.push(call)
    return call.method === 'PATCH' ? patch() : json(list)
  })
}
function Where() {
  const location = useLocation()
  return <p data-testid="where">{location.pathname + location.search}</p>
}
const show = () => render(<MemoryRouter><WorkQueuePage /><Where /></MemoryRouter>)
/** The table row of an item, found by what it is about. */
const row = (text: string) => screen.getByText(text).closest('tr')!
/** Opens the action menu of an item and returns its menu. */
async function menuOf(text: string) {
  fireEvent.click(within(row(text)).getByRole('button', { name: `Hành động cho ${text}` }))
  return screen.findByRole('menu', { name: `Hành động cho ${text}` })
}

describe('WorkQueuePage', () => {
  beforeEach(() => { calls.length = 0; fetchMock.mockReset(); vi.stubGlobal('fetch', fetchMock); setAccessToken('test-access-token') })
  afterEach(() => { clearAccessToken(); vi.unstubAllGlobals() })

  it('lists the items in one table with the kind, subject and numbers of each, without finished ones by default', async () => {
    backend([gap, easy, edge, done])
    show()

    expect(await screen.findByText('Paraphrase')).toBeInTheDocument()
    expect(calls[0].query.get('queue')).toBe('CONTENT_AUTHOR')
    expect(calls[0].query.has('status')).toBe(false)
    const table = screen.getByRole('table', { name: 'Danh sách việc cần làm' })
    expect(within(row('Paraphrase')).getByText(/Hết bài ôn 5 lần/)).toBeInTheDocument()
    expect(within(row('Which statement is supported?')).getByText(/Đúng 97% trên 120 lượt/)).toBeInTheDocument()
    expect(within(row('Skimming → Scanning')).getByText(/30 lượt dò, KP nền đạt 90%, là gốc lỗi 5%/)).toBeInTheDocument()
    expect(within(table).queryByText('A hard one')).not.toBeInTheDocument()
    expect(within(table).getAllByRole('row')).toHaveLength(4)
  })

  it('puts no question mark or explanation text on the rows: the kind keeps its explanation as a tooltip', async () => {
    backend([gap])
    show()
    await screen.findByText('Paraphrase')

    const kind = within(row('Paraphrase')).getByText('KP thiếu bài luyện')
    expect(kind).toHaveAttribute('title', KIND_HELP.CONTENT_GAP)
    expect(screen.queryByText('?')).not.toBeInTheDocument()
    expect(screen.queryByText(/Học viên làm hết bộ luyện của KP này mà chưa đạt/)).not.toBeInTheDocument()
  })

  it('names an item whose subject could not be loaded by a short code instead of hiding it', async () => {
    backend([lost])
    show()

    expect(await screen.findByText('Không tải được tên (20000000)')).toBeInTheDocument()
  })

  it('sends the chosen kind and status to the server', async () => {
    backend([gap])
    show()
    await screen.findByText('Paraphrase')

    fireEvent.change(screen.getByLabelText('Loại việc'), { target: { value: 'EDGE_SUSPECT' } })
    await waitFor(() => expect(calls.at(-1)?.query.get('kind')).toBe('EDGE_SUSPECT'))
    fireEvent.change(screen.getByLabelText('Trạng thái'), { target: { value: 'DONE' } })
    await waitFor(() => expect(calls.at(-1)?.query.get('status')).toBe('DONE'))
  })

  it('shows finished work with its action and result when asked', async () => {
    backend([done])
    show()
    fireEvent.change(await screen.findByLabelText('Trạng thái'), { target: { value: 'ALL' } })

    expect(await screen.findByText('A hard one')).toBeInTheDocument()
    expect(screen.getByText(/Viết lại đề · Đã sửa/)).toBeInTheDocument()
  })

  it('takes an item with IN_PROGRESS and returns one with OPEN, then reloads the list', async () => {
    backend([gap, easy])
    show()
    await screen.findByText('Paraphrase')

    fireEvent.click(within(await menuOf('Paraphrase')).getByRole('menuitem', { name: 'Nhận' }))
    await waitFor(() => expect(calls.some((call) => call.method === 'PATCH')).toBe(true))
    const take = calls.find((call) => call.method === 'PATCH')!
    expect(take.path).toBe(`/api/learning/admin/work-items/${ids.gap}`)
    expect(take.body).toEqual({ status: 'IN_PROGRESS' })
    await waitFor(() => expect(calls.filter((call) => call.method === 'GET').length).toBeGreaterThan(1))

    fireEvent.click(within(await menuOf('Which statement is supported?')).getByRole('menuitem', { name: 'Trả lại' }))
    await waitFor(() => expect(calls.filter((call) => call.method === 'PATCH')).toHaveLength(2))
    expect(calls.filter((call) => call.method === 'PATCH')[1].body).toEqual({ status: 'OPEN' })
    // Let the reload that follows finish here: a request still running when the test ends would clear the next test's token.
    await waitFor(() => expect(calls.filter((call) => call.method === 'GET').length).toBeGreaterThan(2))
    await waitFor(() => expect(screen.getByRole('table', { name: 'Danh sách việc cần làm' })).toBeInTheDocument())
  })

  it('finishes an item with what was done, the result and a note', async () => {
    backend([gap])
    show()
    await screen.findByText('Paraphrase')

    fireEvent.click(within(await menuOf('Paraphrase')).getByRole('menuitem', { name: 'Xong' }))
    const drawer = await screen.findByRole('dialog', { name: 'Hoàn thành công việc' })
    fireEvent.change(within(drawer).getByLabelText('Đã làm gì'), { target: { value: 'Thêm 3 bộ luyện' } })
    fireEvent.change(within(drawer).getByLabelText('Kết quả'), { target: { value: 'Đủ bộ ôn' } })
    fireEvent.change(within(drawer).getByLabelText('Ghi chú'), { target: { value: 'Theo dõi tuần sau' } })
    fireEvent.click(within(drawer).getByRole('button', { name: 'Đánh dấu xong' }))

    await waitFor(() => expect(calls.some((call) => call.method === 'PATCH')).toBe(true))
    expect(calls.find((call) => call.method === 'PATCH')!.body).toEqual({ status: 'DONE', action: 'Thêm 3 bộ luyện', result: 'Đủ bộ ôn', note: 'Theo dõi tuần sau' })
  })

  it('keeps the list and the finishing form, and shows the server message, when an update fails', async () => {
    backend([gap], () => json({ message: 'Không đủ quyền', details: { code: 'QUEUE_NOT_ALLOWED' } }, 403))
    show()
    await screen.findByText('Paraphrase')

    fireEvent.click(within(await menuOf('Paraphrase')).getByRole('menuitem', { name: 'Nhận' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('Không đủ quyền')
    expect(screen.getByText('Paraphrase')).toBeInTheDocument()
  })

  it('opens the place where each kind is fixed from its action menu', async () => {
    backend([gap, easy, edge])
    show()
    await screen.findByText('Paraphrase')

    fireEvent.click(within(await menuOf('Paraphrase')).getByRole('menuitem', { name: 'Tạo gói luyện' }))
    await waitFor(() => expect(screen.getByTestId('where')).toHaveTextContent('/content-author/packages?create=PRACTICE_SET'))
    fireEvent.click(within(await menuOf('Which statement is supported?')).getByRole('menuitem', { name: 'Mở câu hỏi' }))
    await waitFor(() => expect(screen.getByTestId('where')).toHaveTextContent(`/content-author/questions/${ids.question}`))
    fireEvent.click(within(await menuOf('Skimming → Scanning')).getByRole('menuitem', { name: 'Xem trên cây tri thức' }))
    await waitFor(() => expect(screen.getByTestId('where')).toHaveTextContent(`/content-author/knowledge-graph?kp=${ids.from}`))
  })

  it('offers a finished item only its link, with no take, return or finish', async () => {
    backend([done])
    show()
    fireEvent.change(await screen.findByLabelText('Trạng thái'), { target: { value: 'ALL' } })
    await screen.findByText('A hard one')

    const menu = await menuOf('A hard one')
    expect(within(menu).getByRole('menuitem', { name: 'Mở câu hỏi' })).toBeInTheDocument()
    expect(within(menu).queryByRole('menuitem', { name: /Nhận|Trả lại|Xong/ })).not.toBeInTheDocument()
  })
})
