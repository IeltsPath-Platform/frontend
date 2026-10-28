import { fireEvent, render, screen, waitFor } from '@/test/render'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { HttpError } from '@/lib/httpClient'
import type { TopicOption } from '../../lessons/types'
import { TopicForm } from './TopicForm'

const { api } = vi.hoisted(() => ({ api: { createTopic: vi.fn(), updateTopic: vi.fn() } }))
vi.mock('../api/courseApi', () => api)

const message = 'Thứ tự 4 đã có chủ đề khác cùng cấp'
const conflict = () => new HttpError(409, message, { message, details: { code: 'SORT_ORDER_TAKEN' } })
const courses = [
  { id: 'course-one', code: 'FIRST', name: 'Khóa đầu tiên', bandLevel: 5.5, status: 'ACTIVE' as const, createdAt: '', updatedAt: '' },
  { id: 'course-two', code: 'SECOND', name: 'Khóa thứ hai', bandLevel: 7, status: 'ACTIVE' as const, createdAt: '', updatedAt: '' },
]
const topic: TopicOption = { id: 'topic-edit', code: 'ORIGINAL', name: 'Tên ban đầu', parentTopicId: null, courseId: courses[0]!.id, sortOrder: 1, status: 'ACTIVE', skill: 'WRITING', bandMin: 5, bandMax: 6 }
const parent: TopicOption = { ...topic, id: 'parent', code: 'PARENT', name: 'Chủ đề cha', sortOrder: 2 }
const legacyChild: TopicOption = { ...topic, id: 'legacy-child', code: 'LEGACY', name: 'Chủ đề con cũ', parentTopicId: parent.id, sortOrder: 3 }
const body = { name: 'Tên đang chỉnh sửa', parentTopicId: null, courseId: courses[1]!.id, skill: 'READING', bandMin: 6.5, bandMax: 8, sortOrder: 4 }
function show(editing = false) {
  const saved = vi.fn()
  render(<TopicForm topic={editing ? topic : undefined} parentId={null} courseId={courses[0]!.id} courses={courses} topics={[parent, topic]} onSaved={saved} onCancel={vi.fn()} />)
  return saved
}
function fill(editing = false) {
  if (!editing) fireEvent.change(screen.getByLabelText('Mã chủ đề'), { target: { value: 'NEW_TOPIC' } })
  fireEvent.change(screen.getByLabelText('Tên chủ đề'), { target: { value: body.name } })
  fireEvent.change(screen.getByLabelText('Thuộc khóa học'), { target: { value: body.courseId } })
  fireEvent.change(screen.getByLabelText('Kỹ năng'), { target: { value: body.skill } })
  fireEvent.change(screen.getByLabelText('Band thấp nhất'), { target: { value: String(body.bandMin) } })
  fireEvent.change(screen.getByLabelText('Band cao nhất'), { target: { value: String(body.bandMax) } })
  fireEvent.change(screen.getByLabelText('Thứ tự chủ đề'), { target: { value: String(body.sortOrder) } })
  if (editing) fireEvent.change(screen.getByLabelText('Trạng thái chủ đề'), { target: { value: 'INACTIVE' } })
}
function expectRetained(editing = false) {
  expect(screen.getByLabelText('Mã chủ đề')).toHaveValue(editing ? topic.code : 'NEW_TOPIC')
  expect(screen.getByLabelText('Tên chủ đề')).toHaveValue(body.name)
  expect(screen.getByLabelText('Thuộc khóa học')).toHaveValue(body.courseId)
  expect(screen.getByLabelText('Kỹ năng')).toHaveValue(body.skill)
  expect(screen.getByLabelText('Band thấp nhất')).toHaveValue(body.bandMin)
  expect(screen.getByLabelText('Band cao nhất')).toHaveValue(body.bandMax)
  expect(screen.getByLabelText('Thứ tự chủ đề')).toHaveValue(body.sortOrder)
  if (editing) expect(screen.getByLabelText('Trạng thái chủ đề')).toHaveValue('INACTIVE')
}

describe('TopicForm order conflicts', () => {
  beforeEach(() => { api.createTopic.mockReset(); api.updateTopic.mockReset() })

  it.each([false, true])('retains every controlled field and associates the server error with the order field (editing=%s)', async (editing) => {
    api.createTopic.mockRejectedValue(conflict())
    api.updateTopic.mockRejectedValue(conflict())
    const saved = show(editing)
    fill(editing)
    const order = screen.getByLabelText('Thứ tự chủ đề')
    fireEvent.submit(screen.getByRole('form'))
    const alert = await screen.findByRole('alert')
    expect(alert.textContent).toBe(message)
    expect(order).toHaveAttribute('aria-invalid', 'true')
    expect(order).toHaveAttribute('aria-describedby', alert.id)
    expect(alert.id).not.toBe('')
    expect(order.parentElement?.parentElement).toContainElement(alert)
    expectRetained(editing)
    expect(screen.getByRole('button', { name: 'Lưu chủ đề' })).toBeEnabled()
    if (editing) {
      expect(api.updateTopic).toHaveBeenCalledExactlyOnceWith(topic.id, { ...body, status: 'INACTIVE' })
      expect(api.createTopic).not.toHaveBeenCalled()
    } else {
      expect(api.createTopic).toHaveBeenCalledExactlyOnceWith({ ...body, code: 'NEW_TOPIC' })
      expect(api.updateTopic).not.toHaveBeenCalled()
    }
    expect(saved).not.toHaveBeenCalled()
  })

  it('clears the order error when corrected and retries only after an explicit submission', async () => {
    api.updateTopic.mockRejectedValueOnce(conflict()).mockResolvedValue(topic)
    const saved = show(true)
    fill(true)
    fireEvent.submit(screen.getByRole('form'))
    await screen.findByRole('alert')
    const order = screen.getByLabelText('Thứ tự chủ đề')
    fireEvent.change(order, { target: { value: '5' } })
    expect(order).not.toHaveAttribute('aria-invalid', 'true')
    expect(order).not.toHaveAttribute('aria-describedby')
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    expect(api.updateTopic).toHaveBeenCalledTimes(1)
    expect(saved).not.toHaveBeenCalled()
    fireEvent.submit(screen.getByRole('form'))
    await waitFor(() => expect(saved).toHaveBeenCalledTimes(1))
    expect(api.updateTopic).toHaveBeenNthCalledWith(2, topic.id, { ...body, sortOrder: 5, status: 'INACTIVE' })
    expect(api.updateTopic).toHaveBeenCalledTimes(2)
    expect(api.createTopic).not.toHaveBeenCalled()
  })

  it('keeps an unrelated skill lock error global without invalidating the order', async () => {
    api.updateTopic.mockRejectedValue(new HttpError(409, 'Skill locked', { details: { code: 'TOPIC_SKILL_LOCKED' } }))
    const saved = show(true)
    fill(true)
    fireEvent.submit(screen.getByRole('form'))
    const alert = await screen.findByRole('alert')
    expect(alert).toHaveTextContent('Chủ đề đã có bài xuất bản, không đổi kỹ năng được')
    const order = screen.getByLabelText('Thứ tự chủ đề')
    expect(order).not.toHaveAttribute('aria-invalid', 'true')
    expect(order).not.toHaveAttribute('aria-describedby')
    expect(order.parentElement?.parentElement).not.toContainElement(alert)
    expectRetained(true)
    expect(api.updateTopic).toHaveBeenCalledTimes(1)
    expect(api.createTopic).not.toHaveBeenCalled()
    expect(saved).not.toHaveBeenCalled()
  })

  it('offers no parent for a new topic or a top-level one', () => {
    const { unmount } = render(<TopicForm parentId={null} courseId={courses[0]!.id} courses={courses} topics={[parent, topic]} onSaved={vi.fn()} onCancel={vi.fn()} />)
    expect(screen.queryByLabelText('Chủ đề cha')).not.toBeInTheDocument()
    unmount()
    render(<TopicForm topic={topic} parentId={null} courseId={courses[0]!.id} courses={courses} topics={[parent, topic]} onSaved={vi.fn()} onCancel={vi.fn()} />)
    expect(screen.queryByLabelText('Chủ đề cha')).not.toBeInTheDocument()
  })

  it('creates a new topic at the top level', async () => {
    api.createTopic.mockResolvedValue(topic)
    const saved = show()
    fill()
    fireEvent.submit(screen.getByRole('form'))
    await waitFor(() => expect(saved).toHaveBeenCalledTimes(1))
    expect(api.createTopic).toHaveBeenCalledExactlyOnceWith(expect.objectContaining({ code: 'NEW_TOPIC', parentTopicId: null }))
  })

  it('still shows the parent of a topic that has one, so it can be moved back to the top level', async () => {
    api.updateTopic.mockRejectedValueOnce(conflict()).mockResolvedValue(legacyChild)
    const saved = vi.fn()
    render(<TopicForm topic={legacyChild} parentId={parent.id} courseId={courses[0]!.id} courses={courses} topics={[parent, legacyChild]} onSaved={saved} onCancel={vi.fn()} />)
    const select = screen.getByLabelText('Chủ đề cha')
    expect(select).toHaveValue(parent.id)
    fireEvent.change(screen.getByLabelText('Thứ tự chủ đề'), { target: { value: '4' } })
    fireEvent.submit(screen.getByRole('form'))
    await screen.findByRole('alert')
    // A stale sibling conflict goes away once the parent changes, without submitting by itself.
    fireEvent.change(select, { target: { value: '' } })
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    expect(screen.getByLabelText('Thứ tự chủ đề')).not.toHaveAttribute('aria-invalid', 'true')
    expect(api.updateTopic).toHaveBeenCalledTimes(1)
    fireEvent.submit(screen.getByRole('form'))
    await waitFor(() => expect(saved).toHaveBeenCalledTimes(1))
    expect(api.updateTopic).toHaveBeenNthCalledWith(2, legacyChild.id, expect.objectContaining({ parentTopicId: null, sortOrder: 4 }))
  })

  it('sends a metadata edit with the unchanged parent and order even when displayed siblings are tied', async () => {
    api.updateTopic.mockResolvedValue(topic)
    const saved = vi.fn()
    render(<TopicForm topic={topic} parentId={null} courseId={courses[0]!.id} courses={courses} topics={[topic, { ...parent, sortOrder: topic.sortOrder }]} onSaved={saved} onCancel={vi.fn()} />)
    fireEvent.change(screen.getByLabelText('Tên chủ đề'), { target: { value: 'Chỉ đổi tên' } })
    fireEvent.submit(screen.getByRole('form'))
    await waitFor(() => expect(saved).toHaveBeenCalledTimes(1))
    expect(api.updateTopic).toHaveBeenCalledExactlyOnceWith(topic.id, {
      name: 'Chỉ đổi tên', parentTopicId: topic.parentTopicId, courseId: topic.courseId,
      skill: topic.skill, bandMin: topic.bandMin, bandMax: topic.bandMax,
      sortOrder: topic.sortOrder, status: topic.status,
    })
    expect(api.createTopic).not.toHaveBeenCalled()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })
})
