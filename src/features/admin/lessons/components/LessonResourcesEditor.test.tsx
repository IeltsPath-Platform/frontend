import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { answerConfirm } from '@/test/confirm'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { HttpError } from '@/lib/httpClient'
import { LessonResourcesEditor } from './LessonResourcesEditor'

const api = vi.hoisted(() => ({ fetchLessonResources: vi.fn(), createLessonResource: vi.fn(), updateLessonResource: vi.fn(), deleteLessonResource: vi.fn(), reorderLessonResources: vi.fn() }))
vi.mock('../api/lessonApi', () => api)
const slides = [
  { id: 's2', title: 'Slide sau', url: 'https://docs.google.com/presentation/d/second/embed', sortOrder: 7 },
  { id: 's1', title: 'Slide đầu', url: 'https://docs.google.com/presentation/d/first/embed', sortOrder: 2 },
]

describe('LessonResourcesEditor', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    api.fetchLessonResources.mockResolvedValue({ lessonId: 'l1', summaryMarkdown: null, slides, documents: [{ id: 'd1', title: 'Bài đọc', url: 'https://example.org/reading.pdf', sortOrder: 0 }] })
    api.createLessonResource.mockResolvedValue(slides[0])
    api.updateLessonResource.mockResolvedValue(slides[0])
    api.deleteLessonResource.mockResolvedValue(undefined)
  })

  it('orders slides separately from documents and opens links in another tab', async () => {
    render(<LessonResourcesEditor lessonId="l1" />)
    const list = await screen.findByRole('region', { name: 'Slide' })
    expect(within(list).getAllByRole('link').map((link) => link.textContent?.trim())).toEqual([slides[1]!.url, slides[0]!.url])
    expect(within(list).getAllByRole('link')[0]).toHaveAttribute('rel', 'noreferrer')
    expect(screen.getByRole('region', { name: 'Tài liệu' })).toHaveTextContent('Bài đọc')
  })

  it('appends a slide after the largest existing sort order', async () => {
    render(<LessonResourcesEditor lessonId="l1" />)
    fireEvent.click(await screen.findByRole('button', { name: 'Thêm slide' }))
    const drawer = screen.getByRole('dialog', { name: 'Thêm slide' })
    expect(drawer).toHaveClass('adm-drawer')
    const form = within(drawer).getByRole('form', { name: 'Thêm slide' })
    fireEvent.change(within(form).getByLabelText('Tiêu đề slide'), { target: { value: 'Slide mới' } })
    fireEvent.change(within(form).getByLabelText('URL slide'), { target: { value: 'https://example.org/slides' } })
    fireEvent.submit(form)
    await waitFor(() => expect(api.createLessonResource).toHaveBeenCalledWith('l1', { type: 'SLIDE', title: 'Slide mới', url: 'https://example.org/slides', sortOrder: 8 }))
    await waitFor(() => expect(api.fetchLessonResources).toHaveBeenCalledTimes(2))
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
  })

  it.each(['http://example.org/slides', 'không phải URL', 'javascript:alert(1)'])('rejects unsafe or invalid URL %s', async (url) => {
    render(<LessonResourcesEditor lessonId="l1" />)
    fireEvent.click(await screen.findByRole('button', { name: 'Thêm slide' }))
    const form = screen.getByRole('form', { name: 'Thêm slide' })
    fireEvent.change(within(form).getByLabelText('Tiêu đề slide'), { target: { value: 'Slide mới' } })
    fireEvent.change(within(form).getByLabelText('URL slide'), { target: { value: url } })
    fireEvent.submit(form)
    expect(within(form).getByRole('alert')).toHaveTextContent('HTTPS')
    expect(api.createLessonResource).not.toHaveBeenCalled()
  })

  it('edits a resource without changing its type or order', async () => {
    render(<LessonResourcesEditor lessonId="l1" />)
    fireEvent.click(await screen.findByRole('button', { name: 'Sửa Slide đầu' }))
    const form = screen.getByRole('form', { name: 'Sửa slide' })
    fireEvent.change(within(form).getByLabelText('Tiêu đề slide'), { target: { value: 'Slide mở đầu' } })
    fireEvent.submit(form)
    await waitFor(() => expect(api.updateLessonResource).toHaveBeenCalledWith('l1', 's1', { title: 'Slide mở đầu', url: slides[1]!.url, sortOrder: 2 }))
  })

  it('only deletes after confirmation', async () => {
    render(<LessonResourcesEditor lessonId="l1" />)
    fireEvent.click(await screen.findByRole('button', { name: 'Xóa Bài đọc' }))
    await answerConfirm(false)
    expect(api.deleteLessonResource).not.toHaveBeenCalled()
    fireEvent.click(screen.getByRole('button', { name: 'Xóa Bài đọc' }))
    await answerConfirm(true)
    await waitFor(() => expect(api.deleteLessonResource).toHaveBeenCalledWith('l1', 'd1'))
  })

  it('opens add and edit one at a time in a drawer that Hủy closes', async () => {
    render(<LessonResourcesEditor lessonId="l1" />)
    fireEvent.click(await screen.findByRole('button', { name: 'Sửa Bài đọc' }))
    const edit = screen.getByRole('dialog', { name: 'Sửa tài liệu' })
    expect(within(edit).getByRole('form', { name: 'Sửa tài liệu' })).toBeInTheDocument()
    // The page behind the drawer is out of reach, so a second form cannot be opened over it.
    expect(screen.queryByRole('button', { name: 'Thêm slide' })).not.toBeInTheDocument()
    fireEvent.click(within(edit).getByRole('button', { name: 'Hủy' }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Thêm tài liệu' }))
    expect(screen.getByRole('dialog', { name: 'Thêm tài liệu' })).toHaveClass('adm-drawer')
  })

  it('keeps reorder controls disabled until ordering is available', async () => {
    render(<LessonResourcesEditor lessonId="l1" />)
    expect(await screen.findByRole('button', { name: 'Đưa Slide đầu xuống' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Đưa Slide đầu xuống' })).toHaveAttribute('title', 'Chờ API đổi thứ tự')
    expect(screen.getByText('Chờ API đổi thứ tự. Bạn vẫn có thể thêm, sửa và xóa slide, tài liệu.')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Đưa Slide đầu xuống' }))
    expect(api.reorderLessonResources).not.toHaveBeenCalled()
    expect(api.updateLessonResource).not.toHaveBeenCalled()
    expect(api.fetchLessonResources).toHaveBeenCalledTimes(1)
  })

  it('shows write errors and retains the form values', async () => {
    api.updateLessonResource.mockRejectedValue(new HttpError(503, 'Chưa lưu được tài liệu'))
    render(<LessonResourcesEditor lessonId="l1" />)
    fireEvent.click(await screen.findByRole('button', { name: 'Sửa Bài đọc' }))
    fireEvent.submit(screen.getByRole('form', { name: 'Sửa tài liệu' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('Chưa lưu được tài liệu')
    expect(within(screen.getByRole('dialog', { name: 'Sửa tài liệu' })).getByRole('alert')).toHaveTextContent('Chưa lưu được tài liệu')
    expect(screen.getByLabelText('URL tài liệu', { selector: 'input[value="https://example.org/reading.pdf"]' })).toBeInTheDocument()
  })
})
