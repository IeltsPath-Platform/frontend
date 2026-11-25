import { fireEvent, render, screen, waitFor } from '@/test/render'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { QuestionImageEditor } from './QuestionImageEditor'

const { api, media, confirm, setError } = vi.hoisted(() => ({
  api: { listVersionPassages: vi.fn(), setVersionImage: vi.fn(), clearVersionImage: vi.fn() },
  media: { uploadAdminImage: vi.fn() },
  confirm: vi.fn(),
  setError: vi.fn(),
}))

vi.mock('../api/questionApi', () => api)
vi.mock('../../media/api/mediaUploadApi', () => ({
  IMAGE_CONTENT_TYPES: ['image/jpeg', 'image/png', 'image/webp'],
  IMAGE_MAX_BYTES: 2 * 1024 * 1024,
  uploadAdminImage: media.uploadAdminImage,
}))
vi.mock('../../lib/useAdminConfirm', () => ({
  useAdminConfirm: () => ({ confirm, confirmDialog: null }),
}))
vi.mock('../../lib/useAdminError', () => ({ useAdminError: () => [null, setError] }))

const imagePassage = { assetId: 'asset-1', text: 'Biểu đồ doanh thu', source: 'DIRECT', type: 'IMAGE', mediaUrl: 'https://images.example/chart.png' }

function renderEditor(editable = true) {
  return render(<QuestionImageEditor editable={editable} questionId="question-1" versionId="version-1" />)
}

describe('QuestionImageEditor', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    api.listVersionPassages.mockResolvedValue([imagePassage])
    api.setVersionImage.mockResolvedValue(undefined)
    api.clearVersionImage.mockResolvedValue(undefined)
    media.uploadAdminImage.mockResolvedValue({ mediaReference: 'content-image/author-1/chart.png' })
    confirm.mockResolvedValue(true)
  })

  it('shows an image with PrimeReact preview', async () => {
    renderEditor(false)

    expect(await screen.findByAltText('Biểu đồ doanh thu')).toBeInTheDocument()
    expect(document.querySelector('.p-image-preview-indicator')).toBeInTheDocument()
    fireEvent.click(document.querySelector('.p-image-preview-indicator') as Element)
    await waitFor(() => expect(document.querySelector('.p-image-mask img')).toBeInTheDocument())
  })

  it('asks for confirmation before removing the image', async () => {
    renderEditor()
    fireEvent.click(await screen.findByRole('button', { name: 'Gỡ ảnh đề' }))

    await waitFor(() => expect(confirm).toHaveBeenCalledWith(expect.objectContaining({ title: 'Gỡ ảnh đề?' })))
    await waitFor(() => expect(api.clearVersionImage).toHaveBeenCalledWith('question-1', 'version-1'))
  })

  it('shows an empty drop frame for editable versions and nothing for read-only versions', async () => {
    api.listVersionPassages.mockResolvedValue([])
    const editable = renderEditor()

    expect(await screen.findByRole('button', { name: 'Chọn ảnh đề' })).toBeInTheDocument()
    expect(screen.getByText('hoặc kéo thả vào đây')).toBeInTheDocument()
    editable.unmount()

    renderEditor(false)
    await waitFor(() => expect(api.listVersionPassages).toHaveBeenCalledTimes(2))
    expect(screen.queryByRole('region', { name: 'Ảnh đề' })).not.toBeInTheDocument()
  })

  it('uploads a selected image and attaches it once with the existing description', async () => {
    renderEditor()
    const file = new File(['image'], 'new-chart.webp', { type: 'image/webp' })
    fireEvent.change(await screen.findByLabelText('Chọn ảnh đề'), { target: { files: [file] } })

    await waitFor(() => expect(media.uploadAdminImage).toHaveBeenCalledTimes(1))
    expect(media.uploadAdminImage).toHaveBeenCalledWith('/api/content/admin/media/image', file)
    await waitFor(() => expect(api.setVersionImage).toHaveBeenCalledTimes(1))
    expect(api.setVersionImage).toHaveBeenCalledWith('question-1', 'version-1', {
      mediaReference: 'content-image/author-1/chart.png', altText: 'Biểu đồ doanh thu',
    })
  })

  it.each([
    ['oversized image', new File([new Uint8Array(2 * 1024 * 1024 + 1)], 'large.png', { type: 'image/png' }), 'Ảnh lớn hơn 2 MB. Chọn ảnh nhỏ hơn.'],
    ['unsupported image type', new File(['text'], 'chart.gif', { type: 'image/gif' }), 'Chỉ nhận ảnh JPG, PNG hoặc WebP.'],
  ])('shows an inline error and skips upload for an %s', async (_label, file, message) => {
    renderEditor()
    fireEvent.change(await screen.findByLabelText('Chọn ảnh đề'), { target: { files: [file] } })

    expect(await screen.findByRole('alert')).toHaveTextContent(message)
    expect(media.uploadAdminImage).not.toHaveBeenCalled()
    expect(api.setVersionImage).not.toHaveBeenCalled()
  })

  it('shows a read-only image without remove or replace actions', async () => {
    renderEditor(false)

    expect(await screen.findByAltText('Biểu đồ doanh thu')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Gỡ ảnh đề' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Thay ảnh' })).not.toBeInTheDocument()
  })
})
