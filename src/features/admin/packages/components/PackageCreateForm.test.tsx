import { act, fireEvent, render, screen, waitFor, within } from '@/test/render'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { PackageCreateForm } from './PackageCreateForm'

const api = vi.hoisted(() => ({ createPackage: vi.fn(), createDraftVersion: vi.fn(), listPracticeSources: vi.fn() }))
const courses = vi.hoisted(() => ({ fetchCourses: vi.fn() }))
const lessons = vi.hoisted(() => ({ fetchTopics: vi.fn(), fetchLessons: vi.fn() }))
const codes = vi.hoisted(() => ({ fetchCodeSettings: vi.fn(), fetchCodeSuggestion: vi.fn() }))
vi.mock('../api/packageApi', () => api)
vi.mock('../../code-settings/api/codeSettingsApi', () => codes)
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
    codes.fetchCodeSettings.mockResolvedValue([])
    codes.fetchCodeSuggestion.mockResolvedValue({ code: '', applied: true, editable: true })
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
    expect(screen.queryByLabelText('Kho đề đầu vào')).not.toBeInTheDocument()
    expect(screen.queryByLabelText('Khóa học')).not.toBeInTheDocument()
    expect(screen.queryByLabelText('Bài học')).not.toBeInTheDocument()
    await screen.findByRole('option', { name: 'Cambridge' })
  })

  it('requires and submits the lesson binding for a practice set', async () => {
    render(<PackageCreateForm onCreated={vi.fn()} onCancel={vi.fn()} />)
    titleAndCode()
    submit()
    expect((await screen.findAllByRole('alert')).map((alert) => alert.textContent)).toEqual(['Chọn khóa học.', 'Chọn chủ đề.', 'Chọn bài học.'])
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

  it('requires a placement pool and sends it when creating a placement test', async () => {
    render(<PackageCreateForm initialType="PLACEMENT_TEST" onCreated={vi.fn()} onCancel={vi.fn()} />)
    titleAndCode()
    submit()
    expect(await screen.findByRole('alert')).toHaveTextContent('Chọn kho đề đầu vào')
    expect(api.createPackage).not.toHaveBeenCalled()
    const pool = screen.getByLabelText('Kho đề đầu vào')
    expect(pool).toBeRequired()
    fireEvent.change(pool, { target: { value: 'BAND_3_5' } })
    submit()
    await waitFor(() => expect(api.createPackage).toHaveBeenCalledWith(expect.objectContaining({ packageType: 'PLACEMENT_TEST', placementPool: 'BAND_3_5' })))
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

describe('PackageCreateForm code', () => {
  const packageSetting = (editable = true) => ({ kind: 'PACKAGE', applied: true, pattern: '{COURSE}_{TYPE}{SEQ:2}', startNumber: 1, editable })
  beforeEach(() => {
    codes.fetchCodeSettings.mockResolvedValue([packageSetting()])
    codes.fetchCodeSuggestion.mockResolvedValue({ code: 'COURSE_PS01', applied: true, editable: true })
  })

  it('asks for a code that matches what the package will belong to', async () => {
    render(<PackageCreateForm initialType="TOPIC_TEST" onCreated={vi.fn()} onCancel={vi.fn()} />)
    await waitFor(() => expect(screen.getByLabelText('Mã gói')).toHaveValue('COURSE_PS01'))
    expect(codes.fetchCodeSuggestion).toHaveBeenLastCalledWith({ kind: 'PACKAGE', packageType: 'TOPIC_TEST' }, expect.any(AbortSignal))
    await screen.findByRole('option', { name: 'COURSE · Khóa đọc' })
    fireEvent.change(screen.getByLabelText('Khóa học'), { target: { value: courseId } })
    fireEvent.change(screen.getByLabelText('Chủ đề'), { target: { value: topicId } })
    await waitFor(() => expect(codes.fetchCodeSuggestion).toHaveBeenLastCalledWith({ kind: 'PACKAGE', packageType: 'TOPIC_TEST', topicId }, expect.any(AbortSignal)))
  })

  it('reads a course test by its course and a practice set by its lesson', async () => {
    render(<PackageCreateForm initialType="COURSE_TEST" onCreated={vi.fn()} onCancel={vi.fn()} />)
    await screen.findByRole('option', { name: 'COURSE · Khóa đọc' })
    fireEvent.change(screen.getByLabelText('Khóa học'), { target: { value: courseId } })
    await waitFor(() => expect(codes.fetchCodeSuggestion).toHaveBeenLastCalledWith({ kind: 'PACKAGE', packageType: 'COURSE_TEST', courseId }, expect.any(AbortSignal)))
    fireEvent.change(screen.getByLabelText('Loại gói'), { target: { value: 'PRACTICE_SET' } })
    fireEvent.change(screen.getByLabelText('Khóa học'), { target: { value: courseId } })
    fireEvent.change(screen.getByLabelText('Chủ đề'), { target: { value: topicId } })
    await screen.findByRole('option', { name: 'LESSON · Bài học đọc' })
    fireEvent.change(screen.getByLabelText('Bài học'), { target: { value: lessonId } })
    await waitFor(() => expect(codes.fetchCodeSuggestion).toHaveBeenLastCalledWith({ kind: 'PACKAGE', packageType: 'PRACTICE_SET', lessonId }, expect.any(AbortSignal)))
  })

  it('sends the generated code, and does not require one while it is generated', async () => {
    render(<PackageCreateForm initialType="PLACEMENT_TEST" onCreated={vi.fn()} onCancel={vi.fn()} />)
    await waitFor(() => expect(screen.getByLabelText('Mã gói')).toHaveValue('COURSE_PS01'))
    expect(screen.getByLabelText('Mã gói')).not.toHaveAttribute('aria-required')
    fireEvent.change(screen.getByLabelText('Tiêu đề gói'), { target: { value: 'Đề đầu vào' } })
    fireEvent.change(screen.getByLabelText('Kho đề đầu vào'), { target: { value: 'BAND_0_3' } })
    submit()
    await waitFor(() => expect(api.createPackage).toHaveBeenCalled())
    expect(api.createPackage.mock.calls[0]![0]).toMatchObject({ code: 'COURSE_PS01', packageType: 'PLACEMENT_TEST' })
  })

  it('locks the code and leaves it out of the request when the settings do not let it be changed', async () => {
    codes.fetchCodeSettings.mockResolvedValue([packageSetting(false)])
    codes.fetchCodeSuggestion.mockResolvedValue({ code: 'COURSE_PS01', applied: true, editable: false })
    render(<PackageCreateForm initialType="PLACEMENT_TEST" onCreated={vi.fn()} onCancel={vi.fn()} />)
    await waitFor(() => expect(screen.getByLabelText('Mã gói')).toBeDisabled())
    fireEvent.change(screen.getByLabelText('Tiêu đề gói'), { target: { value: 'Đề đầu vào' } })
    fireEvent.change(screen.getByLabelText('Kho đề đầu vào'), { target: { value: 'BAND_0_3' } })
    submit()
    await waitFor(() => expect(api.createPackage).toHaveBeenCalled())
    expect(api.createPackage.mock.calls[0]![0]).not.toHaveProperty('code')
  })
})