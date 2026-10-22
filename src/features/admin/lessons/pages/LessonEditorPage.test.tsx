import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { HttpError } from '@/lib/httpClient'
import type { LessonEditor } from '../types'
import { LessonEditorPage } from './LessonEditorPage'

const { api, graph, questions, vocab } = vi.hoisted(() => ({
  api: {
    fetchLesson: vi.fn(), updateLesson: vi.fn(), setLessonKnowledgePoints: vi.fn(), addBlock: vi.fn(), updateBlock: vi.fn(),
    deleteBlock: vi.fn(), reorderBlocks: vi.fn(), publishLesson: vi.fn(), archiveLesson: vi.fn(), searchVocabulary: vi.fn(),
  },
  graph: { fetchKnowledgeTree: vi.fn() },
  questions: { listQuestions: vi.fn(), getQuestion: vi.fn() },
  vocab: { getLessonVocabularySenses: vi.fn() },
}))
vi.mock('../api/lessonApi', () => api)
vi.mock('../../knowledge-graph/api/knowledgeGraphApi', () => graph)
vi.mock('../../questions/api/questionApi', () => questions)
vi.mock('@/features/learning-path/api/lessonVocabularyApi', () => vocab)

function lesson(overrides: Partial<LessonEditor> = {}): LessonEditor {
  return {
    id: 'l1', topicId: 't1', code: 'L1', title: 'Skimming', summary: 'Tóm tắt', summaryMarkdown: '', sortOrder: 1,
    status: 'DRAFT', estimatedMinutes: 10, knowledgePointIds: ['kp1'], knowledgePoints: [],
    blocks: [
      { id: 'b1', blockType: 'TEXT', sortOrder: 1, textContent: 'Intro text', assetId: null, vocabularySenseIds: [], knowledgePointIds: [], questions: [] },
      { id: 'b2', blockType: 'EXERCISE', sortOrder: 2, textContent: null, assetId: null, vocabularySenseIds: [], knowledgePointIds: [],
        questions: [{ questionVersionId: 'v1', stem: 'Pick one', status: 'PUBLISHED' }] },
    ],
    ...overrides,
  }
}

function renderPage() {
  return render(
    <MemoryRouter initialEntries={['/admin/lessons/l1']}>
      <Routes><Route element={<LessonEditorPage />} path="/admin/lessons/:lessonId" /></Routes>
    </MemoryRouter>,
  )
}

describe('LessonEditorPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    api.fetchLesson.mockResolvedValue(lesson())
    graph.fetchKnowledgeTree.mockResolvedValue({ nodes: [{ id: 'kp1', code: 'R55_SCAN', name: 'Scanning', kind: 'STRATEGY', status: 'ACTIVE' }], edges: [] })
    questions.listQuestions.mockResolvedValue({ content: [], page: 0, size: 100, totalElements: 0, totalPages: 0 })
    vocab.getLessonVocabularySenses.mockResolvedValue([])
  })

  it('shows the blocks in order with the lesson status', async () => {
    renderPage()

    expect(await screen.findByRole('heading', { name: 'Skimming' })).toBeInTheDocument()
    expect(screen.getByText('Nháp')).toBeInTheDocument()
    expect(screen.getByText('Intro text')).toBeInTheDocument()
    expect(screen.getByText('1 câu hỏi')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Xuất bản' })).toBeInTheDocument()
  })

  it('moves a block down and reloads the lesson', async () => {
    api.reorderBlocks.mockResolvedValue(undefined)
    renderPage()
    fireEvent.click(await screen.findByRole('button', { name: 'Đưa block 1 xuống' }))

    await waitFor(() => expect(api.reorderBlocks).toHaveBeenCalledWith('l1', ['b2', 'b1']))
    await waitFor(() => expect(api.fetchLesson).toHaveBeenCalledTimes(2))
  })

  it('edits a text block under its own id', async () => {
    api.updateBlock.mockResolvedValue(undefined)
    renderPage()
    fireEvent.click(await screen.findByRole('button', { name: 'Sửa block 1' }))

    const form = await screen.findByRole('form', { name: /Sửa block/ })
    fireEvent.change(within(form).getByLabelText('Nội dung (Markdown)'), { target: { value: 'New text' } })
    fireEvent.click(within(form).getByRole('button', { name: 'Lưu block' }))

    await waitFor(() => expect(api.updateBlock).toHaveBeenCalledWith('l1', 'b1', { blockType: 'TEXT', textContent: 'New text', knowledgePointIds: [] }))
  })

  it('does not send an empty text block', async () => {
    renderPage()
    fireEvent.click(await screen.findByRole('button', { name: /Bài giảng \(văn bản\)/ }))

    const form = await screen.findByRole('form', { name: /Thêm block/ })
    fireEvent.click(within(form).getByRole('button', { name: 'Lưu block' }))

    expect(await within(form).findByText('Cần nhập nội dung bài giảng.')).toBeInTheDocument()
    expect(api.addBlock).not.toHaveBeenCalled()
  })

  it('lists why a publish was refused', async () => {
    api.publishLesson.mockRejectedValue(
      new HttpError(422, 'Lesson cannot be published', { details: { code: 'LESSON_NOT_PUBLISHABLE', issues: ['LESSON_HAS_NO_ACTIVE_KP'] } }),
    )
    renderPage()
    fireEvent.click(await screen.findByRole('button', { name: 'Xuất bản' }))

    const alert = await screen.findByText('Bài chưa gắn knowledge point nào đang hoạt động.')
    expect(alert.closest('[role="alert"]')).toHaveTextContent('Chưa xuất bản được bài học.')
  })

  it('locks exercise blocks once the lesson is published but keeps the others editable', async () => {
    api.fetchLesson.mockResolvedValue(lesson({ status: 'PUBLISHED' }))
    renderPage()

    expect(await screen.findByRole('note')).toHaveTextContent('Bài đã xuất bản')
    expect(screen.getByRole('button', { name: 'Sửa block 1' })).toBeEnabled()
    expect(screen.getByRole('button', { name: 'Sửa block 2' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Xóa block 2' })).toBeDisabled()
    expect(screen.getByRole('button', { name: /Bài tập/ })).toBeDisabled()
    expect(screen.queryByRole('button', { name: 'Xuất bản' })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Lưu trữ' })).toBeInTheDocument()
  })

  it('shows a load error with a retry', async () => {
    api.fetchLesson.mockRejectedValueOnce(new HttpError(404, 'Không tìm thấy bài học'))
    renderPage()

    expect(await screen.findByRole('alert')).toHaveTextContent('Không tìm thấy bài học')
    api.fetchLesson.mockResolvedValue(lesson())
    fireEvent.click(screen.getByRole('button', { name: 'Thử lại' }))
    expect(await screen.findByRole('heading', { name: 'Skimming' })).toBeInTheDocument()
  })
})
