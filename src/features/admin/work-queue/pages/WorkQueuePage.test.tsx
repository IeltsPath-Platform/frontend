import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { clearAccessToken, setAccessToken } from '@/lib/httpClient'
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
const show = () => render(<MemoryRouter><WorkQueuePage /></MemoryRouter>)
const card = (text: string) => screen.getByText(text).closest('li')!

describe('WorkQueuePage', () => {
  beforeEach(() => { calls.length = 0; fetchMock.mockReset(); vi.stubGlobal('fetch', fetchMock); setAccessToken('test-access-token') })
  afterEach(() => { clearAccessToken(); vi.unstubAllGlobals() })

  it('lists the R&D queue with the subject and the numbers of each item, without finished ones by default', async () => {
    backend([gap, easy, edge, done])
    show()

    expect(await screen.findByText('Paraphrase')).toBeInTheDocument()
    expect(calls[0].query.get('queue')).toBe('CONTENT_AUTHOR')
    expect(calls[0].query.has('status')).toBe(false)
    expect(within(card('Paraphrase')).getByText(/Hết bài ôn 5 lần/)).toBeInTheDocument()
    expect(within(card('Which statement is supported?')).getByText(/Đúng 97% trên 120 lượt/)).toBeInTheDocument()
    expect(within(card('Skimming → Scanning')).getByText(/30 lượt dò, KP nền đạt 90%, là gốc lỗi 5%/)).toBeInTheDocument()
    expect(screen.queryByText('A hard one')).not.toBeInTheDocument()
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

    fireEvent.click(within(card('Paraphrase')).getByRole('button', { name: 'Nhận' }))
    await waitFor(() => expect(calls.some((call) => call.method === 'PATCH')).toBe(true))
    const take = calls.find((call) => call.method === 'PATCH')!
    expect(take.path).toBe(`/api/learning/admin/work-items/${ids.gap}`)
    expect(take.body).toEqual({ status: 'IN_PROGRESS' })
    await waitFor(() => expect(calls.filter((call) => call.method === 'GET').length).toBeGreaterThan(1))

    fireEvent.click(within(card('Which statement is supported?')).getByRole('button', { name: 'Trả lại' }))
    await waitFor(() => expect(calls.filter((call) => call.method === 'PATCH')).toHaveLength(2))
    expect(calls.filter((call) => call.method === 'PATCH')[1].body).toEqual({ status: 'OPEN' })
  })

  it('finishes an item with what was done, the result and a note', async () => {
    backend([gap])
    show()
    await screen.findByText('Paraphrase')

    fireEvent.click(within(card('Paraphrase')).getByRole('button', { name: 'Xong' }))
    fireEvent.change(screen.getByLabelText('Đã làm gì'), { target: { value: 'Thêm 3 bộ luyện' } })
    fireEvent.change(screen.getByLabelText('Kết quả'), { target: { value: 'Đủ bộ ôn' } })
    fireEvent.change(screen.getByLabelText('Ghi chú'), { target: { value: 'Theo dõi tuần sau' } })
    fireEvent.click(screen.getByRole('button', { name: 'Đánh dấu xong' }))

    await waitFor(() => expect(calls.some((call) => call.method === 'PATCH')).toBe(true))
    expect(calls.find((call) => call.method === 'PATCH')!.body).toEqual({ status: 'DONE', action: 'Thêm 3 bộ luyện', result: 'Đủ bộ ôn', note: 'Theo dõi tuần sau' })
  })

  it('keeps the list and shows the server message when an update fails', async () => {
    backend([gap], () => json({ message: 'Không đủ quyền', details: { code: 'QUEUE_NOT_ALLOWED' } }, 403))
    show()
    await screen.findByText('Paraphrase')

    fireEvent.click(within(card('Paraphrase')).getByRole('button', { name: 'Nhận' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('Không đủ quyền')
    expect(screen.getByText('Paraphrase')).toBeInTheDocument()
  })

  it('links each kind to the place where it is fixed', async () => {
    backend([gap, easy, edge])
    show()
    await screen.findByText('Paraphrase')

    expect(within(card('Paraphrase')).getByRole('link', { name: 'Tạo gói luyện' })).toHaveAttribute('href', '/content-author/packages?create=PRACTICE_SET')
    expect(within(card('Which statement is supported?')).getByRole('link', { name: 'Mở câu hỏi' })).toHaveAttribute('href', `/content-author/questions/${ids.question}`)
    expect(within(card('Skimming → Scanning')).getByRole('link', { name: 'Xem trên cây tri thức' })).toHaveAttribute('href', `/content-author/knowledge-graph?kp=${ids.from}`)
  })

  it('explains a kind when its question mark is opened', async () => {
    backend([gap])
    show()
    await screen.findByText('Paraphrase')

    expect(screen.getByText(/Học viên làm hết bộ luyện của KP này mà chưa đạt/)).toBeInTheDocument()
  })
})
