import { fireEvent, render, screen, waitFor } from '@/test/render'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NewLessonForm } from './NewLessonForm'

const { lessons, codes } = vi.hoisted(() => ({
  lessons: { createLesson: vi.fn() },
  codes: { fetchCodeSettings: vi.fn(), fetchCodeSuggestion: vi.fn() },
}))
vi.mock('../api/lessonApi', () => lessons)
vi.mock('../../code-settings/api/codeSettingsApi', () => codes)

const topicId = 'topic-1'
const setting = (applied: boolean, editable = true) => ({ kind: 'LESSON', applied, pattern: '{TOPIC}_L{SEQ:2}', startNumber: 1, editable })
function show() {
  const created = vi.fn()
  render(<NewLessonForm onCancel={vi.fn()} onCreated={created} topicId={topicId} />)
  return created
}

describe('NewLessonForm code', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    lessons.createLesson.mockResolvedValue(undefined)
    codes.fetchCodeSettings.mockResolvedValue([setting(true)])
    codes.fetchCodeSuggestion.mockResolvedValue({ code: 'ESSAYS_L03', applied: true, editable: true })
  })

  it('fills in the code suggested for the topic and sends it with the lesson', async () => {
    const created = show()
    await waitFor(() => expect(screen.getByLabelText('Mã bài học')).toHaveValue('ESSAYS_L03'))
    expect(codes.fetchCodeSuggestion).toHaveBeenCalledWith({ kind: 'LESSON', topicId }, expect.any(AbortSignal))
    expect(screen.getByLabelText('Mã bài học')).not.toHaveAttribute('aria-required')
    fireEvent.change(screen.getByLabelText('Tiêu đề'), { target: { value: 'Viết mở bài' } })
    fireEvent.submit(screen.getByRole('form', { name: 'Bài học mới' }))
    await waitFor(() => expect(created).toHaveBeenCalledOnce())
    expect(lessons.createLesson).toHaveBeenCalledWith(topicId, expect.objectContaining({ code: 'ESSAYS_L03', title: 'Viết mở bài' }))
  })

  it('keeps the code the author typed over the suggestion', async () => {
    show()
    await waitFor(() => expect(screen.getByLabelText('Mã bài học')).toHaveValue('ESSAYS_L03'))
    fireEvent.change(screen.getByLabelText('Mã bài học'), { target: { value: 'MY_LESSON' } })
    fireEvent.change(screen.getByLabelText('Tiêu đề'), { target: { value: 'Tên' } })
    fireEvent.submit(screen.getByRole('form', { name: 'Bài học mới' }))
    await waitFor(() => expect(lessons.createLesson).toHaveBeenCalled())
    expect(lessons.createLesson.mock.calls[0]![1]).toHaveProperty('code', 'MY_LESSON')
  })

  it('locks the code and leaves it out of the request when the settings do not let it be changed', async () => {
    codes.fetchCodeSettings.mockResolvedValue([setting(true, false)])
    codes.fetchCodeSuggestion.mockResolvedValue({ code: 'ESSAYS_L03', applied: true, editable: false })
    show()
    await waitFor(() => expect(screen.getByLabelText('Mã bài học')).toBeDisabled())
    fireEvent.change(screen.getByLabelText('Tiêu đề'), { target: { value: 'Tên' } })
    fireEvent.submit(screen.getByRole('form', { name: 'Bài học mới' }))
    await waitFor(() => expect(lessons.createLesson).toHaveBeenCalled())
    expect(lessons.createLesson.mock.calls[0]![1]).not.toHaveProperty('code')
  })

  it('asks for the code under its field when generating is off', async () => {
    codes.fetchCodeSettings.mockResolvedValue([setting(false)])
    show()
    await waitFor(() => expect(screen.getByLabelText('Mã bài học')).toHaveAttribute('aria-required', 'true'))
    fireEvent.change(screen.getByLabelText('Tiêu đề'), { target: { value: 'Tên' } })
    fireEvent.submit(screen.getByRole('form', { name: 'Bài học mới' }))
    expect(await screen.findByText('Mã bài học không được để trống.')).toBeInTheDocument()
    expect(lessons.createLesson).not.toHaveBeenCalled()
    expect(codes.fetchCodeSuggestion).not.toHaveBeenCalled()
  })

  it('lets the server choose the code when no suggestion could be made', async () => {
    codes.fetchCodeSuggestion.mockResolvedValue({ code: '', applied: true, editable: true })
    show()
    await waitFor(() => expect(codes.fetchCodeSuggestion).toHaveBeenCalled())
    fireEvent.change(screen.getByLabelText('Tiêu đề'), { target: { value: 'Tên' } })
    fireEvent.submit(screen.getByRole('form', { name: 'Bài học mới' }))
    await waitFor(() => expect(lessons.createLesson).toHaveBeenCalled())
    expect(lessons.createLesson.mock.calls[0]![1]).toHaveProperty('code', '')
  })
})
