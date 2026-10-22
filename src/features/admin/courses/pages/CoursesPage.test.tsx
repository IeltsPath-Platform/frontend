import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { HttpError } from '@/lib/httpClient'
import { CoursesPage } from './CoursesPage'

const { api, lessons } = vi.hoisted(() => ({ api: { fetchCourses: vi.fn(), createCourse: vi.fn(), updateCourse: vi.fn(), createTopic: vi.fn(), updateTopic: vi.fn() }, lessons: { fetchTopics: vi.fn() } }))
vi.mock('../api/courseApi', () => api)
vi.mock('../../lessons/api/lessonApi', () => lessons)
const course = { id: 'c1', code: 'FOUNDATION', name: 'Nền tảng 5.5', bandLevel: 5.5, status: 'ACTIVE', createdAt: '', updatedAt: '' }
const topics = [
  { id: 't1', code: 'WRITING', name: 'Viết học thuật', parentTopicId: null, courseId: 'c1', sortOrder: 1, status: 'ACTIVE', skill: 'WRITING', bandMin: 5, bandMax: 6 },
  { id: 't2', code: 'PARAPHRASE', name: 'Diễn đạt lại', parentTopicId: 't1', courseId: 'c1', sortOrder: 1, status: 'ACTIVE', skill: 'WRITING', bandMin: 5, bandMax: 6 },
  { id: 't3', code: 'COHESION', name: 'Liên kết câu', parentTopicId: 't1', courseId: 'c1', sortOrder: 2, status: 'ACTIVE', skill: 'WRITING', bandMin: null, bandMax: null },
]
function show() { return render(<MemoryRouter><CoursesPage /></MemoryRouter>) }
describe('CoursesPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    api.updateTopic.mockReset()
    api.fetchCourses.mockResolvedValue([course])
    lessons.fetchTopics.mockResolvedValue(topics)
    api.createCourse.mockResolvedValue(course)
    api.updateCourse.mockResolvedValue(course)
    api.createTopic.mockResolvedValue(topics[0])
    api.updateTopic.mockResolvedValue(topics[0])
  })
  it('shows courses and nests child topics under their parent', async () => {
    show()
    const parent = await screen.findByRole('article', { name: 'Viết học thuật' })
    expect(parent.parentElement).toContainElement(screen.getByRole('article', { name: 'Diễn đạt lại' }))
    expect(within(parent).getByRole('link', { name: 'Mở bài học' })).toHaveAttribute('href', '/content-author/lessons?topicId=t1')
  })
  it('creates a course with a numeric band', async () => {
    show()
    fireEvent.click(screen.getByRole('button', { name: 'Tạo khóa học' }))
    const form = screen.getByRole('form', { name: 'Tạo khóa học' })
    fireEvent.change(within(form).getByLabelText('Mã khóa học'), { target: { value: 'INTENSIVE_70' } })
    fireEvent.change(within(form).getByLabelText('Tên khóa học'), { target: { value: 'Intensive 7.0' } })
    fireEvent.change(within(form).getByLabelText('Band khóa học'), { target: { value: '7' } })
    fireEvent.submit(form)
    await waitFor(() => expect(api.createCourse).toHaveBeenCalledWith({ code: 'INTENSIVE_70', name: 'Intensive 7.0', bandLevel: 7 }))
  })
  it('updates course status without sending its code', async () => {
    show()
    fireEvent.click(await screen.findByRole('button', { name: 'Sửa khóa học' }))
    const form = screen.getByRole('form', { name: 'Sửa khóa học' })
    fireEvent.change(within(form).getByLabelText('Trạng thái khóa học'), { target: { value: 'INACTIVE' } })
    fireEvent.submit(form)
    await waitFor(() => expect(api.updateCourse).toHaveBeenCalledWith('c1', { name: course.name, bandLevel: 5.5, status: 'INACTIVE' }))
  })
  it('blocks a reversed band range', async () => {
    show()
    fireEvent.click(await screen.findByRole('button', { name: 'Sửa Diễn đạt lại' }))
    const form = screen.getByRole('form', { name: 'Sửa chủ đề' })
    fireEvent.change(within(form).getByLabelText('Band thấp nhất'), { target: { value: '8' } })
    fireEvent.submit(form)
    expect(screen.getByRole('alert')).toHaveTextContent('Band thấp nhất phải nhỏ hơn hoặc bằng band cao nhất.')
    expect(api.updateTopic).not.toHaveBeenCalled()
  })
  it('shows the skill lock error in Vietnamese', async () => {
    api.updateTopic.mockRejectedValue(new HttpError(409, 'Skill locked', { details: { code: 'TOPIC_SKILL_LOCKED' } }))
    show()
    fireEvent.click(await screen.findByRole('button', { name: 'Sửa Diễn đạt lại' }))
    const form = screen.getByRole('form', { name: 'Sửa chủ đề' })
    fireEvent.change(within(form).getByLabelText('Kỹ năng'), { target: { value: 'READING' } })
    fireEvent.submit(form)
    expect(await screen.findByRole('alert')).toHaveTextContent('Chủ đề đã có bài xuất bản, không đổi kỹ năng được')
  })
  it('creates a child in the selected course', async () => {
    show()
    const parent = await screen.findByRole('article', { name: 'Viết học thuật' })
    fireEvent.click(within(parent).getByRole('button', { name: 'Thêm chủ đề con' }))
    const form = screen.getByRole('form', { name: 'Tạo chủ đề' })
    fireEvent.change(within(form).getByLabelText('Mã chủ đề'), { target: { value: 'ESSAY' } })
    fireEvent.change(within(form).getByLabelText('Tên chủ đề'), { target: { value: 'Viết bài luận' } })
    fireEvent.change(within(form).getByLabelText('Kỹ năng'), { target: { value: 'WRITING' } })
    fireEvent.submit(form)
    await waitFor(() => expect(api.createTopic).toHaveBeenCalledWith(expect.objectContaining({ parentTopicId: 't1', courseId: 'c1', code: 'ESSAY', skill: 'WRITING', sortOrder: 3 })))
  })
  it('swaps the order of two siblings while preserving other fields', async () => {
    show()
    fireEvent.click(await screen.findByRole('button', { name: 'Đưa Diễn đạt lại xuống' }))
    await waitFor(() => expect(api.updateTopic).toHaveBeenCalledTimes(2))
    expect(api.updateTopic).toHaveBeenNthCalledWith(1, 't2', expect.objectContaining({ name: 'Diễn đạt lại', parentTopicId: 't1', sortOrder: 2 }))
    expect(api.updateTopic).toHaveBeenNthCalledWith(2, 't3', expect.objectContaining({ name: 'Liên kết câu', parentTopicId: 't1', sortOrder: 1 }))
  })

  it('normalizes all tied siblings before moving a topic without changing other parent groups', async () => {
    let stored = [
      { ...topics[0]! }, { ...topics[1]!, sortOrder: 4 }, { ...topics[2]!, sortOrder: 4 },
      { ...topics[1]!, id: 't4', code: 'SUMMARY', name: 'Tóm tắt', sortOrder: 8 },
      { ...topics[1]!, id: 't5', parentTopicId: 'outside-course', code: 'OTHER', name: 'Chủ đề khác', sortOrder: 4 },
    ]
    lessons.fetchTopics.mockImplementation(async () => stored)
    api.updateTopic.mockImplementation(async (id, body) => {
      stored = stored.map((item) => item.id === id ? { ...item, ...body } : item)
      return stored.find((item) => item.id === id)
    })
    show()
    fireEvent.click(await screen.findByRole('button', { name: 'Đưa Diễn đạt lại lên' }))
    await waitFor(() => expect(lessons.fetchTopics).toHaveBeenCalledTimes(2))
    await waitFor(() => {
      const group = screen.getByRole('article', { name: 'Viết học thuật' }).parentElement!
      expect(within(group).getAllByRole('article').map((item) => item.getAttribute('aria-label'))).toEqual(['Viết học thuật', 'Diễn đạt lại', 'Liên kết câu', 'Tóm tắt'])
    })
    expect(api.updateTopic.mock.calls.map(([id]) => id)).toEqual(['t3', 't2', 't4', 't2', 't3'])
    expect(stored.find((item) => item.id === 't5')?.sortOrder).toBe(4)
    expect(stored.find((item) => item.id === 't1')?.sortOrder).toBe(1)
  })

  it('stops after a normalization failure and reloads the saved partial order', async () => {
    let stored = [{ ...topics[0]! }, { ...topics[1]!, sortOrder: 4 }, { ...topics[2]!, sortOrder: 4 }]
    lessons.fetchTopics.mockImplementation(async () => stored)
    api.updateTopic.mockImplementation(async (id, body) => {
      if (id === 't2') throw new HttpError(503, 'Chưa lưu được chủ đề')
      stored = stored.map((item) => item.id === id ? { ...item, ...body } : item)
      return stored.find((item) => item.id === id)
    })
    show()
    fireEvent.click(await screen.findByRole('button', { name: 'Đưa Diễn đạt lại lên' }))
    await waitFor(() => expect(lessons.fetchTopics).toHaveBeenCalledTimes(2))
    expect(api.updateTopic).toHaveBeenCalledTimes(2)
    expect(await screen.findByRole('alert')).toHaveTextContent('Chưa lưu được chủ đề')
    expect(screen.getByRole('alert')).toHaveTextContent('Kiểm tra lại thứ tự trong danh sách trước khi thử lại.')
    expect(stored.find((item) => item.id === 't3')?.sortOrder).toBe(0)
    expect(stored.find((item) => item.id === 't2')?.sortOrder).toBe(4)
    await waitFor(() => expect(screen.getByRole('button', { name: 'Đưa Diễn đạt lại lên' })).toBeEnabled())
  })
  it('offers retry after a list failure', async () => {
    api.fetchCourses.mockRejectedValueOnce(new HttpError(503, 'Không tải được khóa học'))
    show()
    expect(await screen.findByRole('alert')).toHaveTextContent('Không tải được khóa học')
    fireEvent.click(screen.getByRole('button', { name: 'Thử lại' }))
    expect(await screen.findByRole('article', { name: 'Viết học thuật' })).toBeInTheDocument()
  })

  it('retains an unfinished topic while saving course metadata', async () => {
    show()
    fireEvent.click(await screen.findByRole('button', { name: 'Sửa Diễn đạt lại' }))
    const topicForm = screen.getByRole('form', { name: 'Sửa chủ đề' })
    fireEvent.change(within(topicForm).getByLabelText('Tên chủ đề'), { target: { value: 'Tên chưa lưu' } })
    fireEvent.click(screen.getByRole('button', { name: 'Sửa khóa học' }))
    fireEvent.submit(screen.getByRole('form', { name: 'Sửa khóa học' }))
    await waitFor(() => expect(api.fetchCourses).toHaveBeenCalledTimes(2))
    expect(within(screen.getByRole('form', { name: 'Sửa chủ đề' })).getByLabelText('Tên chủ đề')).toHaveValue('Tên chưa lưu')
  })

  it('does not reorder displayed roots with different real parents', async () => {
    lessons.fetchTopics.mockResolvedValue([topics[0], { ...topics[1], parentTopicId: 'outside-course', sortOrder: 2 }])
    show()
    expect(await screen.findByRole('button', { name: 'Đưa Viết học thuật xuống' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Đưa Diễn đạt lại lên' })).toBeDisabled()
    expect(api.updateTopic).not.toHaveBeenCalled()
  })

  it('locks reorder and other editors while a topic form is open', async () => {
    show()
    fireEvent.click(await screen.findByRole('button', { name: 'Sửa Diễn đạt lại' }))
    expect(screen.getByRole('button', { name: 'Đưa Diễn đạt lại xuống' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Sửa Liên kết câu' })).toBeDisabled()
    fireEvent.click(within(screen.getByRole('form', { name: 'Sửa chủ đề' })).getByRole('button', { name: 'Hủy' }))
    expect(screen.getByRole('button', { name: 'Đưa Diễn đạt lại xuống' })).toBeEnabled()
  })
})
