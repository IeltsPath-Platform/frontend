import { act, fireEvent, render, screen, waitFor, within } from '@/test/render'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { clearAccessToken, setAccessToken } from '@/lib/httpClient'
import { LessonResourcesEditor } from './LessonResourcesEditor'

vi.mock('../lib/resource-reorder', () => ({ RESOURCE_REORDER_ENABLED: true }))

const lessonId = '00000000-0000-4000-8000-000000000001'
const slides = [
  { id: '00000000-0000-4000-8000-000000000003', title: 'Slide sau', url: 'https://example.org/second', sortOrder: 7 },
  { id: '00000000-0000-4000-8000-000000000002', title: 'Slide đầu', url: 'https://example.org/first', sortOrder: 2 },
]
const documents = [
  { id: '00000000-0000-4000-8000-000000000004', title: 'Bài đọc đầu', url: 'https://example.org/reading.pdf', sortOrder: 0 },
  { id: '00000000-0000-4000-8000-000000000005', title: 'Bài đọc sau', url: 'https://example.org/next.pdf', sortOrder: 1 },
]
const snapshot = { lessonId, summaryMarkdown: null, slides, documents }
const fetchMock = vi.fn<typeof fetch>()

/** Opens the "…" menu of one row; `row` counts from 1 inside the table of `kind`. */
function openMenu(kind: 'slide' | 'tài liệu', row: number) {
  fireEvent.click(screen.getByRole('button', { name: `Hành động của ${kind} ${row}` }))
}

function json(body: unknown) {
  return new Response(JSON.stringify(body), { status: 200, headers: { 'Content-Type': 'application/json' } })
}

describe('Lesson resource ordering when enabled', () => {
  beforeEach(() => {
    fetchMock.mockReset()
    fetchMock.mockResolvedValue(json(snapshot))
    vi.stubGlobal('fetch', fetchMock)
    setAccessToken('test-access-token')
  })

  afterEach(() => {
    clearAccessToken()
    vi.unstubAllGlobals()
  })

  it.each([
    { type: 'SLIDE', kind: 'slide' as const, row: 1, button: 'Đưa Slide đầu xuống', ids: [slides[0]!.id, slides[1]!.id] },
    { type: 'DOCUMENT', kind: 'tài liệu' as const, row: 2, button: 'Đưa Bài đọc sau lên', ids: [documents[1]!.id, documents[0]!.id] },
  ])('uses one whole-list PUT for $type then reloads server order', async ({ type, kind, row, button, ids }) => {
    render(<LessonResourcesEditor lessonId={lessonId} />)
    await screen.findByRole('button', { name: `Hành động của ${kind} ${row}` })
    openMenu('slide', 1)
    expect(screen.getByRole('menuitem', { name: 'Đưa Slide đầu lên' })).toBeDisabled()
    fireEvent.pointerDown(document.body)
    openMenu('slide', 2)
    expect(screen.getByRole('menuitem', { name: 'Đưa Slide sau xuống' })).toBeDisabled()
    fireEvent.pointerDown(document.body)
    openMenu(kind, row)
    const move = screen.getByRole('menuitem', { name: button })
    fetchMock.mockResolvedValueOnce(new Response(null, { status: 204 }))
    fetchMock.mockResolvedValueOnce(json({
      ...snapshot,
      [type === 'SLIDE' ? 'slides' : 'documents']: (type === 'SLIDE' ? [slides[0]!, slides[1]!] : [documents[1]!, documents[0]!]).map((item, sortOrder) => ({ ...item, sortOrder })),
    }))
    fireEvent.click(move)
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(3))
    const [url, options] = fetchMock.mock.calls[1]!
    expect(String(url)).toContain(`/api/content/admin/lessons/${lessonId}/resources/order`)
    expect(options?.method).toBe('PUT')
    expect(JSON.parse(options!.body as string)).toEqual({ type, resourceIds: ids })
    expect(fetchMock.mock.calls.map(([, options]) => options?.method)).toEqual(['GET', 'PUT', 'GET'])
    const region = screen.getByRole('region', { name: type === 'SLIDE' ? 'Slide' : 'Tài liệu' })
    await waitFor(() => expect(within(region).getAllByRole('link')[0]).toHaveAttribute('href', type === 'SLIDE' ? slides[0]!.url : documents[1]!.url))
  })

  it('locks both resource lists during the write and reload', async () => {
    render(<LessonResourcesEditor lessonId={lessonId} />)
    await screen.findByRole('button', { name: 'Hành động của slide 1' })
    let finishWrite!: (response: Response) => void
    let finishReload!: (response: Response) => void
    fetchMock.mockReturnValueOnce(new Promise((resolve) => { finishWrite = resolve }))
    fetchMock.mockReturnValueOnce(new Promise((resolve) => { finishReload = resolve }))
    openMenu('slide', 1)
    fireEvent.click(screen.getByRole('menuitem', { name: 'Đưa Slide đầu xuống' }))
    expect(screen.getByRole('button', { name: 'Hành động của tài liệu 2' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Hành động của slide 2' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Thêm slide' })).toBeDisabled()
    expect(fetchMock).toHaveBeenCalledTimes(2)
    await act(async () => finishWrite(new Response(null, { status: 204 })))
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(3))
    expect(screen.getByRole('button', { name: 'Hành động của slide 1' })).toBeDisabled()
    await act(async () => finishReload(json(snapshot)))
    await waitFor(() => expect(screen.getByRole('button', { name: 'Hành động của slide 1' })).toBeEnabled())
    expect(screen.getByRole('button', { name: 'Thêm slide' })).toBeEnabled()
  })

  it('shows a failed reorder and reloads the current list', async () => {
    render(<LessonResourcesEditor lessonId={lessonId} />)
    await screen.findByRole('button', { name: 'Hành động của slide 1' })
    openMenu('slide', 1)
    const move = screen.getByRole('menuitem', { name: 'Đưa Slide đầu xuống' })
    fetchMock.mockResolvedValueOnce(new Response(JSON.stringify({ message: 'Danh sách tài nguyên đã thay đổi.' }), { status: 400 }))
    fetchMock.mockResolvedValueOnce(json(snapshot))
    fireEvent.click(move)
    expect(await screen.findByRole('alert')).toHaveTextContent('Danh sách tài nguyên đã thay đổi.')
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(3))
    expect(fetchMock.mock.calls.map(([, options]) => options?.method)).toEqual(['GET', 'PUT', 'GET'])
  })
})
