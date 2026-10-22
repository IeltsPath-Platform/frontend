import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { HttpError } from '@/lib/httpClient'
import type { QuestionDetail } from '../types'
import { QuestionDetailPage } from './QuestionDetailPage'

const { api, graph } = vi.hoisted(() => ({
  api: { getQuestion: vi.fn(), addQuestionVersion: vi.fn(), publishQuestionVersion: vi.fn(), archiveQuestionVersion: vi.fn() },
  graph: { fetchKnowledgeTree: vi.fn() },
}))
vi.mock('../api/questionApi', () => api)
vi.mock('../../knowledge-graph/api/knowledgeGraphApi', () => graph)

function detail(overrides: Partial<QuestionDetail> = {}): QuestionDetail {
  return {
    id: 'q1', questionType: 'MULTIPLE_CHOICE', skill: 'READING', accessLevel: 'FREE', status: 'PUBLISHED',
    currentPublishedVersionId: 'v1', purpose: 'LEARNING',
    versions: [
      { id: 'v1', versionNumber: 1, stem: 'Old stem', status: 'PUBLISHED', difficulty: 'EASY', answerSpecJson: '{"type":"CHOICE","correct":"B"}',
        options: [{ optionKey: 'A', content: 'Trees' }, { optionKey: 'B', content: 'Rivers' }], knowledgePoints: [] },
      { id: 'v2', versionNumber: 2, stem: 'Draft stem', status: 'DRAFT', difficulty: null, answerSpecJson: null, options: [], knowledgePoints: [] },
    ],
    ...overrides,
  }
}

function renderPage() {
  return render(
    <MemoryRouter initialEntries={['/content-author/questions/q1']}>
      <Routes><Route element={<QuestionDetailPage />} path="/content-author/questions/:questionId" /></Routes>
    </MemoryRouter>,
  )
}

describe('QuestionDetailPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    api.getQuestion.mockResolvedValue(detail())
    graph.fetchKnowledgeTree.mockResolvedValue({
      nodes: [{ id: 'kp1', code: 'R55_SCAN', name: 'Scanning', kind: 'STRATEGY', status: 'ACTIVE' }],
      edges: [],
    })
  })

  it('shows the question and its versions, newest first, marking the one in use', async () => {
    renderPage()

    expect(await screen.findByRole('heading', { name: 'Trắc nghiệm' })).toBeInTheDocument()
    const versions = screen.getAllByRole('article')
    expect(versions.map((item) => item.getAttribute('aria-label'))).toEqual(['Phiên bản 2', 'Phiên bản 1'])
    expect(within(versions[1]).getByText('Đang dùng')).toBeInTheDocument()
    expect(within(versions[1]).getByRole('button', { name: 'Lưu trữ' })).toBeInTheDocument()
    expect(within(versions[0]).getByRole('button', { name: 'Xuất bản' })).toBeInTheDocument()
    expect(within(versions[0]).getByText('Chưa chọn độ khó')).toBeInTheDocument()
    expect(within(versions[1]).getByText('Đáp án đúng: B.')).toBeInTheDocument()
  })

  it('publishes a draft and reloads', async () => {
    api.publishQuestionVersion.mockResolvedValue(detail())
    renderPage()
    fireEvent.click(await screen.findByRole('button', { name: 'Xuất bản' }))

    await waitFor(() => expect(api.publishQuestionVersion).toHaveBeenCalledWith('q1', 'v2'))
    expect(await screen.findByText('Đã xuất bản phiên bản 2.')).toBeInTheDocument()
    expect(api.getQuestion).toHaveBeenCalledTimes(2)
  })

  it('explains a missing difficulty when publishing is refused', async () => {
    api.publishQuestionVersion.mockRejectedValue(new HttpError(422, 'difficulty is required', { details: { code: 'DIFFICULTY_REQUIRED' } }))
    renderPage()
    fireEvent.click(await screen.findByRole('button', { name: 'Xuất bản' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('Cần chọn độ khó trước khi xuất bản.')
  })

  it('explains why a version in use cannot be archived', async () => {
    api.archiveQuestionVersion.mockRejectedValue(new HttpError(409, 'in use', { details: { code: 'QUESTION_VERSION_IN_USE' } }))
    renderPage()
    fireEvent.click(await screen.findByRole('button', { name: 'Lưu trữ' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('đang được dùng trong bài học hoặc gói đề đã xuất bản')
    expect(api.getQuestion).toHaveBeenCalledTimes(1)
  })

  it('adds a version with the next number and a choice answer', async () => {
    api.addQuestionVersion.mockResolvedValue(detail())
    renderPage()
    fireEvent.click(await screen.findByRole('button', { name: /Thêm phiên bản/ }))

    expect(screen.getByLabelText('Số phiên bản')).toHaveValue(3)
    fireEvent.change(screen.getByLabelText('Nội dung câu hỏi'), { target: { value: 'What is the topic?' } })
    fireEvent.change(screen.getByLabelText('Nội dung lựa chọn 1'), { target: { value: 'Trees' } })
    fireEvent.change(screen.getByLabelText('Nội dung lựa chọn 2'), { target: { value: 'Rivers' } })
    fireEvent.click(screen.getByLabelText('Đáp án đúng là lựa chọn 2'))
    fireEvent.change(screen.getByLabelText('Độ khó (bắt buộc để xuất bản)'), { target: { value: 'MEDIUM' } })
    fireEvent.click(await screen.findByLabelText(/R55_SCAN/))
    fireEvent.click(screen.getByRole('button', { name: 'Lưu bản nháp' }))

    await waitFor(() => expect(api.addQuestionVersion).toHaveBeenCalledTimes(1))
    const [questionId, body] = api.addQuestionVersion.mock.calls[0]
    expect(questionId).toBe('q1')
    expect(body).toMatchObject({
      versionNumber: 3,
      stem: 'What is the topic?',
      difficulty: 'MEDIUM',
      knowledgePoints: [{ knowledgePointId: 'kp1', weight: 1 }],
    })
    expect(JSON.parse(body.answerSpecJson)).toEqual({ type: 'CHOICE', correct: 'B' })
    expect(await screen.findByText('Đã lưu phiên bản 3 ở trạng thái nháp.')).toBeInTheDocument()
  })

  it('lists the form problems instead of sending an incomplete version', async () => {
    renderPage()
    fireEvent.click(await screen.findByRole('button', { name: /Thêm phiên bản/ }))
    fireEvent.click(screen.getByRole('button', { name: 'Lưu bản nháp' }))

    const alert = await screen.findByRole('alert')
    expect(alert).toHaveTextContent('Cần nhập nội dung câu hỏi.')
    expect(alert).toHaveTextContent('Cần chọn đáp án đúng')
    expect(api.addQuestionVersion).not.toHaveBeenCalled()
  })

  it('shows the server message when saving a version fails', async () => {
    api.addQuestionVersion.mockRejectedValue(new HttpError(400, 'versionNumber already exists'))
    renderPage()
    fireEvent.click(await screen.findByRole('button', { name: /Thêm phiên bản/ }))
    fireEvent.change(screen.getByLabelText('Nội dung câu hỏi'), { target: { value: 'Stem' } })
    fireEvent.change(screen.getByLabelText('Nội dung lựa chọn 1'), { target: { value: 'One' } })
    fireEvent.change(screen.getByLabelText('Nội dung lựa chọn 2'), { target: { value: 'Two' } })
    fireEvent.click(screen.getByLabelText('Đáp án đúng là lựa chọn 1'))
    fireEvent.click(screen.getByRole('button', { name: 'Lưu bản nháp' }))

    expect(await screen.findByText('versionNumber already exists')).toBeInTheDocument()
  })

  it('shows an essay form with the Task 1 chart facts only for Task 1', async () => {
    api.getQuestion.mockResolvedValue(detail({ questionType: 'ESSAY', versions: [] }))
    renderPage()
    fireEvent.click(await screen.findByRole('button', { name: /Thêm phiên bản/ }))

    expect(screen.getByLabelText('Band đạt')).toBeInTheDocument()
    expect(screen.queryByLabelText(/Số liệu và đặc điểm chính/)).not.toBeInTheDocument()
    fireEvent.change(screen.getByLabelText('Dạng bài'), { target: { value: 'TASK_1' } })
    expect(screen.getByLabelText(/Số liệu và đặc điểm chính/)).toBeInTheDocument()
    expect(screen.getByLabelText('Số từ tối thiểu')).toHaveValue('150')
  })

  it('shows a retryable error when the question cannot be loaded', async () => {
    api.getQuestion.mockRejectedValueOnce(new HttpError(404, 'Question not found'))
    renderPage()

    expect(await screen.findByRole('alert')).toHaveTextContent('Question not found')
  })
})
