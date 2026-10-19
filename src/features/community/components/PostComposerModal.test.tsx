import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, expect, it, vi, beforeEach } from 'vitest'
import { useForm } from 'react-hook-form'
import { PostComposerModal, type PostFormValues } from './PostComposerModal'

const uploadImageMock = vi.hoisted(() => vi.fn())
const uploadVideoMock = vi.hoisted(() => vi.fn())
vi.mock('../api/communityApi', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../api/communityApi')>()
  return {
    ...actual,
    getMediaUploadErrorMessage: actual.getMediaUploadErrorMessage,
    communityApi: { ...actual.communityApi, uploadImage: uploadImageMock, uploadVideo: uploadVideoMock },
  }
})

const CATEGORIES = [
  'GENERAL',
  'QUESTION',
  'DISCUSSION',
  'WRITING_SHARING',
  'SPEAKING_PARTNER',
  'RESOURCE_TIPS',
] as const

function TestWrapper({
  isOpen = true,
  isEditing = false,
  defaultValues,
  onSubmit = vi.fn(),
  onClose = vi.fn(),
}: {
  isOpen?: boolean
  isEditing?: boolean
  defaultValues?: Partial<PostFormValues>
  onSubmit?: (e: React.FormEvent) => void
  onClose?: () => void
}) {
  const form = useForm<PostFormValues>({
    defaultValues: {
      category: 'GENERAL',
      title: '',
      body: '',
      imageUrls: '',
      videoUrl: '',
      targetBand: '',
      background: null,
      ...defaultValues,
    },
  })

  return (
    <PostComposerModal
      isOpen={isOpen}
      isEditing={isEditing}
      form={form}
      formValidationError=""
      categories={CATEGORIES}
      userName="Alice"
      onSubmit={onSubmit}
      onClose={onClose}
    />
  )
}

describe('PostComposerModal', () => {
  beforeEach(() => {
    uploadImageMock.mockReset()
    uploadVideoMock.mockReset()
  })
  it('does not render when isOpen is false', () => {
    render(<TestWrapper isOpen={false} />)
    expect(screen.queryByRole('dialog')).toBeNull()
  })

  it('renders "Tạo bài viết" for create mode and "Chỉnh sửa bài viết" for edit mode', () => {
    const { unmount } = render(<TestWrapper isEditing={false} />)
    expect(screen.getByRole('heading', { name: 'Tạo bài viết' })).toBeInTheDocument()
    unmount()

    render(<TestWrapper isEditing={true} />)
    expect(screen.getByRole('heading', { name: 'Chỉnh sửa bài viết' })).toBeInTheDocument()
  })

  it('disables submit button when body is empty and enables when body is non-empty', () => {
    render(<TestWrapper defaultValues={{ body: '' }} />)
    const submitBtn = screen.getByRole('button', { name: 'Đăng' })
    expect(submitBtn).toBeDisabled()

    const textarea = screen.getByPlaceholderText(/Alice, bạn đang nghĩ gì thế\?/)
    fireEvent.change(textarea, { target: { value: 'Một bài viết chia sẻ IELTS' } })
    expect(submitBtn).toBeEnabled()
  })

  it('keeps focus in the title field while typing instead of jumping back to the body', async () => {
    vi.useFakeTimers()
    try {
      render(<TestWrapper defaultValues={{ title: '' }} />)
      await vi.advanceTimersByTimeAsync(100) // let the initial focus on the body settle
      fireEvent.click(screen.getByRole('button', { name: /tiêu đề/i }))
      const title = screen.getByPlaceholderText(/Tiêu đề bài viết/)
      title.focus()
      fireEvent.change(title, { target: { value: 'T' } })
      await vi.advanceTimersByTimeAsync(200)
      expect(document.activeElement).toBe(title)
    } finally {
      vi.useRealTimers()
    }
  })

  it('calls onClose when clicking close button on clean form', () => {
    const onClose = vi.fn()
    render(<TestWrapper onClose={onClose} defaultValues={{ body: '' }} />)

    const closeBtn = screen.getByRole('button', { name: 'Đóng' })
    fireEvent.click(closeBtn)
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('prompts window.confirm on Escape when form is dirty', () => {
    const onClose = vi.fn()
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(false)

    render(<TestWrapper onClose={onClose} defaultValues={{ body: 'Đang soạn dở...' }} />)

    fireEvent.keyDown(document, { key: 'Escape' })
    expect(confirmSpy).toHaveBeenCalledWith('Bạn có chắc muốn hủy bài viết đang soạn?')
    expect(onClose).not.toHaveBeenCalled()

    confirmSpy.mockReturnValue(true)
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(onClose).toHaveBeenCalledTimes(1)

    confirmSpy.mockRestore()
  })

  it('selects background swatch and switches to gradient theme', () => {
    render(<TestWrapper defaultValues={{ body: 'Học IELTS thật vui' }} />)
    const violetSwatch = screen.getByRole('radio', { name: 'Tím mộng mơ' })
    fireEvent.click(violetSwatch)
    expect(violetSwatch).toHaveAttribute('aria-checked', 'true')
  })

  it('clears background when user types more than 280 characters', () => {
    render(
      <TestWrapper
        defaultValues={{
          body: 'Nội dung ngắn',
          background: 'VIOLET',
        }}
      />,
    )
    const violetSwatch = screen.getByRole('radio', { name: 'Tím mộng mơ' })
    expect(violetSwatch).toHaveAttribute('aria-checked', 'true')

    const textarea = screen.getByPlaceholderText(/Alice, bạn đang nghĩ gì thế\?/)
    const longText = 'A'.repeat(285)
    fireEvent.change(textarea, { target: { value: longText } })

    expect(screen.getByRole('radio', { name: 'Không dùng màu nền' })).toHaveAttribute(
      'aria-checked',
      'true',
    )
    expect(screen.getByText(/Màu nền chỉ hỗ trợ bài viết tối đa 280 ký tự/)).toBeInTheDocument()
  })

  it('uploads an image and adds its URL to the form while keeping URL entry available', async () => {
    uploadImageMock.mockResolvedValue({ url: 'https://bucket.supabase.co/storage/v1/object/public/community/images/a.png' })
    render(<TestWrapper />)
    const mediaToolbarBtn = screen.getByRole('button', { name: 'Đính kèm ảnh hoặc video' })
    fireEvent.click(mediaToolbarBtn)

    fireEvent.click(screen.getByRole('tab', { name: /Từ máy tính/ }))
    const file = new File(['png'], 'a.png', { type: 'image/png' })
    fireEvent.change(screen.getByLabelText('Chọn ảnh từ máy tính'), { target: { files: [file] } })
    await waitFor(() => expect(screen.getByAltText('Ảnh đính kèm 1')).toBeInTheDocument())
    expect(uploadImageMock).toHaveBeenCalledWith(file, expect.any(AbortSignal))
    expect(screen.getByRole('tab', { name: /Nhập URL/ })).toBeInTheDocument()
  })

  it('enforces the four image limit before calling upload', () => {
    render(<TestWrapper defaultValues={{ imageUrls: ['https://images.unsplash.com/1', 'https://images.unsplash.com/2', 'https://images.unsplash.com/3', 'https://images.unsplash.com/4'].join('\n') }} />)
    fireEvent.click(screen.getByRole('button', { name: 'Đính kèm ảnh hoặc video' }))
    fireEvent.click(screen.getByRole('tab', { name: /Từ máy tính/ }))
    fireEvent.change(screen.getByLabelText('Chọn ảnh từ máy tính'), { target: { files: [new File(['png'], '5.png', { type: 'image/png' })] } })
    expect(screen.getByRole('alert')).toHaveTextContent('tối đa 4 hình ảnh')
    expect(uploadImageMock).not.toHaveBeenCalled()
  })

  it('shows the URL fallback hint when storage is unavailable', async () => {
    const { MediaUploadError } = await import('../api/communityApi')
    uploadImageMock.mockRejectedValue(new MediaUploadError('Tải tệp từ máy tạm thời chưa khả dụng, hãy dùng đường dẫn URL', 503))
    render(<TestWrapper />)
    fireEvent.click(screen.getByRole('button', { name: 'Đính kèm ảnh hoặc video' }))
    fireEvent.click(screen.getByRole('tab', { name: /Từ máy tính/ }))
    fireEvent.change(screen.getByLabelText('Chọn ảnh từ máy tính'), { target: { files: [new File(['png'], 'a.png', { type: 'image/png' })] } })
    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('Tải tệp từ máy tạm thời chưa khả dụng'))
    fireEvent.click(screen.getByRole('button', { name: /Chuyển sang tab Nhập URL/ }))
    expect(screen.getByLabelText('Đường dẫn media')).toBeInTheDocument()
  })

  it('blocks submit while a media upload is in progress', async () => {
    let resolveUpload!: (value: { url: string }) => void
    uploadImageMock.mockReturnValue(new Promise((resolve) => { resolveUpload = resolve }))
    render(<TestWrapper defaultValues={{ body: 'Bài viết thử nghiệm' }} />)
    fireEvent.click(screen.getByRole('button', { name: 'Đính kèm ảnh hoặc video' }))
    fireEvent.click(screen.getByRole('tab', { name: /Từ máy tính/ }))
    fireEvent.change(screen.getByLabelText('Chọn ảnh từ máy tính'), { target: { files: [new File(['png'], 'a.png', { type: 'image/png' })] } })
    await waitFor(() => expect(screen.getByRole('button', { name: 'Đăng' })).toBeDisabled())
    resolveUpload({ url: 'https://bucket.supabase.co/a.png' })
    await waitFor(() => expect(screen.getByRole('button', { name: 'Đăng' })).toBeEnabled())
  })


  it('validates URL and adds image preview, and removes background when media is added', () => {
    render(
      <TestWrapper
        defaultValues={{
          body: 'Bài viết có hình ảnh minh họa',
          background: 'OCEAN',
        }}
      />,
    )
    const mediaToolbarBtn = screen.getByRole('button', { name: 'Đính kèm ảnh hoặc video' })
    fireEvent.click(mediaToolbarBtn)

    const urlTab = screen.getByRole('tab', { name: /Nhập URL/ })
    fireEvent.click(urlTab)

    const urlInput = screen.getByPlaceholderText(/Dán URL ảnh HTTPS/)
    fireEvent.change(urlInput, { target: { value: 'https://images.unsplash.com/photo-test' } })

    const addBtn = screen.getByRole('button', { name: 'Thêm' })
    fireEvent.click(addBtn)

    expect(screen.getByAltText('Ảnh đính kèm 1')).toBeInTheDocument()
    expect(screen.getByText(/Đã bỏ màu nền vì bài viết có đính kèm ảnh hoặc video/)).toBeInTheDocument()
  })

  it('inserts emoji into textarea at caret position', () => {
    render(<TestWrapper defaultValues={{ body: 'Chào ' }} />)
    const emojiToolbarBtn = screen.getByRole('button', { name: 'Chèn biểu tượng cảm xúc' })
    fireEvent.click(emojiToolbarBtn)

    const smileyEmoji = screen.getByRole('button', { name: 'Chèn 😀' })
    fireEvent.click(smileyEmoji)

    const textarea = screen.getByPlaceholderText(/Alice, bạn đang nghĩ gì thế\?/) as HTMLTextAreaElement
    expect(textarea.value).toContain('😀')
  })
})
