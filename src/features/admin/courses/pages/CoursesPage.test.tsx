import { fireEvent, render, screen, waitFor, within } from '@/test/render'
import { answerConfirm } from '@/test/confirm'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { HttpError } from '@/lib/httpClient'
import { CoursesPage } from './CoursesPage'

const { api, lessons } = vi.hoisted(() => ({ api: { fetchCourses: vi.fn(), createCourse: vi.fn(), updateCourse: vi.fn(), createTopic: vi.fn(), updateTopic: vi.fn(), reorderTopics: vi.fn() }, lessons: { fetchTopics: vi.fn(), fetchLessons: vi.fn() } }))
vi.mock('../api/courseApi', () => api)
vi.mock('../../lessons/api/lessonApi', () => lessons)
const course = { id: 'c1', code: 'FOUNDATION', name: 'Nền tảng 5.5', bandLevel: 5.5, coverImageUrl: null, description: null, status: 'ACTIVE', createdAt: '', updatedAt: '' }
const topics = [
  { id: 't1', code: 'WRITING', name: 'Viết học thuật', parentTopicId: null, courseId: 'c1', sortOrder: 1, status: 'ACTIVE', skill: 'WRITING', bandMin: 5, bandMax: 6 },
  { id: 't2', code: 'PARAPHRASE', name: 'Diễn đạt lại', parentTopicId: 't1', courseId: 'c1', sortOrder: 1, status: 'ACTIVE', skill: 'WRITING', bandMin: 5, bandMax: 6 },
  { id: 't3', code: 'COHESION', name: 'Liên kết câu', parentTopicId: 't1', courseId: 'c1', sortOrder: 2, status: 'ACTIVE', skill: 'WRITING', bandMin: null, bandMax: null },
]
function show() { return render(<MemoryRouter><CoursesPage /></MemoryRouter>) }
/** Opens the actions menu of one topic row and picks an action from it. */
async function pick(topic: string, action: string) {
  fireEvent.click(await screen.findByRole('button', { name: `Thao tác với ${topic}` }))
  fireEvent.click(screen.getByRole('button', { name: action }))
}
describe('CoursesPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    api.updateTopic.mockReset()
    api.reorderTopics.mockReset()
    api.reorderTopics.mockResolvedValue(undefined)
    api.fetchCourses.mockResolvedValue([course])
    lessons.fetchTopics.mockResolvedValue(topics)
    lessons.fetchLessons.mockResolvedValue([])
    api.createCourse.mockResolvedValue(course)
    api.updateCourse.mockResolvedValue(course)
    api.createTopic.mockResolvedValue(topics[0])
    api.updateTopic.mockResolvedValue(topics[0])
  })
  it('shows courses and nests child topics under their parent', async () => {
    show()
    const parent = await screen.findByRole('article', { name: 'Viết học thuật' })
    expect(parent.parentElement).toContainElement(screen.getByRole('article', { name: 'Diễn đạt lại' }))
    expect(within(parent).getByRole('button', { name: 'Mở bài học' })).toBeEnabled()
  })

  it('opens the lessons of a topic in a panel over this page instead of going to another one', async () => {
    lessons.fetchLessons.mockResolvedValue([{ id: 'l1', topicId: 't1', code: 'L1', title: 'Viết mở bài', summary: null, sortOrder: 1, status: 'DRAFT', estimatedMinutes: null, blockCount: 1, knowledgePointCount: 1 }])
    show()
    const parent = await screen.findByRole('article', { name: 'Viết học thuật' })
    fireEvent.click(within(parent).getByRole('button', { name: 'Mở bài học' }))
    const drawer = screen.getByRole('dialog', { name: 'Viết học thuật' })
    expect(drawer).toHaveClass('adm-drawer--xl')
    expect(await within(drawer).findByRole('button', { name: 'Viết mở bài' })).toBeInTheDocument()
    expect(lessons.fetchLessons).toHaveBeenCalledWith('t1', expect.anything())
    fireEvent.click(within(drawer).getByRole('button', { name: 'Đóng' }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(screen.getByRole('article', { name: 'Viết học thuật' })).toBeInTheDocument()
  })
  it('creates a course with a numeric band', async () => {
    show()
    fireEvent.click(screen.getByRole('button', { name: 'Tạo khóa học' }))
    const form = screen.getByRole('form', { name: 'Tạo khóa học' })
    fireEvent.change(within(form).getByLabelText('Mã khóa học'), { target: { value: 'INTENSIVE_70' } })
    fireEvent.change(within(form).getByLabelText('Tên khóa học'), { target: { value: 'Intensive 7.0' } })
    fireEvent.change(within(form).getByLabelText('Band khóa học'), { target: { value: '7' } })
    fireEvent.change(within(form).getByLabelText('Ảnh bìa (URL)'), { target: { value: 'https://example.com/cover.jpg' } })
    fireEvent.change(within(form).getByLabelText('Mô tả khóa học'), { target: { value: 'Lộ trình nền tảng.' } })
    fireEvent.submit(form)
    await waitFor(() => expect(api.createCourse).toHaveBeenCalledWith({ code: 'INTENSIVE_70', name: 'Intensive 7.0', bandLevel: 7, coverImageUrl: 'https://example.com/cover.jpg', description: 'Lộ trình nền tảng.' }))
  })
  it('updates course status without sending its code', async () => {
    show()
    fireEvent.click(await screen.findByRole('button', { name: 'Sửa khóa học' }))
    const form = screen.getByRole('form', { name: 'Sửa khóa học' })
    fireEvent.change(within(form).getByLabelText('Trạng thái khóa học'), { target: { value: 'INACTIVE' } })
    fireEvent.change(within(form).getByLabelText('Ảnh bìa (URL)'), { target: { value: '' } })
    fireEvent.change(within(form).getByLabelText('Mô tả khóa học'), { target: { value: 'Mô tả mới' } })
    fireEvent.submit(form)
    await waitFor(() => expect(api.updateCourse).toHaveBeenCalledWith('c1', { name: course.name, bandLevel: 5.5, status: 'INACTIVE', coverImageUrl: null, description: 'Mô tả mới', skillUnlockPoints: {}, comboUnlockPoints: null }))
  })
  it('blocks a reversed band range', async () => {
    show()
    await pick('Diễn đạt lại', 'Sửa chủ đề')
    const form = screen.getByRole('form', { name: 'Sửa chủ đề' })
    fireEvent.change(within(form).getByLabelText('Band thấp nhất'), { target: { value: '8' } })
    fireEvent.submit(form)
    expect(screen.getByRole('alert')).toHaveTextContent('Band thấp nhất phải nhỏ hơn hoặc bằng band cao nhất.')
    expect(api.updateTopic).not.toHaveBeenCalled()
  })
  it('shows the skill lock error in Vietnamese', async () => {
    api.updateTopic.mockRejectedValue(new HttpError(409, 'Skill locked', { details: { code: 'TOPIC_SKILL_LOCKED' } }))
    show()
    await pick('Diễn đạt lại', 'Sửa chủ đề')
    const form = screen.getByRole('form', { name: 'Sửa chủ đề' })
    fireEvent.change(within(form).getByLabelText('Kỹ năng'), { target: { value: 'READING' } })
    fireEvent.submit(form)
    expect(await screen.findByRole('alert')).toHaveTextContent('Chủ đề đã có bài xuất bản, không đổi kỹ năng được')
  })
  it('creates a top-level topic in the selected course and offers no way to nest it', async () => {
    show()
    fireEvent.click(await screen.findByRole('button', { name: 'Thêm chủ đề' }))
    const form = screen.getByRole('form', { name: 'Tạo chủ đề' })
    expect(within(form).queryByLabelText('Chủ đề cha')).not.toBeInTheDocument()
    fireEvent.change(within(form).getByLabelText('Mã chủ đề'), { target: { value: 'ESSAY' } })
    fireEvent.change(within(form).getByLabelText('Tên chủ đề'), { target: { value: 'Viết bài luận' } })
    fireEvent.change(within(form).getByLabelText('Kỹ năng'), { target: { value: 'WRITING' } })
    fireEvent.submit(form)
    await waitFor(() => expect(api.createTopic).toHaveBeenCalledWith(expect.objectContaining({ parentTopicId: null, courseId: 'c1', code: 'ESSAY', skill: 'WRITING', sortOrder: 2 })))
  })

  it('has no action to add a child topic in a row menu', async () => {
    show()
    fireEvent.click(await screen.findByRole('button', { name: 'Thao tác với Viết học thuật' }))
    expect(screen.getByRole('button', { name: 'Sửa chủ đề' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /chủ đề con/ })).not.toBeInTheDocument()
  })

  it('reorders siblings with one atomic call that carries the whole group', async () => {
    show()
    await pick('Diễn đạt lại', 'Đưa xuống')
    await waitFor(() => expect(api.reorderTopics).toHaveBeenCalledTimes(1))
    expect(api.reorderTopics).toHaveBeenCalledWith('t1', ['t3', 't2'])
    expect(api.updateTopic).not.toHaveBeenCalled()
    await waitFor(() => expect(lessons.fetchTopics).toHaveBeenCalledTimes(2))
  })

  it('sends every topic of the parent even when only one course is shown', async () => {
    const roots = [
      { ...topics[0]!, id: 'r1', code: 'R1', name: 'Gốc một', sortOrder: 1 },
      { ...topics[0]!, id: 'x', code: 'X', name: 'Gốc khóa khác', courseId: 'c2', sortOrder: 2 },
      { ...topics[0]!, id: 'r2', code: 'R2', name: 'Gốc hai', sortOrder: 3 },
    ]
    lessons.fetchTopics.mockResolvedValue(roots)
    show()
    await pick('Gốc một', 'Đưa xuống')
    await waitFor(() => expect(api.reorderTopics).toHaveBeenCalledTimes(1))
    expect(api.reorderTopics).toHaveBeenCalledWith(null, ['r2', 'x', 'r1'])
  })

  it('lets tied siblings be reordered, since the server numbers the group again', async () => {
    const stored = [
      { ...topics[0]! }, { ...topics[1]!, sortOrder: 4 }, { ...topics[2]!, sortOrder: 4 },
      { ...topics[1]!, id: 't4', code: 'SUMMARY', name: 'Tóm tắt', sortOrder: 8 },
      { ...topics[1]!, id: 't5', parentTopicId: 'outside-course', code: 'OTHER', name: 'Chủ đề khác', sortOrder: 4 },
      { ...topics[1]!, id: 't6', parentTopicId: 'outside-course', code: 'OTHER_NEXT', name: 'Chủ đề kế', sortOrder: 5 },
    ]
    lessons.fetchTopics.mockResolvedValue(stored)
    show()
    fireEvent.click(await screen.findByRole('button', { name: 'Thao tác với Diễn đạt lại' }))
    const up = screen.getByRole('button', { name: 'Đưa lên' })
    expect(up).toBeEnabled()
    expect(screen.queryByText(/thứ tự trùng/)).not.toBeInTheDocument()
    fireEvent.click(up)
    await waitFor(() => expect(api.reorderTopics).toHaveBeenCalledTimes(1))
    // Tied topics are shown by code (COHESION, PARAPHRASE, SUMMARY); moving PARAPHRASE up swaps it with COHESION.
    expect(api.reorderTopics).toHaveBeenCalledWith('t1', ['t2', 't3', 't4'])
  })

  it('shows the server message and reloads the list when the reorder fails', async () => {
    api.reorderTopics.mockRejectedValue(new HttpError(503, 'Chưa lưu được thứ tự'))
    show()
    await pick('Diễn đạt lại', 'Đưa xuống')
    await waitFor(() => expect(lessons.fetchTopics).toHaveBeenCalledTimes(2))
    expect(await screen.findByRole('alert')).toHaveTextContent('Chưa lưu được thứ tự')
    expect(screen.getByRole('alert')).toHaveTextContent('Kiểm tra lại thứ tự trong danh sách trước khi thử lại.')
    expect(api.updateTopic).not.toHaveBeenCalled()
    await waitFor(() => expect(screen.getByRole('button', { name: 'Thao tác với Diễn đạt lại' })).toBeEnabled())
  })

  it('preserves an edited order when the server reports a sibling conflict without normalizing or retrying', async () => {
    lessons.fetchTopics.mockResolvedValue([topics[0], { ...topics[1]!, sortOrder: 4 }, { ...topics[2]!, sortOrder: 4 }])
    const message = 'Thứ tự 5 đã có chủ đề khác cùng cấp'
    api.updateTopic.mockRejectedValue(new HttpError(409, message, { message, details: { code: 'SORT_ORDER_TAKEN' } }))
    show()
    await pick('Diễn đạt lại', 'Sửa chủ đề')
    const form = screen.getByRole('form', { name: 'Sửa chủ đề' })
    fireEvent.change(within(form).getByLabelText('Tên chủ đề'), { target: { value: 'Tên đang chỉnh sửa' } })
    fireEvent.change(within(form).getByLabelText('Thứ tự chủ đề'), { target: { value: '5' } })
    fireEvent.submit(form)
    expect((await screen.findByRole('alert')).textContent).toBe(message)
    expect(api.updateTopic).toHaveBeenCalledExactlyOnceWith('t2', {
      name: 'Tên đang chỉnh sửa', description: null, parentTopicId: 't1', courseId: 'c1', skill: 'WRITING',
      bandMin: 5, bandMax: 6, sortOrder: 5, status: 'ACTIVE',
    })
    expect(within(form).getByLabelText('Tên chủ đề')).toHaveValue('Tên đang chỉnh sửa')
    expect(within(form).getByLabelText('Thứ tự chủ đề')).toHaveValue(5)
    expect(within(form).getByLabelText('Thứ tự chủ đề')).toHaveAttribute('aria-invalid', 'true')
    expect(within(form).getByRole('button', { name: 'Lưu chủ đề' })).toBeEnabled()
    expect(lessons.fetchTopics).toHaveBeenCalledTimes(1)
    fireEvent.click(within(form).getByRole('button', { name: 'Hủy' }))
    fireEvent.click(screen.getByRole('button', { name: 'Thao tác với Diễn đạt lại' }))
    expect(screen.getByRole('button', { name: 'Đưa xuống' })).toBeDisabled()
    expect(api.updateTopic).toHaveBeenCalledTimes(1)
  })

  it('offers retry after a list failure', async () => {
    api.fetchCourses.mockRejectedValueOnce(new HttpError(503, 'Không tải được khóa học'))
    show()
    expect(await screen.findByRole('alert')).toHaveTextContent('Không tải được khóa học')
    fireEvent.click(screen.getByRole('button', { name: 'Thử lại' }))
    expect(await screen.findByRole('article', { name: 'Viết học thuật' })).toBeInTheDocument()
  })

  it('opens course and topic forms in a right drawer, one at a time', async () => {
    show()
    await pick('Diễn đạt lại', 'Sửa chủ đề')
    const drawer = screen.getByRole('dialog', { name: 'Sửa chủ đề' })
    expect(drawer).toHaveClass('adm-drawer')
    expect(within(drawer).getByRole('form', { name: 'Sửa chủ đề' })).toBeInTheDocument()
    // The page behind the drawer is out of reach, so a second form cannot be opened over it.
    expect(screen.queryByRole('button', { name: 'Sửa khóa học' })).not.toBeInTheDocument()
    fireEvent.click(within(drawer).getByRole('button', { name: 'Hủy' }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Sửa khóa học' }))
    expect(screen.getByRole('dialog', { name: 'Sửa khóa học' })).toHaveClass('adm-drawer')
  })

  it('reloads the list and closes the drawer after a course is saved', async () => {
    show()
    fireEvent.click(await screen.findByRole('button', { name: 'Sửa khóa học' }))
    fireEvent.submit(screen.getByRole('form', { name: 'Sửa khóa học' }))
    await waitFor(() => expect(api.fetchCourses).toHaveBeenCalledTimes(2))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('does not reorder displayed roots with different real parents', async () => {
    lessons.fetchTopics.mockResolvedValue([topics[0], { ...topics[1], parentTopicId: 'outside-course', sortOrder: 2 }])
    show()
    const root = await screen.findByRole('article', { name: 'Viết học thuật' })
    fireEvent.click(within(root).getByRole('button', { name: 'Thao tác với Viết học thuật' }))
    expect(within(root).getByRole('button', { name: 'Đưa xuống' })).toBeDisabled()
    const child = screen.getByRole('article', { name: 'Diễn đạt lại' })
    fireEvent.click(within(child).getByRole('button', { name: 'Thao tác với Diễn đạt lại' }))
    expect(within(child).getByRole('button', { name: 'Đưa lên' })).toBeDisabled()
    expect(api.updateTopic).not.toHaveBeenCalled()
  })

  it('locks reorder and other editors while a topic form is open', async () => {
    show()
    await pick('Diễn đạt lại', 'Sửa chủ đề')
    expect(screen.getByRole('button', { hidden: true, name: 'Thao tác với Diễn đạt lại' })).toBeDisabled()
    expect(screen.getByRole('button', { hidden: true, name: 'Thao tác với Liên kết câu' })).toBeDisabled()
    fireEvent.click(within(screen.getByRole('form', { name: 'Sửa chủ đề' })).getByRole('button', { name: 'Hủy' }))
    expect(screen.getByRole('button', { name: 'Thao tác với Diễn đạt lại' })).toBeEnabled()
  })

  it('shows the skill, the band range in words and the status of every topic', async () => {
    show()
    const parent = await screen.findByRole('article', { name: 'Viết học thuật' })
    expect(parent).toHaveTextContent('Viết')
    expect(parent).toHaveTextContent('5.0 – 6.0')
    expect(parent).toHaveTextContent('2 chủ đề con')
    expect(parent).toHaveTextContent('Đang dùng')
    expect(screen.getByRole('article', { name: 'Liên kết câu' })).toHaveTextContent('Mọi band')
  })

  it('collapses and expands one branch, with no collapse-all button', async () => {
    show()
    const toggle = await screen.findByRole('button', { name: 'Thu gọn Viết học thuật' })
    expect(toggle).toHaveAttribute('aria-expanded', 'true')
    fireEvent.click(toggle)
    expect(screen.queryByRole('article', { name: 'Diễn đạt lại' })).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Mở rộng Viết học thuật' }))
    expect(screen.getByRole('article', { name: 'Diễn đạt lại' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /tất cả/ })).not.toBeInTheDocument()
  })

  it('puts Thêm chủ đề in the course header beside Sửa khóa học, not above the table', async () => {
    show()
    const add = await screen.findByRole('button', { name: 'Thêm chủ đề' })
    const edit = screen.getByRole('button', { name: 'Sửa khóa học' })
    expect(add.parentElement).toBe(edit.parentElement)
    expect(add.closest('header')).toHaveClass('adm-course-head')
    expect(within(screen.getByRole('region', { name: 'Danh sách chủ đề' })).queryByRole('button', { name: 'Thêm chủ đề' })).not.toBeInTheDocument()
  })

  it('closes a row menu with Esc and gives the focus back to its button', async () => {
    show()
    const trigger = await screen.findByRole('button', { name: 'Thao tác với Viết học thuật' })
    fireEvent.click(trigger)
    expect(trigger).toHaveAttribute('aria-expanded', 'true')
    expect(screen.getByRole('group', { name: 'Thao tác với Viết học thuật' })).toBeInTheDocument()
    fireEvent.keyDown(screen.getByRole('button', { name: 'Sửa chủ đề' }), { key: 'Escape' })
    expect(trigger).toHaveAttribute('aria-expanded', 'false')
    expect(screen.queryByRole('group', { name: 'Thao tác với Viết học thuật' })).not.toBeInTheDocument()
    expect(trigger).toHaveFocus()
  })

  it('closes a row menu when the pointer goes down outside it', async () => {
    show()
    const trigger = await screen.findByRole('button', { name: 'Thao tác với Viết học thuật' })
    fireEvent.click(trigger)
    fireEvent.pointerDown(document.body)
    expect(trigger).toHaveAttribute('aria-expanded', 'false')
  })

  it('switches between course tabs with a count each, and lists topics that belong to no course', async () => {
    const other = { ...course, id: 'c2', code: 'INTENSIVE', name: 'Cấp tốc 7.0', bandLevel: 7, status: 'INACTIVE' }
    api.fetchCourses.mockResolvedValue([course, other])
    lessons.fetchTopics.mockResolvedValue([...topics, { ...topics[0]!, id: 't9', code: 'LOOSE', name: 'Chủ đề lẻ', parentTopicId: null, courseId: null, skill: null }])
    show()
    const tablist = await screen.findByRole('tablist', { name: 'Khóa học' })
    const tabs = within(tablist).getAllByRole('tab')
    expect(tabs.map((tab) => tab.getAttribute('aria-selected'))).toEqual(['true', 'false', 'false'])
    expect(within(tabs[0]!).getByLabelText('3 chủ đề')).toBeInTheDocument()
    expect(tabs[1]).toHaveTextContent('Ngừng dùng')
    expect(screen.getByRole('tabpanel')).toHaveAccessibleName(/Nền tảng 5.5/)
    fireEvent.click(tabs[2]!)
    expect(screen.getByRole('heading', { name: 'Chủ đề chưa gán khóa' })).toBeInTheDocument()
    expect(screen.getByRole('article', { name: 'Chủ đề lẻ' })).toHaveTextContent('Chưa chọn kỹ năng')
    expect(screen.queryByRole('button', { name: 'Sửa khóa học' })).not.toBeInTheDocument()
    fireEvent.click(tabs[1]!)
    expect(screen.getByText('Khóa này chưa có chủ đề. Bấm “Thêm chủ đề” ở trên để bắt đầu.')).toBeInTheDocument()
  })

  it('moves between course tabs with the arrow keys, wrapping around', async () => {
    api.fetchCourses.mockResolvedValue([course, { ...course, id: 'c2', code: 'INTENSIVE', name: 'Cấp tốc 7.0' }])
    show()
    const tabs = within(await screen.findByRole('tablist', { name: 'Khóa học' })).getAllByRole('tab')
    tabs[0]!.focus()
    fireEvent.keyDown(tabs[0]!, { key: 'ArrowLeft' })
    expect(tabs[2]).toHaveAttribute('aria-selected', 'true')
    expect(tabs[2]).toHaveFocus()
    fireEvent.keyDown(tabs[2]!, { key: 'ArrowRight' })
    expect(tabs[0]).toHaveAttribute('aria-selected', 'true')
    fireEvent.keyDown(tabs[0]!, { key: 'End' })
    expect(tabs[2]).toHaveAttribute('aria-selected', 'true')
    fireEvent.keyDown(tabs[2]!, { key: 'Home' })
    expect(tabs[0]).toHaveAttribute('aria-selected', 'true')
    expect(tabs[1]).toHaveAttribute('tabindex', '-1')
  })

  it('stops a topic after confirmation in a popup, with its whole record and only the status changed', async () => {
    show()
    await pick('Diễn đạt lại', 'Ngừng dùng')
    const popup = await screen.findByRole('alertdialog')
    expect(popup).toHaveTextContent('Ngừng dùng chủ đề?')
    expect(popup).toHaveTextContent('Diễn đạt lại')
    expect(api.updateTopic).not.toHaveBeenCalled()
    fireEvent.click(within(popup).getByRole('button', { name: 'Ngừng dùng' }))
    await waitFor(() => expect(api.updateTopic).toHaveBeenCalledExactlyOnceWith('t2', {
      parentTopicId: 't1', courseId: 'c1', name: 'Diễn đạt lại', description: null, skill: 'WRITING', bandMin: 5, bandMax: 6, sortOrder: 1, status: 'INACTIVE',
    }))
    await waitFor(() => expect(lessons.fetchTopics).toHaveBeenCalledTimes(2))
  })

  it('keeps a topic when the popup is declined', async () => {
    show()
    await pick('Diễn đạt lại', 'Ngừng dùng')
    await answerConfirm(false)
    expect(api.updateTopic).not.toHaveBeenCalled()
    expect(lessons.fetchTopics).toHaveBeenCalledTimes(1)
  })

  it('offers to resume a stopped topic without asking, and draws only the stopping action in red', async () => {
    lessons.fetchTopics.mockResolvedValue([topics[0], { ...topics[1]!, status: 'INACTIVE' }, topics[2]])
    show()
    fireEvent.click(await screen.findByRole('button', { name: 'Thao tác với Diễn đạt lại' }))
    expect(screen.queryByRole('button', { name: 'Ngừng dùng' })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Dùng lại' })).not.toHaveClass('is-danger')
    fireEvent.click(screen.getByRole('button', { name: 'Dùng lại' }))
    await waitFor(() => expect(api.updateTopic).toHaveBeenCalledExactlyOnceWith('t2', expect.objectContaining({ status: 'ACTIVE', name: 'Diễn đạt lại' })))
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument()
    fireEvent.click(await screen.findByRole('button', { name: 'Thao tác với Liên kết câu' }))
    const stop = screen.getByRole('button', { name: 'Ngừng dùng' })
    expect(stop).toHaveClass('is-danger')
    expect(stop.querySelector('svg')).not.toBeNull()
  })

  it('shows why a topic could not be stopped', async () => {
    api.updateTopic.mockRejectedValue(new HttpError(503, 'Chưa lưu được'))
    show()
    await pick('Diễn đạt lại', 'Ngừng dùng')
    await answerConfirm(true)
    expect(await screen.findByRole('alert')).toHaveTextContent('Không đổi được trạng thái của “Diễn đạt lại”. Chưa lưu được')
  })
})
