import { fireEvent, render, screen, waitFor, within } from '@/test/render'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { answerConfirm } from '@/test/confirm'
import { HttpError } from '@/lib/httpClient'
import type { LessonEditor, TopicOption } from '../types'
import { TopicLessonsDrawer } from './TopicLessonsDrawer'

const { api, graph, questions, vocab } = vi.hoisted(() => ({
  api: {
    fetchLessons: vi.fn(), createLesson: vi.fn(), reorderLessons: vi.fn(), fetchLesson: vi.fn(), updateLesson: vi.fn(),
    setLessonKnowledgePoints: vi.fn(), addBlock: vi.fn(), updateBlock: vi.fn(), deleteBlock: vi.fn(), reorderBlocks: vi.fn(),
    publishLesson: vi.fn(), archiveLesson: vi.fn(), searchVocabulary: vi.fn(), fetchLessonResources: vi.fn(),
    createLessonResource: vi.fn(), updateLessonResource: vi.fn(), deleteLessonResource: vi.fn(),
  },
  graph: { fetchKnowledgeTree: vi.fn() },
  questions: { listQuestions: vi.fn(), getQuestion: vi.fn() },
  vocab: { getLessonVocabularySenses: vi.fn() },
}))
vi.mock('../api/lessonApi', () => api)
vi.mock('../../knowledge-graph/api/knowledgeGraphApi', () => graph)
vi.mock('../../questions/api/questionApi', () => questions)
vi.mock('@/features/learning-path/api/lessonVocabularyApi', () => vocab)

const topic: TopicOption = { id: 't1', code: 'R-SKIM', name: 'Skimming', skill: 'READING', courseId: 'c1', status: 'ACTIVE', sortOrder: 1 }
const summary = (id: string, title: string, sortOrder: number) => ({
  id, topicId: 't1', code: id.toUpperCase(), title, summary: null, sortOrder, status: 'DRAFT' as const,
  estimatedMinutes: null, blockCount: 2, knowledgePointCount: 1,
})
const lesson: LessonEditor = {
  id: 'l1', topicId: 't1', code: 'L1', title: 'Lesson one', summary: 'Tóm tắt', summaryMarkdown: '', sortOrder: 1,
  status: 'DRAFT', estimatedMinutes: 10, knowledgePointIds: ['kp1'], knowledgePoints: [],
  blocks: [{ id: 'b1', blockType: 'TEXT', sortOrder: 1, textContent: 'Intro text', assetId: null, vocabularySenseIds: [], knowledgePointIds: [], questions: [] }],
}

async function chooseFromRowMenu(row: number, action: string) {
  fireEvent.click(await screen.findByRole('button', { name: `Hành động của bài ${row}` }))
  fireEvent.click(await screen.findByRole('menuitem', { name: action }))
}

function show(onClose = vi.fn()) {
  render(<TopicLessonsDrawer topic={topic} onClose={onClose} />)
  return onClose
}

describe('TopicLessonsDrawer', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    api.fetchLessons.mockResolvedValue([summary('l1', 'Lesson one', 1), summary('l2', 'Lesson two', 2)])
    api.fetchLesson.mockResolvedValue(lesson)
    api.fetchLessonResources.mockResolvedValue({ lessonId: 'l1', summaryMarkdown: null, slides: [], documents: [] })
    graph.fetchKnowledgeTree.mockResolvedValue({ nodes: [{ id: 'kp1', code: 'R55_SCAN', name: 'Scanning', kind: 'STRATEGY', status: 'ACTIVE' }], edges: [] })
    questions.listQuestions.mockResolvedValue({ content: [], page: 0, size: 100, totalElements: 0, totalPages: 0 })
    vocab.getLessonVocabularySenses.mockResolvedValue([])
  })

  it('opens as a wide right drawer named after the topic and lists its lessons in every status', async () => {
    show()
    const drawer = screen.getByRole('dialog', { name: 'Skimming' })
    expect(drawer).toHaveClass('adm-drawer', 'adm-drawer--xl')
    expect(drawer).toHaveTextContent('R-SKIM · Bài học của chủ đề')
    expect(await within(drawer).findByText('Lesson one')).toBeInTheDocument()
    expect(within(drawer).getAllByText('Nháp')).toHaveLength(2)
    expect(api.fetchLessons).toHaveBeenCalledWith('t1', expect.anything())
  })

  it('says so when the topic has no lessons yet', async () => {
    api.fetchLessons.mockResolvedValue([])
    show()
    expect(await screen.findByText('Chủ đề này chưa có bài học')).toBeInTheDocument()
  })

  it('shows a load error with a retry', async () => {
    api.fetchLessons.mockRejectedValueOnce(new HttpError(503, 'Không tải được bài học'))
    show()
    expect(await screen.findByRole('alert')).toHaveTextContent('Không tải được bài học')
    fireEvent.click(screen.getByRole('button', { name: 'Thử lại' }))
    expect(await screen.findByText('Lesson one')).toBeInTheDocument()
  })

  it('draws the row menu inside the drawer, which blocks clicks on anything outside it', async () => {
    show()
    fireEvent.click(await screen.findByRole('button', { name: 'Hành động của bài 1' }))
    expect(screen.getByRole('dialog', { name: 'Skimming' })).toContainElement(await screen.findByRole('menu'))
  })

  it('publishes a draft lesson from its row menu and reloads the list', async () => {
    api.publishLesson.mockResolvedValue(undefined)
    show()
    await chooseFromRowMenu(1, 'Xuất bản Lesson one')
    await waitFor(() => expect(api.publishLesson).toHaveBeenCalledWith('l1'))
    await waitFor(() => expect(api.fetchLessons).toHaveBeenCalledTimes(2))
  })

  it('lists why a publish was refused', async () => {
    api.publishLesson.mockRejectedValue(
      new HttpError(422, 'Lesson cannot be published', { details: { code: 'LESSON_NOT_PUBLISHABLE', issues: ['LESSON_HAS_NO_ACTIVE_KP'] } }),
    )
    show()
    await chooseFromRowMenu(1, 'Xuất bản Lesson one')
    const alert = await screen.findByRole('alert')
    expect(alert).toHaveTextContent('Chưa xuất bản được bài học.')
    expect(alert).toHaveTextContent('Bài chưa gắn knowledge point nào đang hoạt động.')
  })

  it('archives a published lesson only after confirmation', async () => {
    api.fetchLessons.mockResolvedValue([{ ...summary('l1', 'Lesson one', 1), status: 'PUBLISHED' as const }])
    api.archiveLesson.mockResolvedValue(undefined)
    show()
    await chooseFromRowMenu(1, 'Lưu trữ Lesson one')
    await answerConfirm(false)
    expect(api.archiveLesson).not.toHaveBeenCalled()
    await chooseFromRowMenu(1, 'Lưu trữ Lesson one')
    await answerConfirm(true)
    await waitFor(() => expect(api.archiveLesson).toHaveBeenCalledWith('l1'))
    await waitFor(() => expect(api.fetchLessons).toHaveBeenCalledTimes(2))
  })

  it('offers to publish an archived lesson again and no archive action', async () => {
    api.fetchLessons.mockResolvedValue([{ ...summary('l1', 'Lesson one', 1), status: 'ARCHIVED' as const }])
    api.publishLesson.mockResolvedValue(undefined)
    show()
    fireEvent.click(await screen.findByRole('button', { name: 'Hành động của bài 1' }))
    expect(screen.queryByRole('menuitem', { name: /Lưu trữ/ })).not.toBeInTheDocument()
    fireEvent.click(await screen.findByRole('menuitem', { name: 'Xuất bản lại Lesson one' }))
    await waitFor(() => expect(api.publishLesson).toHaveBeenCalledWith('l1'))
  })

  it('moves a lesson down by sending the new order and reloads the list', async () => {
    api.reorderLessons.mockResolvedValue(undefined)
    show()
    await chooseFromRowMenu(1, 'Đưa Lesson one xuống')
    await waitFor(() => expect(api.reorderLessons).toHaveBeenCalledWith('t1', ['l2', 'l1']))
    await waitFor(() => expect(api.fetchLessons).toHaveBeenCalledTimes(2))
  })

  it('shows why a reorder failed', async () => {
    api.reorderLessons.mockRejectedValue(new HttpError(409, 'Thứ tự đã thay đổi'))
    show()
    await chooseFromRowMenu(1, 'Đưa Lesson one xuống')
    expect(await screen.findByRole('alert')).toHaveTextContent('Thứ tự đã thay đổi')
  })

  it('creates a draft lesson in the same panel and comes back to the refreshed list', async () => {
    api.createLesson.mockResolvedValue(undefined)
    show()
    fireEvent.click(await screen.findByRole('button', { name: /Bài học mới/ }))
    const drawer = screen.getByRole('dialog', { name: 'Bài học mới' })
    expect(screen.getByRole('button', { name: 'Về danh sách bài học' })).toBeInTheDocument()

    fireEvent.change(within(drawer).getByLabelText('Mã bài học'), { target: { value: 'R-SKIM-3' } })
    fireEvent.change(within(drawer).getByLabelText('Tiêu đề'), { target: { value: 'Lesson three' } })
    fireEvent.click(within(drawer).getByRole('button', { name: 'Tạo bài học nháp' }))

    await waitFor(() => expect(api.createLesson).toHaveBeenCalledWith('t1', {
      code: 'R-SKIM-3', title: 'Lesson three', summary: '', summaryMarkdown: '', estimatedMinutes: null,
    }))
    expect(await screen.findByRole('dialog', { name: 'Skimming' })).toBeInTheDocument()
    await waitFor(() => expect(api.fetchLessons).toHaveBeenCalledTimes(2))
  })

  it('does not send a lesson without a code and a title', async () => {
    show()
    fireEvent.click(await screen.findByRole('button', { name: /Bài học mới/ }))
    fireEvent.click(screen.getByRole('button', { name: 'Tạo bài học nháp' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('Cần nhập mã và tiêu đề bài học.')
    expect(api.createLesson).not.toHaveBeenCalled()
  })

  it('opens a lesson for editing in a popup above the drawer and comes back to the refreshed list', async () => {
    const onClose = show()
    await chooseFromRowMenu(1, 'Sửa Lesson one')

    const popup = screen.getByRole('dialog', { name: 'Lesson one' })
    expect(popup).toHaveClass('adm-modal', 'adm-modal--wide', 'adm-modal--stacked')
    expect(await within(popup).findByRole('form', { name: 'Thông tin bài học' })).toBeInTheDocument()
    expect(within(popup).getByText('Intro text')).toBeInTheDocument()
    expect(api.fetchLesson).toHaveBeenCalledWith('l1', expect.anything())

    // The popup has two Đóng buttons: the cross in its header and the one in the button bar at its foot.
    fireEvent.click(within(popup.querySelector('.adm-modal__header') as HTMLElement).getByRole('button', { name: 'Đóng' }))
    expect(await screen.findByRole('dialog', { name: 'Skimming' })).toBeInTheDocument()
    expect(screen.queryByRole('dialog', { name: 'Lesson one' })).not.toBeInTheDocument()
    expect(await screen.findByText('Lesson two')).toBeInTheDocument()
    await waitFor(() => expect(api.fetchLessons).toHaveBeenCalledTimes(2))
    expect(onClose).not.toHaveBeenCalled()
  })

  it('saves a change made in the lesson editor from the drawer', async () => {
    api.updateLesson.mockResolvedValue(undefined)
    show()
    await chooseFromRowMenu(1, 'Sửa Lesson one')
    const form = await screen.findByRole('form', { name: 'Thông tin bài học' })
    fireEvent.change(within(form).getByLabelText('Tiêu đề'), { target: { value: 'Lesson uno' } })
    // The Lưu of the editor sits at the foot of the popup, outside the information form, and submits it.
    fireEvent.click(screen.getByRole('button', { name: 'Lưu thông tin' }))
    await waitFor(() => expect(api.updateLesson).toHaveBeenCalledWith('l1', expect.objectContaining({ title: 'Lesson uno', summary: 'Tóm tắt' })))
  })

  it('closes from the back arrow of the list', async () => {
    const onClose = show()
    await screen.findByText('Lesson one')
    fireEvent.click(screen.getByRole('button', { name: 'Đóng' }))
    expect(onClose).toHaveBeenCalledTimes(1)
  })
})
