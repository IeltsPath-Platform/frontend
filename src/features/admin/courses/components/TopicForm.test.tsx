import { fireEvent, render, screen, waitFor } from '@/test/render'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { HttpError } from '@/lib/httpClient'
import type { TopicOption } from '../../lessons/types'
import { SKILL_LABEL } from '../types'
import { TopicForm } from './TopicForm'

const { api, codes } = vi.hoisted(() => ({ api: { createTopic: vi.fn(), updateTopic: vi.fn() }, codes: { fetchCodeSettings: vi.fn(), fetchCodeSuggestion: vi.fn() } }))
vi.mock('../api/courseApi', () => api)
vi.mock('../../code-settings/api/codeSettingsApi', () => codes)

const message = 'Thứ tự 4 đã có chủ đề khác cùng cấp'
const conflict = () => new HttpError(409, message, { message, details: { code: 'SORT_ORDER_TAKEN' } })
const courses = [
  { id: 'course-one', code: 'FIRST', name: 'Khóa đầu tiên', bandLevel: 5.5, coverImageUrl: null, description: null, status: 'ACTIVE' as const, createdAt: '', updatedAt: '' },
  { id: 'course-two', code: 'SECOND', name: 'Khóa thứ hai', bandLevel: 7, coverImageUrl: null, description: null, status: 'ACTIVE' as const, createdAt: '', updatedAt: '' },
]
const topic: TopicOption = { id: 'topic-edit', code: 'ORIGINAL', name: 'Tên ban đầu', parentTopicId: null, courseId: courses[0]!.id, sortOrder: 1, status: 'ACTIVE', skill: 'WRITING', bandMin: 5, bandMax: 6 }
const parent: TopicOption = { ...topic, id: 'parent', code: 'PARENT', name: 'Chủ đề cha', sortOrder: 2 }
const legacyChild: TopicOption = { ...topic, id: 'legacy-child', code: 'LEGACY', name: 'Chủ đề con cũ', parentTopicId: parent.id, sortOrder: 3 }
const body = { name: 'Tên đang chỉnh sửa', description: null, parentTopicId: null, courseId: courses[1]!.id, skill: 'READING' }
// A new topic goes last among its siblings in the course; an edited one keeps the position it has.
const createdBody = { ...body, bandMin: null, bandMax: null, sortOrder: 3 }
const editedBody = { ...body, bandMin: topic.bandMin, bandMax: topic.bandMax, sortOrder: topic.sortOrder }
const chooseSkill = (skill: keyof typeof SKILL_LABEL) => fireEvent.click(screen.getByRole('radio', { name: SKILL_LABEL[skill] }))
function show(editing = false) {
  const saved = vi.fn()
  render(<TopicForm topic={editing ? topic : undefined} parentId={null} courseId={courses[0]!.id} courses={courses} topics={[parent, topic]} onSaved={saved} onCancel={vi.fn()} />)
  return saved
}
function fill(editing = false) {
  if (!editing) fireEvent.change(screen.getByLabelText('Mã chủ đề'), { target: { value: 'NEW_TOPIC' } })
  fireEvent.change(screen.getByLabelText('Tên chủ đề'), { target: { value: body.name } })
  if (editing) fireEvent.change(screen.getByLabelText('Thuộc khóa học'), { target: { value: body.courseId } })
  chooseSkill('READING')
  if (editing) fireEvent.change(screen.getByLabelText('Trạng thái chủ đề'), { target: { value: 'INACTIVE' } })
}
function expectRetained(editing = false) {
  expect(screen.getByLabelText('Mã chủ đề')).toHaveValue(editing ? topic.code : 'NEW_TOPIC')
  expect(screen.getByLabelText('Tên chủ đề')).toHaveValue(body.name)
  if (editing) expect(screen.getByLabelText('Thuộc khóa học')).toHaveValue(body.courseId)
  expect(screen.getByRole('radio', { name: SKILL_LABEL.READING })).toBeChecked()
  if (editing) expect(screen.getByLabelText('Trạng thái chủ đề')).toHaveValue('INACTIVE')
}

describe('TopicForm order conflicts', () => {
  beforeEach(() => {
    api.createTopic.mockReset(); api.updateTopic.mockReset()
    codes.fetchCodeSettings.mockReset().mockResolvedValue([])
    codes.fetchCodeSuggestion.mockReset().mockResolvedValue({ code: '', applied: true, editable: true })
  })

  it.each([false, true])('retains every controlled field and shows the server refusal as a message under no field (editing=%s)', async (editing) => {
    api.createTopic.mockRejectedValue(conflict())
    api.updateTopic.mockRejectedValue(conflict())
    const saved = show(editing)
    fill(editing)
    fireEvent.submit(screen.getByRole('form'))
    const alert = await screen.findByRole('alert')
    expect(alert.textContent).toBe(message)
    expect(alert.closest('.adm-field')).toBeNull()
    expectRetained(editing)
    expect(screen.getByRole('button', { name: 'Lưu chủ đề' })).toBeEnabled()
    if (editing) {
      expect(api.updateTopic).toHaveBeenCalledExactlyOnceWith(topic.id, { ...editedBody, status: 'INACTIVE' })
      expect(api.createTopic).not.toHaveBeenCalled()
    } else {
      expect(api.createTopic).toHaveBeenCalledExactlyOnceWith({ ...createdBody, courseId: courses[0]!.id, code: 'NEW_TOPIC' })
      expect(api.updateTopic).not.toHaveBeenCalled()
    }
    expect(saved).not.toHaveBeenCalled()
  })

  it('retries after a server refusal only on an explicit submission', async () => {
    api.updateTopic.mockRejectedValueOnce(conflict()).mockResolvedValue(topic)
    const saved = show(true)
    fill(true)
    fireEvent.submit(screen.getByRole('form'))
    await screen.findByRole('alert')
    fireEvent.change(screen.getByLabelText('Tên chủ đề'), { target: { value: 'Tên sửa lại' } })
    expect(api.updateTopic).toHaveBeenCalledTimes(1)
    expect(saved).not.toHaveBeenCalled()
    fireEvent.submit(screen.getByRole('form'))
    await waitFor(() => expect(saved).toHaveBeenCalledTimes(1))
    expect(api.updateTopic).toHaveBeenNthCalledWith(2, topic.id, { ...editedBody, name: 'Tên sửa lại', status: 'INACTIVE' })
    expect(api.updateTopic).toHaveBeenCalledTimes(2)
    expect(api.createTopic).not.toHaveBeenCalled()
  })

  it('keeps an unrelated skill lock error global, under no field', async () => {
    api.updateTopic.mockRejectedValue(new HttpError(409, 'Skill locked', { details: { code: 'TOPIC_SKILL_LOCKED' } }))
    const saved = show(true)
    fill(true)
    fireEvent.submit(screen.getByRole('form'))
    const alert = await screen.findByRole('alert')
    expect(alert).toHaveTextContent('Chủ đề đã có bài xuất bản, không đổi kỹ năng được')
    expect(alert.closest('.adm-field')).toBeNull()
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

  it('creates a topic in the course being shown without offering another course', async () => {
    api.createTopic.mockResolvedValue(topic)
    const saved = vi.fn()
    render(<TopicForm parentId={null} courseId={courses[1]!.id} courses={courses} topics={[]} onSaved={saved} onCancel={vi.fn()} />)
    expect(screen.queryByLabelText('Thuộc khóa học')).not.toBeInTheDocument()
    fill()
    fireEvent.submit(screen.getByRole('form'))
    await waitFor(() => expect(saved).toHaveBeenCalledTimes(1))
    expect(api.createTopic).toHaveBeenCalledExactlyOnceWith(expect.objectContaining({ code: 'NEW_TOPIC', courseId: courses[1]!.id }))
  })

  it('creates a topic with no course on the tab of topics without one', async () => {
    api.createTopic.mockResolvedValue(topic)
    const saved = vi.fn()
    render(<TopicForm parentId={null} courseId={null} courses={courses} topics={[]} onSaved={saved} onCancel={vi.fn()} />)
    fill()
    fireEvent.submit(screen.getByRole('form'))
    await waitFor(() => expect(saved).toHaveBeenCalledTimes(1))
    expect(api.createTopic).toHaveBeenCalledExactlyOnceWith(expect.objectContaining({ courseId: null }))
  })

  it('offers a choice of course only for an existing topic, to move it', () => {
    show(true)
    expect(screen.getByLabelText('Thuộc khóa học')).toHaveValue(topic.courseId)
  })

  it('still shows the parent of a topic that has one, so it can be moved back to the top level', async () => {
    api.updateTopic.mockRejectedValueOnce(conflict()).mockResolvedValue(legacyChild)
    const saved = vi.fn()
    render(<TopicForm topic={legacyChild} parentId={parent.id} courseId={courses[0]!.id} courses={courses} topics={[parent, legacyChild]} onSaved={saved} onCancel={vi.fn()} />)
    const select = screen.getByLabelText('Chủ đề cha')
    expect(select).toHaveValue(parent.id)
    fireEvent.submit(screen.getByRole('form'))
    await screen.findByRole('alert')
    // Moving the topic to the top level does not submit by itself.
    fireEvent.change(select, { target: { value: '' } })
    expect(api.updateTopic).toHaveBeenCalledTimes(1)
    fireEvent.submit(screen.getByRole('form'))
    await waitFor(() => expect(saved).toHaveBeenCalledTimes(1))
    expect(api.updateTopic).toHaveBeenNthCalledWith(2, legacyChild.id, expect.objectContaining({ parentTopicId: null, sortOrder: legacyChild.sortOrder }))
  })

  it('sends a metadata edit with the unchanged parent and order even when displayed siblings are tied', async () => {
    api.updateTopic.mockResolvedValue(topic)
    const saved = vi.fn()
    render(<TopicForm topic={topic} parentId={null} courseId={courses[0]!.id} courses={courses} topics={[topic, { ...parent, sortOrder: topic.sortOrder }]} onSaved={saved} onCancel={vi.fn()} />)
    fireEvent.change(screen.getByLabelText('Tên chủ đề'), { target: { value: 'Chỉ đổi tên' } })
    fireEvent.submit(screen.getByRole('form'))
    await waitFor(() => expect(saved).toHaveBeenCalledTimes(1))
    expect(api.updateTopic).toHaveBeenCalledExactlyOnceWith(topic.id, {
      name: 'Chỉ đổi tên', description: null, parentTopicId: topic.parentTopicId, courseId: topic.courseId,
      skill: topic.skill, bandMin: topic.bandMin, bandMax: topic.bandMax,
      sortOrder: topic.sortOrder, status: topic.status,
    })
    expect(api.createTopic).not.toHaveBeenCalled()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('suggests a scoped code after course and skill context is ready', async () => {
    codes.fetchCodeSettings.mockResolvedValue([{ kind: 'TOPIC', applied: true, pattern: '{COURSE}_{SKILL}_T{SEQ:2}', startNumber: 1, editable: true }])
    codes.fetchCodeSuggestion.mockResolvedValue({ code: 'FIRST_R_T01', applied: true, editable: true })
    show()
    chooseSkill('READING')
    await waitFor(() => expect(codes.fetchCodeSuggestion).toHaveBeenCalledWith({ kind: 'TOPIC', courseId: courses[0]!.id, skill: 'READING' }, expect.any(AbortSignal)))
    await waitFor(() => expect(screen.getByLabelText('Mã chủ đề')).toHaveValue('FIRST_R_T01'))
    // The code is the first field of the form; it fills in once the skill it depends on is chosen.
    expect(screen.getByLabelText('Mã chủ đề').compareDocumentPosition(screen.getByRole('group', { name: 'Kỹ năng' })) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
  })

  it('preserves a manually entered topic code when suggestion context changes', async () => {
    codes.fetchCodeSettings.mockResolvedValue([{ kind: 'TOPIC', applied: true, pattern: '{COURSE}_T{SEQ:2}', startNumber: 1, editable: true }])
    codes.fetchCodeSuggestion.mockResolvedValue({ code: 'FIRST_T01', applied: true, editable: true })
    show()
    await waitFor(() => expect(codes.fetchCodeSuggestion).toHaveBeenCalled())
    const code = screen.getByLabelText('Mã chủ đề')
    fireEvent.change(code, { target: { value: 'MY_CODE' } })
    chooseSkill('READING')
    await waitFor(() => expect(codes.fetchCodeSuggestion).toHaveBeenCalledTimes(2))
    expect(code).toHaveValue('MY_CODE')
  })

  it('locks the code input and omits the code from create when editing is disabled', async () => {
    codes.fetchCodeSettings.mockResolvedValue([{ kind: 'TOPIC', applied: true, pattern: '{COURSE}_T{SEQ:2}', startNumber: 1, editable: false }])
    codes.fetchCodeSuggestion.mockResolvedValue({ code: 'FIRST_T01', applied: true, editable: false })
    const saved = show()
    await waitFor(() => expect(screen.getByLabelText('Mã chủ đề')).toBeDisabled())
    fill()
    fireEvent.submit(screen.getByRole('form'))
    await waitFor(() => expect(api.createTopic).toHaveBeenCalled())
    expect(api.createTopic.mock.calls[0]![0]).not.toHaveProperty('code')
    expect(saved).toHaveBeenCalledOnce()
  })

  it('allows manual entry when settings or suggestion cannot be loaded', async () => {
    codes.fetchCodeSettings.mockRejectedValue(new Error('offline'))
    const saved = show()
    await waitFor(() => expect(screen.getByLabelText('Mã chủ đề')).toBeEnabled())
    fill()
    fireEvent.submit(screen.getByRole('form'))
    await waitFor(() => expect(saved).toHaveBeenCalledOnce())
    expect(api.createTopic.mock.calls[0]![0]).toHaveProperty('code', 'NEW_TOPIC')
  })
})

describe('TopicForm field errors', () => {
  beforeEach(() => { api.createTopic.mockReset(); api.updateTopic.mockReset() })

  it('marks code and name as required, and the skill only for a topic of a course', () => {
    const { container, unmount } = render(<TopicForm parentId={null} courseId={courses[0]!.id} courses={courses} topics={[]} onSaved={vi.fn()} onCancel={vi.fn()} />)
    expect(screen.getByLabelText('Mã chủ đề')).toHaveAttribute('aria-required', 'true')
    expect(screen.getByLabelText('Tên chủ đề')).toHaveAttribute('aria-required', 'true')
    expect(screen.getByRole('group', { name: 'Kỹ năng' }).querySelector('.adm-required')).not.toBeNull()
    expect(container.querySelectorAll('.adm-required').length).toBeGreaterThanOrEqual(3)
    unmount()
    render(<TopicForm parentId={null} courseId={null} courses={courses} topics={[]} onSaved={vi.fn()} onCancel={vi.fn()} />)
    expect(screen.getByRole('group', { name: 'Kỹ năng' }).querySelector('.adm-required')).toBeNull()
  })

  it('sent empty, shows each missing field under it and sends nothing', () => {
    render(<TopicForm parentId={null} courseId={courses[0]!.id} courses={courses} topics={[]} onSaved={vi.fn()} onCancel={vi.fn()} />)
    fireEvent.submit(screen.getByRole('form'))
    expect(screen.getAllByRole('alert').map((alert) => alert.textContent)).toEqual([
      'Mã chủ đề không được để trống.', 'Tên chủ đề không được để trống.', 'Chọn kỹ năng cho chủ đề thuộc khóa học.',
    ])
    expect(screen.getByLabelText('Mã chủ đề')).toHaveFocus()
    expect(api.createTopic).not.toHaveBeenCalled()
  })

  it('does not ask for the band range, and sends none for a new topic', () => {
    render(<TopicForm parentId={null} courseId={null} courses={courses} topics={[]} onSaved={vi.fn()} onCancel={vi.fn()} />)
    expect(screen.queryByLabelText('Band thấp nhất')).not.toBeInTheDocument()
    expect(screen.queryByLabelText('Band cao nhất')).not.toBeInTheDocument()
  })

  it('does not ask for the position, and puts a new topic last among its siblings in the course', async () => {
    api.createTopic.mockResolvedValue(topic)
    render(<TopicForm parentId={null} courseId={courses[0]!.id} courses={courses} topics={[parent, topic, { ...topic, id: 'other-course', courseId: courses[1]!.id, sortOrder: 40 }]} onSaved={vi.fn()} onCancel={vi.fn()} />)
    expect(screen.queryByLabelText('Thứ tự chủ đề')).not.toBeInTheDocument()
    fill()
    fireEvent.submit(screen.getByRole('form'))
    await waitFor(() => expect(api.createTopic).toHaveBeenCalled())
    expect(api.createTopic.mock.calls[0]![0]).toHaveProperty('sortOrder', 3)
  })
})

describe('TopicForm descriptions', () => {
  it('sends a trimmed topic description', async () => {
    api.createTopic.mockResolvedValue(topic)
    const saved = show()
    fill()
    fireEvent.change(screen.getByLabelText('Mô tả chủ đề'), { target: { value: '  Mô tả bài học  ' } })
    fireEvent.submit(screen.getByRole('form'))
    await waitFor(() => expect(api.createTopic).toHaveBeenCalledWith({ ...createdBody, courseId: courses[0]!.id, code: 'NEW_TOPIC', description: 'Mô tả bài học' }))
    expect(saved).toHaveBeenCalledOnce()
  })
})
