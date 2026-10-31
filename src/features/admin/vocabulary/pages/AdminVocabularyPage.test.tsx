import { fireEvent, render, screen, waitFor, within } from '@/test/render'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { AdminVocabularyPage } from './AdminVocabularyPage'

const { api, media } = vi.hoisted(() => ({
  api: {
    getCatalogVocabulary: vi.fn(),
    getAdminTopics: vi.fn(),
    createAdminTopic: vi.fn(),
    updateAdminTopic: vi.fn(),
    deleteAdminTopic: vi.fn(),
    getAdminSets: vi.fn(),
    createAdminSet: vi.fn(),
    updateAdminSet: vi.fn(),
    deleteAdminSet: vi.fn(),
  },
  media: { uploadAdminImage: vi.fn() },
}))

vi.mock('@/features/vocabulary/api/notebookApi', () => ({ notebookApi: api }))
vi.mock('@/features/admin/media/api/mediaUploadApi', () => media)

function show() {
  return render(<MemoryRouter><AdminVocabularyPage /></MemoryRouter>)
}

describe('AdminVocabularyPage catalog covers', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    api.getCatalogVocabulary.mockResolvedValue({ items: [] })
    api.getAdminTopics.mockResolvedValue([])
    api.getAdminSets.mockResolvedValue([])
    api.createAdminTopic.mockResolvedValue({})
    api.createAdminSet.mockResolvedValue({})
    media.uploadAdminImage.mockResolvedValue({
      mediaReference: 'catalog-cover/author-1/cover.png',
      mediaUrl: 'https://storage.example/catalog-cover/author-1/cover.png',
      contentType: 'image/png',
      sizeBytes: 8,
    })
  })

  it('uploads and saves the topic cover reference', async () => {
    show()
    fireEvent.click(screen.getByRole('button', { name: /Topics/ }))
    fireEvent.click(await screen.findByRole('button', { name: 'Tạo chủ đề mới' }))

    const form = screen.getByPlaceholderText('VD: environment').closest('form')!
    fireEvent.change(within(form).getByPlaceholderText('VD: Môi trường'), { target: { value: 'Môi trường' } })
    fireEvent.change(within(form).getByPlaceholderText('VD: Environment'), { target: { value: 'Environment' } })
    fireEvent.change(within(form).getByPlaceholderText('VD: environment'), { target: { value: 'environment' } })
    const file = new File(['png-data'], 'cover.png', { type: 'image/png' })
    fireEvent.change(within(form).getByLabelText('Ảnh bìa chủ đề'), { target: { files: [file] } })

    await waitFor(() => expect(media.uploadAdminImage).toHaveBeenCalledWith(
      '/api/content/admin/vocabulary/covers', file,
    ))
    fireEvent.click(within(form).getByRole('button', { name: 'Lưu' }))

    await waitFor(() => expect(api.createAdminTopic).toHaveBeenCalledWith(expect.objectContaining({
      coverKey: 'catalog-cover/author-1/cover.png',
    })))
  })

  it('sends null when a set cover is cleared', async () => {
    show()
    fireEvent.click(screen.getByRole('button', { name: /Sets/ }))
    fireEvent.click(await screen.findByRole('button', { name: 'Tạo bộ từ mới' }))

    const form = screen.getByPlaceholderText('VD: Từ vựng Band 6.5 - 7.5').closest('form')!
    fireEvent.change(within(form).getByPlaceholderText('VD: Từ vựng Band 6.5 - 7.5'), { target: { value: 'B2 words' } })
    const file = new File(['png-data'], 'cover.png', { type: 'image/png' })
    fireEvent.change(within(form).getByLabelText('Ảnh bìa bộ từ'), { target: { files: [file] } })
    await waitFor(() => expect(media.uploadAdminImage).toHaveBeenCalledWith(
      '/api/content/admin/vocabulary/covers', file,
    ))

    fireEvent.click(within(form).getByRole('button', { name: 'Xóa ảnh bìa' }))
    fireEvent.click(within(form).getByRole('button', { name: 'Lưu' }))

    await waitFor(() => expect(api.createAdminSet).toHaveBeenCalledWith(expect.objectContaining({ coverKey: null })))
  })
})
