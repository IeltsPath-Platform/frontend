import { render, screen, fireEvent } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { useForm } from 'react-hook-form'
import { PostComposerModal, type PostFormValues } from './PostComposerModal'

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

  it('renders disabled "Từ máy tính" tab with "Sắp có" badge in media panel', () => {
    render(<TestWrapper />)
    const mediaToolbarBtn = screen.getByRole('button', { name: 'Đính kèm ảnh hoặc video' })
    fireEvent.click(mediaToolbarBtn)

    const uploadTab = screen.getByRole('button', { name: /Từ máy tính/ })
    fireEvent.click(uploadTab)

    expect(screen.getByText('Sắp có')).toBeInTheDocument()
    const disabledFileBtn = screen.getByRole('button', { name: /Chọn tệp từ máy tính/ })
    expect(disabledFileBtn).toBeDisabled()
    expect(disabledFileBtn).toHaveAttribute('aria-disabled', 'true')
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

    const urlTab = screen.getByRole('button', { name: /Nhập URL/ })
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
