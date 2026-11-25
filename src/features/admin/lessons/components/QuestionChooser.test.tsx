import { fireEvent, render, screen, waitFor, within } from '@/test/render'
import { useState } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { QuestionChooser } from './QuestionChooser'
import { BlockEditor } from './BlockEditor'
import type { LessonBlock } from '../types'

const api = vi.hoisted(() => ({ listQuestions: vi.fn(), getQuestion: vi.fn() }))
vi.mock('../../questions/api/questionApi', () => api)

function page(content: Array<Record<string, unknown>>, pageNumber = 0, totalPages = 1, totalElements = content.length) {
  return { content, page: pageNumber, size: 25, totalPages, totalElements }
}

function question(id: string, code: string, versionId: string) {
  return { id, code, currentPublishedVersionId: versionId, questionType: 'MULTIPLE_CHOICE', skill: 'LISTENING', status: 'PUBLISHED' }
}

function Harness({ defaultSkill }: { defaultSkill?: string }) {
  const [value, setValue] = useState<string[]>([])
  return <QuestionChooser defaultSkill={defaultSkill} known={[]} onChange={setValue} value={value} />
}

describe('QuestionChooser', () => {
  beforeEach(() => { vi.clearAllMocks(); api.listQuestions.mockResolvedValue(page([])) })

  it('defaults to the supplied valid skill, but leaves the shared package chooser on all skills without it', async () => {
    const { unmount } = render(<QuestionChooser defaultSkill="LISTENING" value={[]} known={[]} onChange={vi.fn()} />)
    await waitFor(() => expect(api.listQuestions).toHaveBeenCalledWith(expect.objectContaining({ skill: 'LISTENING', page: 0, size: 25 }), expect.any(AbortSignal)))
    expect(screen.getByLabelText('Lọc kỹ năng')).toHaveValue('LISTENING')

    api.listQuestions.mockClear()
    unmount()
    render(<QuestionChooser value={[]} known={[]} onChange={vi.fn()} purpose="EXAM" />)
    await waitFor(() => expect(api.listQuestions).toHaveBeenCalledWith(expect.objectContaining({ purpose: 'EXAM', skill: '', page: 0, size: 25 }), expect.any(AbortSignal)))
    expect(screen.getByLabelText('Lọc kỹ năng')).toHaveValue('')
  })

  it('remembers selected question codes while loading more questions', async () => {
    api.listQuestions.mockImplementation(async ({ page: pageNumber }: { page: number }) => pageNumber === 0
      ? page([question('q1', 'L-Q001', 'v1')], 0, 2, 26)
      : page([question('q2', 'L-Q002', 'v2')], 1, 2, 26))
    render(<Harness />)

    fireEvent.click(await screen.findByRole('checkbox'))
    expect(await screen.findByRole('region', { name: 'Câu hỏi đã chọn' })).toHaveTextContent('L-Q001')
    fireEvent.click(await screen.findByRole('button', { name: 'Tải thêm' }))
    await waitFor(() => expect(api.listQuestions).toHaveBeenLastCalledWith(expect.objectContaining({ page: 1 }), expect.any(AbortSignal)))
    expect(screen.getByRole('region', { name: 'Câu hỏi đã chọn' })).toHaveTextContent('L-Q001')
    expect(screen.getByText(/Đang hiện 2/)).toBeInTheDocument()
  })

  it('searches by question code after a short delay and resets to page zero', async () => {
    api.listQuestions.mockImplementation(async (filters: { code?: string; page: number }) => page([], filters.page, 0, 0))
    render(<QuestionChooser value={[]} known={[]} onChange={vi.fn()} />)
    await screen.findByText('Chưa có câu hỏi đã xuất bản dành cho bài học. Xuất bản câu hỏi ở mục Ngân hàng câu hỏi trước.')
    fireEvent.change(screen.getByLabelText('Tìm theo mã câu hỏi'), { target: { value: 'L-Q' } })

    await waitFor(() => expect(api.listQuestions).toHaveBeenLastCalledWith(expect.objectContaining({ code: 'L-Q', page: 0 }), expect.any(AbortSignal)), { timeout: 1500 })
  })

  it('filters questions to the lesson knowledge points by default and can show all points', async () => {
    render(<QuestionChooser lessonKnowledgePointIds={['kp-1', 'kp-2']} value={[]} known={[]} onChange={vi.fn()} />)
    const filter = await screen.findByRole('switch', { name: 'Chỉ câu thuộc điểm kiến thức của bài' })
    expect(filter).toBeChecked()
    await waitFor(() => expect(api.listQuestions).toHaveBeenCalledWith(expect.objectContaining({ knowledgePointIds: ['kp-1', 'kp-2'] }), expect.any(AbortSignal)))
    fireEvent.click(filter)
    await waitFor(() => expect(api.listQuestions).toHaveBeenLastCalledWith(expect.not.objectContaining({ knowledgePointIds: expect.anything() }), expect.any(AbortSignal)))
  })

  it('shows ownership and preview only when enabled and sends onlyFree from its switch', async () => {
    api.listQuestions.mockResolvedValue(page([{
      ...question('q1', 'L-Q001', 'v1'), ownedElsewhere: true, stemExcerpt: 'The opening sentence',
      knowledgePoints: [{ code: 'L1', name: 'Listening for names' }, { code: 'L2', name: 'Listening for numbers' }], knowledgePointTotal: 3,
    }]))
    const { rerender } = render(<QuestionChooser blockId="block-1" includeOwnershipPreview known={[]} onChange={vi.fn()} value={[]} />)
    const list = await screen.findByRole('list', { name: 'Danh sách câu hỏi' })
    const checkbox = await within(list).findByRole('checkbox')
    expect(checkbox).toBeDisabled()
    expect(within(list).getByText('Đã dùng ở nơi khác')).toBeInTheDocument()
    expect(within(list).getByText('The opening sentence')).toBeInTheDocument()
    expect(within(list).getByText('L1')).toHaveAttribute('title', 'Listening for names')
    expect(within(list).getByText('+1')).toBeInTheDocument()
    expect(api.listQuestions).toHaveBeenLastCalledWith(expect.objectContaining({ include: 'ownership,preview', exceptBlockId: 'block-1' }), expect.any(AbortSignal))

    fireEvent.click(screen.getByRole('switch', { name: 'Chỉ hiện câu còn trống' }))
    await waitFor(() => expect(api.listQuestions).toHaveBeenLastCalledWith(expect.objectContaining({ onlyFree: true, page: 0 }), expect.any(AbortSignal)))
    rerender(<QuestionChooser blockId="block-1" includeOwnershipPreview known={[]} onChange={vi.fn()} value={['v1']} />)
    await waitFor(() => expect(within(screen.getByRole('list', { name: 'Danh sách câu hỏi' })).getByRole('checkbox')).toBeEnabled())
  })

  it('loads exercise choices from BlockEditor with ownership, current block, free-only, and lesson-point filters', async () => {
    render(<BlockEditor blockType="EXERCISE" block={{
      id: 'block-1', blockType: 'EXERCISE', sortOrder: 0, textContent: null, assetId: null,
      vocabularySenseIds: [], knowledgePointIds: [], questions: [],
    } satisfies LessonBlock} lessonKnowledgePointIds={['kp-1', 'kp-2']} onCancel={vi.fn()} onSave={vi.fn()} />)

    await waitFor(() => expect(api.listQuestions).toHaveBeenCalledWith(expect.objectContaining({
      include: 'ownership,preview', exceptBlockId: 'block-1', knowledgePointIds: ['kp-1', 'kp-2'],
    }), expect.any(AbortSignal)))
    fireEvent.click(screen.getByRole('switch', { name: 'Chỉ hiện câu còn trống' }))
    await waitFor(() => expect(api.listQuestions).toHaveBeenLastCalledWith(expect.objectContaining({
      include: 'ownership,preview', onlyFree: true, exceptBlockId: 'block-1', knowledgePointIds: ['kp-1', 'kp-2'],
    }), expect.any(AbortSignal)))
  })
})
