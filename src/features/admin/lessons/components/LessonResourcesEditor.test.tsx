import { fireEvent, render, screen, waitFor, within } from '@/test/render'
import { answerConfirm } from '@/test/confirm'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { HttpError } from '@/lib/httpClient'
import { LessonResourcesEditor } from './LessonResourcesEditor'

const api = vi.hoisted(() => ({ fetchLessonResources: vi.fn(), createLessonResource: vi.fn(), updateLessonResource: vi.fn(), deleteLessonResource: vi.fn(), reorderLessonResources: vi.fn() }))
vi.mock('../api/lessonApi', () => api)
const media = vi.hoisted(() => ({ uploadAdminDocument: vi.fn() }))
vi.mock('../../media/api/mediaUploadApi', async (original) => ({ ...await original<typeof import('../../media/api/mediaUploadApi')>(), ...media }))
const slides = [
  { id: 's2', title: 'Slide sau', url: 'https://docs.google.com/presentation/d/second/embed', sortOrder: 7 },
  { id: 's1', title: 'Slide đầu', url: 'https://docs.google.com/presentation/d/first/embed', sortOrder: 2 },
]

/** Opens the "…" menu of one row (`row` counts from 1 in the table of `kind`) and picks an action from it. */
async function pick(kind: 'Slide' | 'Tài liệu', row: number, action: string) {
  fireEvent.click(await screen.findByRole('button', { name: `Hành động của ${kind.toLowerCase()} ${row}` }))
  fireEvent.click(await screen.findByRole('menuitem', { name: action }))
}

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
    const popup = screen.getByRole('dialog', { name: 'Thêm slide' })
    expect(popup).toHaveClass('adm-modal', 'adm-modal--stacked')
    const form = within(popup).getByRole('form', { name: 'Thêm slide' })
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
    await pick('Slide', 1, 'Sửa Slide đầu')
    const form = screen.getByRole('form', { name: 'Sửa slide' })
    fireEvent.change(within(form).getByLabelText('Tiêu đề slide'), { target: { value: 'Slide mở đầu' } })
    fireEvent.submit(form)
    await waitFor(() => expect(api.updateLessonResource).toHaveBeenCalledWith('l1', 's1', { title: 'Slide mở đầu', url: slides[1]!.url, sortOrder: 2 }))
  })

  it('only deletes after confirmation', async () => {
    render(<LessonResourcesEditor lessonId="l1" />)
    await pick('Tài liệu', 1, 'Xóa Bài đọc')
    await answerConfirm(false)
    expect(api.deleteLessonResource).not.toHaveBeenCalled()
    await pick('Tài liệu', 1, 'Xóa Bài đọc')
    await answerConfirm(true)
    await waitFor(() => expect(api.deleteLessonResource).toHaveBeenCalledWith('l1', 'd1'))
  })

  it('opens add and edit one at a time in a popup that Đóng closes', async () => {
    render(<LessonResourcesEditor lessonId="l1" />)
    await pick('Tài liệu', 1, 'Sửa Bài đọc')
    const edit = screen.getByRole('dialog', { name: 'Sửa tài liệu' })
    expect(within(edit).getByRole('form', { name: 'Sửa tài liệu' })).toBeInTheDocument()
    // The page behind the popup is out of reach, so a second form cannot be opened over it.
    expect(screen.queryByRole('button', { name: 'Thêm slide' })).not.toBeInTheDocument()
    fireEvent.click(within(within(edit).getByRole('form', { name: 'Sửa tài liệu' })).getByRole('button', { name: 'Đóng' }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Thêm tài liệu' }))
    expect(screen.getByRole('dialog', { name: 'Thêm tài liệu' })).toHaveClass('adm-modal--stacked')
  })

  it('offers no reorder actions until ordering is available', async () => {
    render(<LessonResourcesEditor lessonId="l1" />)
    fireEvent.click(await screen.findByRole('button', { name: 'Hành động của slide 1' }))
    expect(await screen.findByRole('menuitem', { name: 'Sửa Slide đầu' })).toBeInTheDocument()
    expect(screen.queryByRole('menuitem', { name: /Đưa/ })).not.toBeInTheDocument()
    expect(api.reorderLessonResources).not.toHaveBeenCalled()
    expect(api.fetchLessonResources).toHaveBeenCalledTimes(1)
  })

  it('shows write errors and retains the form values', async () => {
    api.updateLessonResource.mockRejectedValue(new HttpError(503, 'Chưa lưu được tài liệu'))
    render(<LessonResourcesEditor lessonId="l1" />)
    await pick('Tài liệu', 1, 'Sửa Bài đọc')
    fireEvent.submit(screen.getByRole('form', { name: 'Sửa tài liệu' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('Chưa lưu được tài liệu')
    expect(screen.getByLabelText('URL tài liệu', { selector: 'input[value="https://example.org/reading.pdf"]' })).toBeInTheDocument()
  })
  describe('documents are uploaded as PDF files', () => {
    const pdf = () => new File(['%PDF-1.7'], 'Giao-trinh-Part-1.pdf', { type: 'application/pdf' })
    const stored = { id: 'f1', title: 'Giáo trình đã tải', url: 'https://storage.example/signed?token=t', fileKey: 'lesson-document/u/f.pdf', sortOrder: 3 }

    async function openAddDocument() {
      render(<LessonResourcesEditor lessonId="l1" />)
      fireEvent.click(await screen.findByRole('button', { name: 'Thêm tài liệu' }))
      return screen.getByRole('form', { name: 'Thêm tài liệu' })
    }

    it('asks for a PDF instead of a link and names the document after its file', async () => {
      const form = await openAddDocument()
      expect(within(form).queryByLabelText('URL tài liệu')).not.toBeInTheDocument()
      const input = within(form).getByLabelText('Tệp PDF')
      expect(input).toHaveAttribute('accept', 'application/pdf,.pdf')
      fireEvent.change(input, { target: { files: [pdf()] } })
      expect(within(form).getByLabelText('Tiêu đề tài liệu')).toHaveValue('Giao-trinh-Part-1')
    })

    it('uploads the file first and then attaches its key after the largest sort order', async () => {
      media.uploadAdminDocument.mockResolvedValue({ mediaReference: 'lesson-document/u/f.pdf', contentType: 'application/pdf', sizeBytes: 8 })
      const form = await openAddDocument()
      const file = pdf()
      fireEvent.change(within(form).getByLabelText('Tệp PDF'), { target: { files: [file] } })
      fireEvent.change(within(form).getByLabelText('Tiêu đề tài liệu'), { target: { value: 'Giáo trình Part 1' } })
      fireEvent.submit(form)
      await waitFor(() => expect(api.createLessonResource).toHaveBeenCalledWith('l1', { type: 'DOCUMENT', title: 'Giáo trình Part 1', fileKey: 'lesson-document/u/f.pdf', sortOrder: 1 }))
      expect(media.uploadAdminDocument).toHaveBeenCalledWith(file)
      expect(media.uploadAdminDocument.mock.invocationCallOrder[0]).toBeLessThan(api.createLessonResource.mock.invocationCallOrder[0]!)
    })

    it('needs a file, and refuses anything that is not a PDF or is over 20 MB, before sending anything', async () => {
      const form = await openAddDocument()
      fireEvent.change(within(form).getByLabelText('Tiêu đề tài liệu'), { target: { value: 'Không có tệp' } })
      fireEvent.submit(form)
      expect(within(form).getByRole('alert')).toHaveTextContent('Chọn tệp PDF.')

      fireEvent.change(within(form).getByLabelText('Tệp PDF'), { target: { files: [new File(['x'], 'anh.png', { type: 'image/png' })] } })
      fireEvent.submit(form)
      expect(within(form).getByRole('alert')).toHaveTextContent('Chỉ nhận tệp PDF.')

      const big = new File(['x'], 'lon.pdf', { type: 'application/pdf' })
      Object.defineProperty(big, 'size', { value: 21 * 1024 * 1024 })
      fireEvent.change(within(form).getByLabelText('Tệp PDF'), { target: { files: [big] } })
      fireEvent.submit(form)
      expect(within(form).getByRole('alert')).toHaveTextContent('lớn hơn 20 MB')
      expect(media.uploadAdminDocument).not.toHaveBeenCalled()
      expect(api.createLessonResource).not.toHaveBeenCalled()
    })

    it('shows a Vietnamese message when the server rejects the file and creates no document', async () => {
      media.uploadAdminDocument.mockRejectedValue(new HttpError(400, 'The file is not a PDF', { details: { code: 'UNSUPPORTED_DOCUMENT' } }))
      const form = await openAddDocument()
      fireEvent.change(within(form).getByLabelText('Tệp PDF'), { target: { files: [pdf()] } })
      fireEvent.submit(form)
      expect(await screen.findByRole('alert')).toHaveTextContent('Tệp không phải PDF hợp lệ.')
      expect(api.createLessonResource).not.toHaveBeenCalled()
    })

    it('lists a stored file as a PDF link and renames it without sending a link', async () => {
      api.fetchLessonResources.mockResolvedValue({ lessonId: 'l1', summaryMarkdown: null, slides, documents: [stored] })
      render(<LessonResourcesEditor lessonId="l1" />)
      const open = await screen.findByRole('link', { name: 'Mở tệp PDF Giáo trình đã tải' })
      expect(open).toHaveAttribute('href', stored.url)
      expect(open).toHaveAttribute('target', '_blank')

      await pick('Tài liệu', 1, 'Sửa Giáo trình đã tải')
      const form = screen.getByRole('form', { name: 'Sửa tài liệu' })
      expect(within(form).queryByLabelText('URL tài liệu')).not.toBeInTheDocument()
      expect(within(form).queryByLabelText('Tệp PDF')).not.toBeInTheDocument()
      fireEvent.change(within(form).getByLabelText('Tiêu đề tài liệu'), { target: { value: 'Giáo trình mới' } })
      fireEvent.submit(form)
      await waitFor(() => expect(api.updateLessonResource).toHaveBeenCalledWith('l1', 'f1', { title: 'Giáo trình mới', sortOrder: 3 }))
    })
  })
})
