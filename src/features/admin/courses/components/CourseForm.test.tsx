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
