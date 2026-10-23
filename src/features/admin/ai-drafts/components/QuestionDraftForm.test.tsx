import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { QuestionDraft } from '../types'
import { QuestionDraftForm } from './QuestionDraftForm'

const api = vi.hoisted(() => ({ requestQuestionDraft: vi.fn() }))
const tree = vi.hoisted(() => ({ fetchKnowledgeTree: vi.fn() }))
vi.mock('../api/aiDraftApi', () => api)
vi.mock('../../knowledge-graph/api/knowledgeGraphApi', () => tree)
const firstId = '11111111-1111-4111-8111-111111111111'
const secondId = '22222222-2222-4222-8222-222222222222'
const draft: QuestionDraft = {
  id: '33333333-3333-4333-8333-333333333333', kind: 'QUESTIONS', status: 'QUEUED',
  request: { knowledgePointId: firstId, questionType: 'MULTIPLE_CHOICE', count: 5, difficulty: 'MEDIUM' },
  result: null, errorCode: null, model: null, promptVersion: null, createdAt: '2026-10-23T00:00:00Z',
  finishedAt: null, reviewedAt: null, reviewNote: null,
}

describe('QuestionDraftForm', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    api.requestQuestionDraft.mockResolvedValue(draft)
    tree.fetchKnowledgeTree.mockResolvedValue({ nodes: [
      { id: firstId, code: 'KP_ONE', name: 'Kiến thức đầu tiên' },
      { id: secondId, code: 'KP_TWO', name: 'Kiến thức thứ hai' },
    ] })
  })

  it('offers four supported types and submits the default configuration', async () => {
    const onCreated = vi.fn()
    render(<QuestionDraftForm initialKnowledgePointId={firstId} onCreated={onCreated} onCancel={vi.fn()} />)
    expect(within(screen.getByLabelText('Dạng câu hỏi')).getAllByRole('option')).toHaveLength(4)
    expect(screen.queryByRole('option', { name: 'Bài luận' })).not.toBeInTheDocument()
    expect(screen.queryByRole('option', { name: 'Speaking' })).not.toBeInTheDocument()
    fireEvent.submit(screen.getByRole('form', { name: 'Tạo bản nháp câu hỏi' }))
    await waitFor(() => expect(onCreated).toHaveBeenCalledWith(draft))
    expect(api.requestQuestionDraft).toHaveBeenCalledWith({ knowledgePointId: firstId, questionType: 'MULTIPLE_CHOICE', count: 5, difficulty: 'MEDIUM' })
  })

  it('requires a knowledge point and replaces the current selection with the next one', async () => {
    render(<QuestionDraftForm onCreated={vi.fn()} onCancel={vi.fn()} />)
    const form = screen.getByRole('form', { name: 'Tạo bản nháp câu hỏi' })
    fireEvent.submit(form)
    expect(await screen.findByRole('alert')).toHaveTextContent('Chọn một điểm kiến thức')
    expect(api.requestQuestionDraft).not.toHaveBeenCalled()
    fireEvent.click(await screen.findByRole('checkbox', { name: /KP_ONE/ }))
    fireEvent.click(screen.getByRole('checkbox', { name: /KP_TWO/ }))
    expect(screen.getByRole('checkbox', { name: /KP_ONE/ })).not.toBeChecked()
    expect(screen.getByRole('checkbox', { name: /KP_TWO/ })).toBeChecked()
    fireEvent.submit(form)
    await waitFor(() => expect(api.requestQuestionDraft).toHaveBeenCalledWith(expect.objectContaining({ knowledgePointId: secondId })))
  })

  it.each(['0', '21', '1.5'])('rejects invalid question count %s', async (count) => {
    render(<QuestionDraftForm initialKnowledgePointId={firstId} onCreated={vi.fn()} onCancel={vi.fn()} />)
    fireEvent.change(screen.getByLabelText('Số câu'), { target: { value: count } })
    fireEvent.submit(screen.getByRole('form', { name: 'Tạo bản nháp câu hỏi' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('số nguyên từ 1 đến 20')
    expect(api.requestQuestionDraft).not.toHaveBeenCalled()
  })

  it('locks all inputs during requests, retains values on failure and allows retry', async () => {
    let reject!: (reason: Error) => void
    api.requestQuestionDraft.mockReturnValueOnce(new Promise((_resolve, rejectRequest) => { reject = rejectRequest }))
    const onCancel = vi.fn()
    const onCreated = vi.fn()
    render(<QuestionDraftForm initialKnowledgePointId={firstId} onCreated={onCreated} onCancel={onCancel} />)
    const form = screen.getByRole('form', { name: 'Tạo bản nháp câu hỏi' })
    const instructions = screen.getByLabelText('Hướng dẫn thêm (tùy chọn)', { exact: false })
    fireEvent.change(screen.getByLabelText('Dạng câu hỏi'), { target: { value: 'SHORT_ANSWER' } })
    fireEvent.change(screen.getByLabelText('Độ khó'), { target: { value: 'HARD' } })
    fireEvent.change(screen.getByLabelText('Số câu'), { target: { value: '20' } })
    fireEvent.change(instructions, { target: { value: 'x'.repeat(500) } })
    expect(screen.getByText('500/500 ký tự')).toBeInTheDocument()
    expect(instructions).toHaveAttribute('maxlength', '500')
    fireEvent.submit(form)
    expect(screen.getByRole('button', { name: 'Đang gửi yêu cầu…' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Hủy' })).toBeDisabled()
    expect(screen.getByLabelText('Số câu')).toBeDisabled()
    expect(await screen.findByRole('checkbox', { name: /KP_ONE/ })).toBeDisabled()
    fireEvent.submit(form)
    expect(api.requestQuestionDraft).toHaveBeenCalledTimes(1)
    await act(async () => reject(new Error('Mất kết nối')))
    expect(await screen.findByRole('alert')).toBeInTheDocument()
    expect(screen.getByLabelText('Dạng câu hỏi')).toHaveValue('SHORT_ANSWER')
    expect(screen.getByLabelText('Độ khó')).toHaveValue('HARD')
    expect(screen.getByLabelText('Số câu')).toHaveValue(20)
    expect(instructions).toHaveValue('x'.repeat(500))
    expect(onCreated).not.toHaveBeenCalled()
    fireEvent.submit(form)
    await waitFor(() => expect(onCreated).toHaveBeenCalledWith(draft))
    expect(api.requestQuestionDraft).toHaveBeenLastCalledWith({ knowledgePointId: firstId, questionType: 'SHORT_ANSWER', count: 20, difficulty: 'HARD', instructions: 'x'.repeat(500) })
    expect(onCancel).not.toHaveBeenCalled()
  })

  it('does not invoke the creation callback if the author leaves before the request finishes', async () => {
    let resolve!: (value: QuestionDraft) => void
    api.requestQuestionDraft.mockReturnValueOnce(new Promise((resolveRequest) => { resolve = resolveRequest }))
    const onCreated = vi.fn()
    const { unmount } = render(<QuestionDraftForm initialKnowledgePointId={firstId} onCreated={onCreated} onCancel={vi.fn()} />)
    fireEvent.submit(screen.getByRole('form', { name: 'Tạo bản nháp câu hỏi' }))
    expect(api.requestQuestionDraft).toHaveBeenCalledTimes(1)
    unmount()
    await act(async () => resolve(draft))
    expect(onCreated).not.toHaveBeenCalled()
  })
})
