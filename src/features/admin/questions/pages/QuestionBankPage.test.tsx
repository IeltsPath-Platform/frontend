import { fireEvent, render, screen, waitFor, within } from '@/test/render'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { AdminSearchContext } from '../../adminSearch'
import type { QuestionPage } from '../types'
import { QuestionBankPage } from './QuestionBankPage'

const { api } = vi.hoisted(() => ({ api: { listQuestions: vi.fn(), createQuestion: vi.fn() } }))
vi.mock('../api/questionApi', () => api)

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

function renderPage(query = '') {
  return render(
    <MemoryRouter initialEntries={['/content-author/questions']}>
      <AdminSearchContext.Provider value={{ query, setQuery: vi.fn() }}>
        <Routes>
          <Route element={<QuestionBankPage />} path="/content-author/questions" />
          <Route element={<h1>Chi tiết câu hỏi</h1>} path="/content-author/questions/:questionId" />
        </Routes>
      </AdminSearchContext.Provider>
    </MemoryRouter>,
  )
}

describe('QuestionBankPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    api.listQuestions.mockResolvedValue(page())
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
    expect(screen.getByRole('link', { name: 'aaaaaaaa…' })).toHaveAttribute('href', '/content-author/questions/aaaaaaaa-1111')
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

  it('creates a question and opens it', async () => {
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
    expect(await screen.findByRole('heading', { name: 'Chi tiết câu hỏi' })).toBeInTheDocument()
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
