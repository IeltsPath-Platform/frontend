import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
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
    { type: 'SLIDE', button: 'Đưa Slide đầu xuống', ids: [slides[0]!.id, slides[1]!.id] },
    { type: 'DOCUMENT', button: 'Đưa Bài đọc sau lên', ids: [documents[1]!.id, documents[0]!.id] },
  ])('uses one whole-list PUT for $type then reloads server order', async ({ type, button, ids }) => {
    render(<LessonResourcesEditor lessonId={lessonId} />)
    const move = await screen.findByRole('button', { name: button })
    expect(screen.queryByText(/Chờ API đổi thứ tự\./)).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Đưa Slide đầu lên' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Đưa Slide sau xuống' })).toBeDisabled()
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

  it('locks both resource lists during the write and reload while retaining unfinished forms', async () => {
    render(<LessonResourcesEditor lessonId={lessonId} />)
    fireEvent.click(await screen.findByRole('button', { name: 'Sửa Bài đọc đầu' }))
    const editForm = screen.getByRole('form', { name: 'Sửa tài liệu' })
    fireEvent.change(within(editForm).getByLabelText('Tiêu đề tài liệu'), { target: { value: 'Bài đang soạn' } })
    const addForm = screen.getByRole('form', { name: 'Thêm slide' })
    fireEvent.change(within(addForm).getByLabelText('Tiêu đề slide'), { target: { value: 'Slide đang soạn' } })
    let finishWrite!: (response: Response) => void
    let finishReload!: (response: Response) => void
    fetchMock.mockReturnValueOnce(new Promise((resolve) => { finishWrite = resolve }))
    fetchMock.mockReturnValueOnce(new Promise((resolve) => { finishReload = resolve }))
    fireEvent.click(screen.getByRole('button', { name: 'Đưa Slide đầu xuống' }))
    expect(screen.getByRole('button', { name: 'Đưa Bài đọc sau lên' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Sửa Slide sau' })).toBeDisabled()
    expect(within(editForm).getByLabelText('Tiêu đề tài liệu')).toBeDisabled()
    fireEvent.click(screen.getByRole('button', { name: 'Đưa Slide sau lên' }))
    expect(fetchMock).toHaveBeenCalledTimes(2)
    await act(async () => finishWrite(new Response(null, { status: 204 })))
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(3))
    expect(screen.getByRole('button', { name: 'Đưa Slide đầu xuống' })).toBeDisabled()
    expect(within(editForm).getByLabelText('Tiêu đề tài liệu')).toHaveValue('Bài đang soạn')
    expect(within(addForm).getByLabelText('Tiêu đề slide')).toHaveValue('Slide đang soạn')
    await act(async () => finishReload(json(snapshot)))
    await waitFor(() => expect(screen.getByRole('button', { name: 'Đưa Slide đầu xuống' })).toBeEnabled())
    expect(within(editForm).getByLabelText('Tiêu đề tài liệu')).toHaveValue('Bài đang soạn')
    expect(within(addForm).getByLabelText('Tiêu đề slide')).toHaveValue('Slide đang soạn')
  })

  it('shows a failed reorder and reloads the current list without replacing unfinished values', async () => {
    render(<LessonResourcesEditor lessonId={lessonId} />)
    const move = await screen.findByRole('button', { name: 'Đưa Slide đầu xuống' })
    const form = screen.getByRole('form', { name: 'Thêm tài liệu' })
    fireEvent.change(within(form).getByLabelText('Tiêu đề tài liệu'), { target: { value: 'Tài liệu đang soạn' } })
    fetchMock.mockResolvedValueOnce(new Response(JSON.stringify({ message: 'Danh sách tài nguyên đã thay đổi.' }), { status: 400 }))
    fetchMock.mockResolvedValueOnce(json(snapshot))
    fireEvent.click(move)
    expect(await screen.findByRole('alert')).toHaveTextContent('Danh sách tài nguyên đã thay đổi.')
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(3))
    expect(within(form).getByLabelText('Tiêu đề tài liệu')).toHaveValue('Tài liệu đang soạn')
    expect(fetchMock.mock.calls.map(([, options]) => options?.method)).toEqual(['GET', 'PUT', 'GET'])
  })
})
