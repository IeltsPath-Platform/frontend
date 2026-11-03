import { fireEvent, render, screen, waitFor } from '@/test/render'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { CourseForm } from './CourseForm'

const { api, media } = vi.hoisted(() => ({
  api: { createCourse: vi.fn(), updateCourse: vi.fn() },
  media: { uploadAdminImage: vi.fn() },
}))
vi.mock('../api/courseApi', () => api)
vi.mock('../../media/api/mediaUploadApi', () => media)

const course = {
  id: 'course-1', code: 'B1', name: 'Band 5', bandLevel: 5, coverImageUrl: null, description: null,
  skillUnlockPoints: { LISTENING: 80, READING: 90 }, comboUnlockPoints: 150,
  status: 'ACTIVE' as const, createdAt: '', updatedAt: '',
}

describe('CourseForm unlock pricing', () => {
  beforeEach(() => { api.createCourse.mockReset(); api.updateCourse.mockReset(); media.uploadAdminImage.mockReset() })

  it('saves server-editable skill and combo prices', async () => {
    api.updateCourse.mockResolvedValue(course)
    const saved = vi.fn()
    render(<CourseForm course={course} onSaved={saved} />)
    fireEvent.change(screen.getByLabelText('Nghe'), { target: { value: '100' } })
    fireEvent.change(screen.getByLabelText('Gói kết hợp'), { target: { value: '160' } })
    fireEvent.submit(screen.getByRole('form'))
    await waitFor(() => expect(saved).toHaveBeenCalledOnce())
    expect(api.updateCourse).toHaveBeenCalledWith(course.id, expect.objectContaining({
      skillUnlockPoints: { LISTENING: 100, READING: 90 }, comboUnlockPoints: 160,
    }))
  })

  it('marks a course free, hides its prices and sends none', async () => {
    api.updateCourse.mockResolvedValue({ ...course, free: true })
    render(<CourseForm course={course} onSaved={vi.fn()} />)
    fireEvent.click(screen.getByLabelText('Khóa học miễn phí cho mọi người'))
    expect(screen.queryByLabelText('Gói kết hợp')).not.toBeInTheDocument()
    fireEvent.submit(screen.getByRole('form'))
    await waitFor(() => expect(api.updateCourse).toHaveBeenCalledWith(course.id, expect.objectContaining({
      free: true, skillUnlockPoints: {}, comboUnlockPoints: null,
    })))
  })

  it('creates a course as free when asked', async () => {
    api.createCourse.mockResolvedValue({ ...course, free: true })
    render(<CourseForm onSaved={vi.fn()} />)
    fireEvent.change(screen.getByLabelText('Mã khóa học'), { target: { value: 'FOUNDATION' } })
    fireEvent.change(screen.getByLabelText('Tên khóa học'), { target: { value: 'Foundation' } })
    fireEvent.change(screen.getByLabelText('Band khóa học'), { target: { value: '4' } })
    fireEvent.click(screen.getByLabelText('Khóa học miễn phí cho mọi người'))
    fireEvent.submit(screen.getByRole('form'))
    await waitFor(() => expect(api.createCourse).toHaveBeenCalledWith(expect.objectContaining({ code: 'FOUNDATION', free: true })))
  })

  it('lets prices be set when a course is created', async () => {
    api.createCourse.mockResolvedValue(course)
    render(<CourseForm onSaved={vi.fn()} />)
    fireEvent.change(screen.getByLabelText('Mã khóa học'), { target: { value: 'IELTS_9' } })
    fireEvent.change(screen.getByLabelText('Tên khóa học'), { target: { value: 'IELTS 9' } })
    fireEvent.change(screen.getByLabelText('Band khóa học'), { target: { value: '9' } })
    fireEvent.change(screen.getByLabelText('Đọc'), { target: { value: '40' } })
    fireEvent.change(screen.getByLabelText('Viết'), { target: { value: '30' } })
    fireEvent.change(screen.getByLabelText('Gói kết hợp'), { target: { value: '60' } })
    fireEvent.submit(screen.getByRole('form'))
    await waitFor(() => expect(api.createCourse).toHaveBeenCalledWith(expect.objectContaining({
      code: 'IELTS_9', skillUnlockPoints: { READING: 40, WRITING: 30 }, comboUnlockPoints: 60, free: false,
    })))
  })

  it('keeps the banner and the cover as two separate images', async () => {
    api.updateCourse.mockResolvedValue(course)
    media.uploadAdminImage.mockResolvedValueOnce({
      mediaReference: 'content-image/author-1/banner.png',
      mediaUrl: 'https://storage.example/content-image/author-1/banner.png',
      contentType: 'image/png', sizeBytes: 3,
    })
    render(<CourseForm course={{ ...course, coverImageUrl: 'content-image/author-1/cover.png' }} onSaved={vi.fn()} />)
    const file = new File(['png'], 'banner.png', { type: 'image/png' })
    fireEvent.change(screen.getByLabelText('Banner khóa học'), { target: { files: [file] } })
    await screen.findByAltText('Xem trước banner khóa học')
    expect(screen.getByText(/1600×500/)).toBeInTheDocument()
    fireEvent.submit(screen.getByRole('form'))
    await waitFor(() => expect(api.updateCourse).toHaveBeenCalledWith(course.id, expect.objectContaining({
      coverImageUrl: 'content-image/author-1/cover.png', bannerImageUrl: 'content-image/author-1/banner.png',
    })))
  })

  it('offers a box to pick or drop an image while there is none, and replace and remove once there is', async () => {
    api.updateCourse.mockResolvedValue(course)
    media.uploadAdminImage.mockResolvedValueOnce({
      mediaReference: 'content-image/author-1/cover.png',
      mediaUrl: 'https://storage.example/content-image/author-1/cover.png',
      contentType: 'image/png', sizeBytes: 3,
    })
    render(<CourseForm course={course} onSaved={vi.fn()} />)
    expect(screen.getByRole('button', { name: 'Chọn ảnh bìa khóa học' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Thay ảnh bìa' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Xóa ảnh bìa' })).not.toBeInTheDocument()

    const file = new File(['png'], 'cover.png', { type: 'image/png' })
    fireEvent.drop(screen.getByRole('button', { name: 'Chọn ảnh bìa khóa học' }), { dataTransfer: { files: [file] } })
    await screen.findByAltText('Xem trước ảnh bìa khóa học')
    expect(media.uploadAdminImage).toHaveBeenCalledWith('/api/content/admin/media/image', file)
    expect(screen.queryByRole('button', { name: 'Chọn ảnh bìa khóa học' })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Thay ảnh bìa' })).toBeEnabled()
    expect(screen.getByRole('button', { name: 'Xóa ảnh bìa' })).toBeEnabled()
    // The banner is a separate image and is still empty.
    expect(screen.getByRole('button', { name: 'Chọn banner khóa học' })).toBeInTheDocument()
  })

  it('says the shape and size of each image in a few characters instead of a paragraph', () => {
    render(<CourseForm course={course} onSaved={vi.fn()} />)
    expect(screen.getByText('16:9 · 800×450 px')).toBeInTheDocument()
    expect(screen.getByText('16:5 · 1600×500 px')).toBeInTheDocument()
    expect(screen.queryByText(/Hiện trên thẻ khóa/)).not.toBeInTheDocument()
  })

  it('removes only the banner when asked', async () => {
    api.updateCourse.mockResolvedValue(course)
    render(<CourseForm course={{ ...course, coverImageUrl: 'content-image/author-1/cover.png', bannerImageUrl: 'content-image/author-1/banner.png' }} onSaved={vi.fn()} />)
    fireEvent.click(screen.getByRole('button', { name: 'Xóa banner' }))
    fireEvent.submit(screen.getByRole('form'))
    await waitFor(() => expect(api.updateCourse).toHaveBeenCalledWith(course.id, expect.objectContaining({
      coverImageUrl: 'content-image/author-1/cover.png', bannerImageUrl: null,
    })))
  })

  it('rejects a combo price below the highest skill price', async () => {
    render(<CourseForm course={course} onSaved={vi.fn()} />)
    fireEvent.change(screen.getByLabelText('Gói kết hợp'), { target: { value: '80' } })
    fireEvent.submit(screen.getByRole('form'))
    expect(await screen.findByRole('alert')).toHaveTextContent('không được thấp hơn')
    expect(api.updateCourse).not.toHaveBeenCalled()
  })

  it('uploads a selected cover and saves its media reference', async () => {
    api.updateCourse.mockResolvedValue(course)
    media.uploadAdminImage.mockResolvedValue({
      mediaReference: 'content-image/author-1/cover.png',
      mediaUrl: 'https://storage.example/content-image/author-1/cover.png',
      contentType: 'image/png', sizeBytes: 3,
    })
    render(<CourseForm course={course} onSaved={vi.fn()} />)

    const file = new File(['png'], 'cover.png', { type: 'image/png' })
    fireEvent.change(screen.getByLabelText('Ảnh bìa khóa học'), { target: { files: [file] } })

    await waitFor(() => expect(media.uploadAdminImage).toHaveBeenCalledWith('/api/content/admin/media/image', file))
    fireEvent.submit(screen.getByRole('form'))
    await waitFor(() => expect(api.updateCourse).toHaveBeenCalledWith(course.id, expect.objectContaining({
      coverImageUrl: 'content-image/author-1/cover.png',
    })))
  })

  it('clears the cover so the course update sends null', async () => {
    const courseWithCover = { ...course, coverImageUrl: 'https://old.example/cover.jpg' }
    api.updateCourse.mockResolvedValue(courseWithCover)
    render(<CourseForm course={courseWithCover} onSaved={vi.fn()} />)

    fireEvent.click(screen.getByRole('button', { name: 'Xóa ảnh bìa' }))
    fireEvent.submit(screen.getByRole('form'))

    await waitFor(() => expect(api.updateCourse).toHaveBeenCalledWith(course.id, expect.objectContaining({ coverImageUrl: null })))
  })
})
