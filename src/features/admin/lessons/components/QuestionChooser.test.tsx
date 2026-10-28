import { render, waitFor } from '@/test/render'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { QuestionChooser } from './QuestionChooser'

const api = vi.hoisted(() => ({ listQuestions: vi.fn(), getQuestion: vi.fn() }))
vi.mock('../../questions/api/questionApi', () => api)

describe('QuestionChooser purpose', () => {
  beforeEach(() => { vi.clearAllMocks(); api.listQuestions.mockResolvedValue({ content: [] }) })
  it('keeps learning questions as the default', async () => {
    render(<QuestionChooser value={[]} known={[]} onChange={vi.fn()} />)
    await waitFor(() => expect(api.listQuestions).toHaveBeenCalledWith({ status: 'PUBLISHED', purpose: 'LEARNING', skill: '', size: 100 }, expect.any(AbortSignal)))
  })
  it('reloads with the requested purpose when it changes', async () => {
    const { rerender } = render(<QuestionChooser value={[]} known={[]} onChange={vi.fn()} purpose="EXAM" />)
    await waitFor(() => expect(api.listQuestions).toHaveBeenLastCalledWith(expect.objectContaining({ purpose: 'EXAM' }), expect.any(AbortSignal)))
    rerender(<QuestionChooser value={[]} known={[]} onChange={vi.fn()} purpose="PLACEMENT" />)
    await waitFor(() => expect(api.listQuestions).toHaveBeenLastCalledWith(expect.objectContaining({ purpose: 'PLACEMENT' }), expect.any(AbortSignal)))
  })
})
