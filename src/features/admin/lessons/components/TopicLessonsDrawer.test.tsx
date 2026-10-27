import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
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
    expect(await within(drawer).findByRole('button', { name: 'Lesson one' })).toBeInTheDocument()
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
    expect(await screen.findByRole('button', { name: 'Lesson one' })).toBeInTheDocument()
  })

  it('moves a lesson down by sending the new order and reloads the list', async () => {
    api.reorderLessons.mockResolvedValue(undefined)
    show()
    fireEvent.click(await screen.findByRole('button', { name: 'Đưa Lesson one xuống' }))
    await waitFor(() => expect(api.reorderLessons).toHaveBeenCalledWith('t1', ['l2', 'l1']))
    await waitFor(() => expect(api.fetchLessons).toHaveBeenCalledTimes(2))
  })

  it('shows why a reorder failed', async () => {
    api.reorderLessons.mockRejectedValue(new HttpError(409, 'Thứ tự đã thay đổi'))
    show()
    fireEvent.click(await screen.findByRole('button', { name: 'Đưa Lesson one xuống' }))
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

  it('opens a lesson for editing inside the drawer and steps back to the list', async () => {
    show()
    fireEvent.click(await screen.findByRole('button', { name: 'Lesson one' }))

    const drawer = screen.getByRole('dialog', { name: 'Lesson one' })
    expect(await within(drawer).findByRole('form', { name: 'Thông tin bài học' })).toBeInTheDocument()
    expect(within(drawer).getByText('Intro text')).toBeInTheDocument()
    expect(api.fetchLesson).toHaveBeenCalledWith('l1', expect.anything())

    fireEvent.click(screen.getByRole('button', { name: 'Về danh sách bài học' }))
    expect(await screen.findByRole('dialog', { name: 'Skimming' })).toBeInTheDocument()
    expect(await screen.findByRole('button', { name: 'Lesson two' })).toBeInTheDocument()
    await waitFor(() => expect(api.fetchLessons).toHaveBeenCalledTimes(2))
  })

  it('saves a change made in the lesson editor from the drawer', async () => {
    api.updateLesson.mockResolvedValue(undefined)
    show()
    fireEvent.click(await screen.findByRole('button', { name: 'Lesson one' }))
    const form = await screen.findByRole('form', { name: 'Thông tin bài học' })
    fireEvent.change(within(form).getByLabelText('Tiêu đề'), { target: { value: 'Lesson uno' } })
    fireEvent.click(within(form).getByRole('button', { name: 'Lưu thông tin' }))
    await waitFor(() => expect(api.updateLesson).toHaveBeenCalledWith('l1', expect.objectContaining({ title: 'Lesson uno' })))
  })

  it('closes the whole panel from its own close button, even from a lesson', async () => {
    const onClose = show()
    fireEvent.click(await screen.findByRole('button', { name: 'Lesson one' }))
    await screen.findByRole('form', { name: 'Thông tin bài học' })
    fireEvent.click(screen.getByRole('button', { name: 'Đóng' }))
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('closes from the back arrow of the list', async () => {
    const onClose = show()
    await screen.findByRole('button', { name: 'Lesson one' })
    fireEvent.click(screen.getByRole('button', { name: 'Đóng' }))
    expect(onClose).toHaveBeenCalledTimes(1)
  })
})
