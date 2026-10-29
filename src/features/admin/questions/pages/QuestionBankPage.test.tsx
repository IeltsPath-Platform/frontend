import { fireEvent, render, screen, waitFor, within } from '@/test/render'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { AdminSearchContext } from '../../adminSearch'
import type { QuestionDetail, QuestionPage } from '../types'
import { QuestionBankPage } from './QuestionBankPage'

const { api, graph } = vi.hoisted(() => ({
  api: {
    listQuestions: vi.fn(), createQuestion: vi.fn(), getQuestion: vi.fn(), archiveQuestion: vi.fn(),
    addQuestionVersion: vi.fn(), publishQuestionVersion: vi.fn(), archiveQuestionVersion: vi.fn(),
  },
  graph: { fetchKnowledgeTree: vi.fn() },
}))
vi.mock('../api/questionApi', () => api)
vi.mock('../../knowledge-graph/api/knowledgeGraphApi', () => graph)

function page(overrides: Partial<QuestionPage> = {}): QuestionPage {
  return {
    content: [
      { id: 'aaaaaaaa-1111', questionType: 'MULTIPLE_CHOICE', skill: 'READING', status: 'PUBLISHED', purpose: 'LEARNING', updatedAt: '2026-10-20T00:00:00Z' },
      { id: 'bbbbbbbb-2222', questionType: 'ESSAY', skill: 'WRITING', status: 'DRAFT', purpose: 'EXAM', updatedAt: '2026-10-21T00:00:00Z' },
    ],
    page: 0, size: 25, totalElements: 2, totalPages: 1,
    ...overrides,
  }
}

function detail(): QuestionDetail {
  return {
    ...page().content[0],
    currentPublishedVersionId: 'v1',
    versions: [
      { id: 'v1', versionNumber: 1, stem: 'What is the main idea?', status: 'PUBLISHED', difficulty: 'EASY', answerSpecJson: '{"type":"CHOICE","correct":"B"}',
        options: [{ optionKey: 'A', content: 'Trees' }, { optionKey: 'B', content: 'Rivers' }], knowledgePoints: [] },
    ],
  }
}

function renderPage(query = '') {
  return render(
    <MemoryRouter initialEntries={['/content-author/questions']}>
      <AdminSearchContext.Provider value={{ query, setQuery: vi.fn() }}>
        <Routes>
          <Route element={<QuestionBankPage />} path="/content-author/questions" />
        </Routes>
      </AdminSearchContext.Provider>
    </MemoryRouter>,
  )
}

/** Opens the "…" menu of one row and picks an action. */
function pickAction(rowNumber: number, action: string) {
  fireEvent.click(screen.getByRole('button', { name: `Hành động của câu hỏi ${rowNumber}` }))
  fireEvent.click(screen.getByRole('menuitem', { name: action }))
}

describe('QuestionBankPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    api.listQuestions.mockResolvedValue(page())
    api.getQuestion.mockResolvedValue(detail())
    graph.fetchKnowledgeTree.mockResolvedValue({ nodes: [], edges: [] })
  })

  it('lists the questions with their type, skill, purpose and status', async () => {
    renderPage()

    const table = await screen.findByRole('table')
    expect(within(table).getByText('Trắc nghiệm')).toBeInTheDocument()
    expect(within(table).getByText('Bài luận')).toBeInTheDocument()
    expect(within(table).getByText('Đã xuất bản')).toBeInTheDocument()
    expect(within(table).getByText('Nháp')).toBeInTheDocument()
    expect(api.listQuestions).toHaveBeenCalledWith(
      { skill: '', purpose: '', status: '', page: 0, size: 25 }, expect.any(AbortSignal))
    expect(screen.getByText('aaaaaaaa…')).toBeInTheDocument()
    expect(screen.queryByRole('link')).not.toBeInTheDocument()
    expect(within(table).getByRole('columnheader', { name: 'Hành động' })).toBeInTheDocument()
  })

  it('opens the details of a question in a dialog', async () => {
    renderPage()
    await screen.findByRole('table')

    pickAction(1, 'Xem chi tiết')

    const dialog = await screen.findByRole('dialog', { name: 'Chi tiết câu hỏi' })
    expect(await within(dialog).findByText('What is the main idea?')).toBeInTheDocument()
    expect(within(dialog).getByText('aaaaaaaa-1111')).toBeInTheDocument()
    expect(api.getQuestion).toHaveBeenCalledWith('aaaaaaaa-1111', expect.any(AbortSignal))
  })

  it('opens the update drawer with the latest version filled in and saves it as the next version', async () => {
    api.addQuestionVersion.mockResolvedValue({ id: 'aaaaaaaa-1111', questionType: 'MULTIPLE_CHOICE', status: 'PUBLISHED' })
    renderPage()
    await screen.findByRole('table')

    pickAction(1, 'Cập nhật')

    const drawer = await screen.findByRole('dialog', { name: 'Cập nhật câu hỏi' })
    expect(drawer).toHaveClass('adm-drawer')
    const stem = await within(drawer).findByLabelText('Nội dung câu hỏi')
    expect(stem).toHaveValue('What is the main idea?')
    expect(within(drawer).getByLabelText('Số phiên bản')).toHaveValue(2)

    fireEvent.change(stem, { target: { value: 'What is the topic?' } })
    fireEvent.click(within(drawer).getByRole('button', { name: 'Lưu bản nháp' }))

    await waitFor(() => expect(api.addQuestionVersion).toHaveBeenCalledWith(
      'aaaaaaaa-1111', expect.objectContaining({ versionNumber: 2, stem: 'What is the topic?' })))
    await waitFor(() => expect(screen.queryByRole('dialog', { name: 'Cập nhật câu hỏi' })).not.toBeInTheDocument())
    await waitFor(() => expect(api.listQuestions).toHaveBeenCalledTimes(2))
  })

  it('soft-deletes a question after confirmation', async () => {
    api.archiveQuestion.mockResolvedValue({ id: 'aaaaaaaa-1111', questionType: 'MULTIPLE_CHOICE', status: 'ARCHIVED' })
    renderPage()
    await screen.findByRole('table')

    pickAction(1, 'Xóa')
    fireEvent.click(await screen.findByRole('button', { name: 'Xóa câu hỏi' }))

    await waitFor(() => expect(api.archiveQuestion).toHaveBeenCalledWith('aaaaaaaa-1111'))
    await waitFor(() => expect(api.listQuestions).toHaveBeenCalledTimes(2))
  })

  it('keeps the question when the delete is cancelled', async () => {
    renderPage()
    await screen.findByRole('table')

    pickAction(1, 'Xóa')
    fireEvent.click(await screen.findByRole('button', { name: 'Hủy' }))

    await waitFor(() => expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument())
    expect(api.archiveQuestion).not.toHaveBeenCalled()
  })

  it('does not offer update or delete for an archived question', async () => {
    api.listQuestions.mockResolvedValue(page({
      content: [{ id: 'cccccccc-3333', questionType: 'ESSAY', skill: 'WRITING', status: 'ARCHIVED', purpose: 'EXAM' }],
    }))
    renderPage()
    await screen.findByRole('table')

    fireEvent.click(screen.getByRole('button', { name: 'Hành động của câu hỏi 1' }))

    expect(screen.getByRole('menuitem', { name: 'Xem chi tiết' })).toBeEnabled()
    expect(screen.getByRole('menuitem', { name: 'Cập nhật' })).toBeDisabled()
    expect(screen.getByRole('menuitem', { name: 'Xóa' })).toBeDisabled()
  })

  it('sends a changed filter to the API and returns to the first page', async () => {
    api.listQuestions.mockResolvedValue(page({ totalPages: 3, totalElements: 60 }))
    renderPage()
    fireEvent.click(await screen.findByRole('button', { name: 'Trang sau' }))
    await waitFor(() => expect(api.listQuestions).toHaveBeenLastCalledWith(expect.objectContaining({ page: 1 }), expect.any(AbortSignal)))

    fireEvent.change(screen.getByLabelText('Trạng thái'), { target: { value: 'DRAFT' } })

    await waitFor(() => expect(api.listQuestions).toHaveBeenLastCalledWith(
      { skill: '', purpose: '', status: 'DRAFT', page: 0, size: 25 }, expect.any(AbortSignal)))
  })

  it('filters the loaded page by the topbar search', async () => {
    renderPage('essay')

    const table = await screen.findByRole('table')
    expect(within(table).getByText('Bài luận')).toBeInTheDocument()
    expect(within(table).queryByText('Trắc nghiệm')).not.toBeInTheDocument()
  })

  it('creates a question and opens it in the update drawer', async () => {
    api.createQuestion.mockResolvedValue({ id: 'new-1', questionType: 'ESSAY', status: 'DRAFT' })
    renderPage()
    fireEvent.click(await screen.findByRole('button', { name: /Câu hỏi mới/ }))
    const drawer = screen.getByRole('dialog', { name: 'Câu hỏi mới' })
    expect(drawer).toHaveClass('adm-drawer')
    fireEvent.change(within(drawer).getByLabelText('Dạng câu hỏi'), { target: { value: 'ESSAY' } })
    fireEvent.change(within(drawer).getByLabelText('Kỹ năng'), { target: { value: 'WRITING' } })
    fireEvent.click(within(drawer).getByRole('button', { name: 'Tạo và thêm phiên bản' }))

    await waitFor(() => expect(api.createQuestion).toHaveBeenCalledWith(
      { questionType: 'ESSAY', skill: 'WRITING', accessLevel: 'FREE', purpose: 'LEARNING' }))
    expect(await screen.findByRole('dialog', { name: 'Cập nhật câu hỏi' })).toBeInTheDocument()
  })

  it('says so when there are no questions', async () => {
    api.listQuestions.mockResolvedValue(page({ content: [], totalElements: 0, totalPages: 0 }))
    renderPage()

    expect(await screen.findByText('Chưa có câu hỏi nào')).toBeInTheDocument()
  })

  it('shows a retryable error', async () => {
    api.listQuestions.mockRejectedValueOnce(new Error('down'))
    renderPage()

    expect(await screen.findByRole('alert')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Thử lại' }))
    expect(await screen.findByRole('table')).toBeInTheDocument()
  })
})
