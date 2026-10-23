import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { PackageCreateForm } from './PackageCreateForm'

const api = vi.hoisted(() => ({ createPackage: vi.fn(), createDraftVersion: vi.fn(), listPracticeSources: vi.fn() }))
const courses = vi.hoisted(() => ({ fetchCourses: vi.fn() }))
const lessons = vi.hoisted(() => ({ fetchTopics: vi.fn(), fetchLessons: vi.fn() }))
vi.mock('../api/packageApi', () => api)
vi.mock('../../courses/api/courseApi', () => courses)
vi.mock('../../lessons/api/lessonApi', () => lessons)
const courseId = '11111111-1111-4111-8111-111111111111'
const topicId = '22222222-2222-4222-8222-222222222222'
const lessonId = '33333333-3333-4333-8333-333333333333'
const packageId = '44444444-4444-4444-8444-444444444444'

function titleAndCode() {
  fireEvent.change(screen.getByLabelText('Mã gói'), { target: { value: 'FINAL-READING' } })
  fireEvent.change(screen.getByLabelText('Tiêu đề gói'), { target: { value: 'Đề ôn đọc' } })
}
function submit() { fireEvent.submit(screen.getByRole('form', { name: 'Tạo gói câu hỏi' })) }

describe('PackageCreateForm', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    api.createPackage.mockResolvedValue({ id: packageId })
    api.createDraftVersion.mockResolvedValue({ id: 'version' })
    api.listPracticeSources.mockResolvedValue([{ code: 'CAMBRIDGE', name: 'Cambridge' }])
    courses.fetchCourses.mockResolvedValue([{ id: courseId, code: 'COURSE', name: 'Khóa đọc' }])
    lessons.fetchTopics.mockResolvedValue([{ id: topicId, courseId, code: 'TOPIC', name: 'Chủ đề đọc' }])
    lessons.fetchLessons.mockResolvedValue([{ id: lessonId, code: 'LESSON', title: 'Bài học đọc' }])
  })

  it('creates a topic final test and then a draft version before opening the package', async () => {
    const onCreated = vi.fn()
    render(<PackageCreateForm initialType="TOPIC_TEST" onCreated={onCreated} onCancel={vi.fn()} />)
    titleAndCode()
    await screen.findByRole('option', { name: 'COURSE · Khóa đọc' })
    fireEvent.change(screen.getByLabelText('Khóa học'), { target: { value: courseId } })
    fireEvent.change(screen.getByLabelText('Chủ đề'), { target: { value: topicId } })
    submit()
    await waitFor(() => expect(onCreated).toHaveBeenCalledWith(packageId))
    expect(api.createPackage).toHaveBeenCalledWith({ code: 'FINAL-READING', title: 'Đề ôn đọc', packageType: 'TOPIC_TEST', accessLevel: 'FREE', topicId, courseId: null, lessonId: null, sourceCode: null })
    expect(api.createDraftVersion).toHaveBeenCalledWith(packageId, '{}')
    expect(api.createPackage.mock.invocationCallOrder[0]).toBeLessThan(api.createDraftVersion.mock.invocationCallOrder[0]!)
    expect(api.createDraftVersion.mock.invocationCallOrder[0]).toBeLessThan(onCreated.mock.invocationCallOrder[0]!)
  })

  it('offers seven creatable types and switches bindings without offering LESSON', async () => {
    render(<PackageCreateForm initialType="COURSE_TEST" onCreated={vi.fn()} onCancel={vi.fn()} />)
    expect(within(screen.getByLabelText('Loại gói')).getAllByRole('option')).toHaveLength(7)
    expect(within(screen.getByLabelText('Loại gói')).queryByRole('option', { name: 'Bài học' })).not.toBeInTheDocument()
    expect(screen.getByLabelText('Khóa học')).toBeInTheDocument()
    expect(screen.queryByLabelText('Chủ đề')).not.toBeInTheDocument()
    fireEvent.change(screen.getByLabelText('Loại gói'), { target: { value: 'PRACTICE_TEST' } })
    expect(screen.getByLabelText('Nguồn đề (tùy chọn)')).toBeInTheDocument()
    expect(screen.queryByLabelText('Khóa học')).not.toBeInTheDocument()
    expect(screen.queryByLabelText('Bài học')).not.toBeInTheDocument()
    await screen.findByRole('option', { name: 'Cambridge' })
  })

  it('requires and submits the lesson binding for a practice set', async () => {
    render(<PackageCreateForm onCreated={vi.fn()} onCancel={vi.fn()} />)
    titleAndCode()
    submit()
    expect(await screen.findByRole('alert')).toHaveTextContent('Chọn khóa học')
    expect(api.createPackage).not.toHaveBeenCalled()
    await screen.findByRole('option', { name: 'COURSE · Khóa đọc' })
    fireEvent.change(screen.getByLabelText('Khóa học'), { target: { value: courseId } })
    fireEvent.change(screen.getByLabelText('Chủ đề'), { target: { value: topicId } })
    await screen.findByRole('option', { name: 'LESSON · Bài học đọc' })
    fireEvent.change(screen.getByLabelText('Bài học'), { target: { value: lessonId } })
    submit()
    await waitFor(() => expect(api.createPackage).toHaveBeenCalledWith(expect.objectContaining({ packageType: 'PRACTICE_SET', lessonId, courseId: null, topicId: null })))
  })

  it('allows a practice test without an external source', async () => {
    render(<PackageCreateForm initialType="PRACTICE_TEST" onCreated={vi.fn()} onCancel={vi.fn()} />)
    titleAndCode()
    submit()
    await waitFor(() => expect(api.createPackage).toHaveBeenCalledWith(expect.objectContaining({ sourceCode: null, lessonId: null, topicId: null, courseId: null })))
  })

  it('keeps a created package available when draft creation fails without creating it twice', async () => {
    const onCreated = vi.fn()
    api.createDraftVersion.mockRejectedValue(new Error('Không tạo được bản nháp'))
    render(<PackageCreateForm initialType="QUIZ" onCreated={onCreated} onCancel={vi.fn()} />)
    titleAndCode()
    submit()
    expect(await screen.findByRole('alert')).toHaveTextContent('Gói đã được tạo nhưng chưa tạo được phiên bản nháp')
    expect(screen.getByRole('button', { name: 'Tạo gói và bản nháp' })).toBeDisabled()
    submit()
    expect(api.createPackage).toHaveBeenCalledTimes(1)
    fireEvent.click(screen.getByRole('button', { name: 'Mở gói đã tạo' }))
    expect(onCreated).toHaveBeenCalledWith(packageId)
  })

  it('retains input values after a failed create and ignores navigation after unmount', async () => {
    const onCreated = vi.fn()
    api.createPackage.mockRejectedValueOnce(new Error('Mất kết nối'))
    const { unmount } = render(<PackageCreateForm initialType="QUIZ" onCreated={onCreated} onCancel={vi.fn()} />)
    titleAndCode()
    submit()
    expect(await screen.findByRole('alert')).toBeInTheDocument()
    expect(screen.getByLabelText('Mã gói')).toHaveValue('FINAL-READING')
    expect(screen.getByLabelText('Tiêu đề gói')).toHaveValue('Đề ôn đọc')
    let resolve!: (value: { id: string }) => void
    api.createPackage.mockReturnValueOnce(new Promise((resolveRequest) => { resolve = resolveRequest }))
    submit()
    expect(screen.getByLabelText('Mã gói')).toBeDisabled()
    unmount()
    await act(async () => resolve({ id: packageId }))
    expect(api.createDraftVersion).toHaveBeenCalledWith(packageId, '{}')
    expect(onCreated).not.toHaveBeenCalled()
  })
})
