import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { answerConfirm } from '@/test/confirm'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { PackageSection, PackageType } from '../types'
import { SectionQuestionsEditor } from './SectionQuestionsEditor'

const api = vi.hoisted(() => ({ addSectionQuestion: vi.fn(), removeSectionQuestion: vi.fn(), reorderSectionQuestions: vi.fn() }))
const bank = vi.hoisted(() => ({ listQuestions: vi.fn(), getQuestion: vi.fn() }))
vi.mock('../api/packageApi', () => api)
vi.mock('../../questions/api/questionApi', () => bank)
const section: PackageSection = {
  id: 'section', title: 'Reading 1', skill: 'READING', sortOrder: 1, timeLimitSeconds: null, partNo: null,
  coverAssetId: null, instructions: null, passage: null, audio: null,
  questions: [
    { id: 'row-1', questionId: 'q1', questionVersionId: 'v1', sortOrder: 1, maxScore: 1, stem: 'Câu đầu', status: 'DRAFT', purpose: 'LEARNING' },
    { id: 'row-2', questionId: 'q2', questionVersionId: 'v2', sortOrder: 2, maxScore: 2, stem: 'Câu sau', status: 'PUBLISHED', purpose: 'EXAM' },
  ],
}
const mutate = async (action: () => Promise<unknown>) => { await action(); return true }

describe('SectionQuestionsEditor', () => {
  beforeEach(() => { vi.clearAllMocks(); bank.listQuestions.mockResolvedValue({ content: [{ id: 'q3', currentPublishedVersionId: 'v3', questionType: 'MULTIPLE_CHOICE', skill: 'READING' }] }) })
  function show(packageType: PackageType = 'PRACTICE_SET', disabled = false) {
    return render(<SectionQuestionsEditor packageId="package" versionId="version" section={section} packageType={packageType} disabled={disabled} onSaved={vi.fn()} onMutate={mutate} />)
  }

  it.each([
    ['MOCK_TEST', 'EXAM'], ['PRACTICE_TEST', 'EXAM'], ['PLACEMENT_TEST', 'PLACEMENT'], ['TOPIC_TEST', 'LEARNING'],
  ] as const)('requests published questions for %s with purpose %s', async (type, purpose) => {
    show(type)
    fireEvent.click(screen.getByRole('button', { name: 'Thêm câu hỏi' }))
    await waitFor(() => expect(bank.listQuestions).toHaveBeenCalledWith(expect.objectContaining({ purpose, status: 'PUBLISHED' }), expect.any(AbortSignal)))
  })

  it('shows publication warnings and sends one atomic reorder of all section question row IDs', async () => {
    show('MOCK_TEST')
    expect(screen.getByText('Câu đầu')).toBeInTheDocument()
    expect(screen.getByText('Câu chưa xuất bản')).toBeInTheDocument()
    expect(screen.getByText('Sai mục đích: cần EXAM')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Đưa câu 1 xuống' }))
    await waitFor(() => expect(api.reorderSectionQuestions).toHaveBeenCalledWith('package', 'version', section.id, ['row-2', 'row-1']))
    expect(api.reorderSectionQuestions).toHaveBeenCalledTimes(1)
  })

  it('adds the chosen published version with the configured score', async () => {
    show('PRACTICE_TEST')
    fireEvent.click(screen.getByRole('button', { name: 'Thêm câu hỏi' }))
    fireEvent.click(await screen.findByRole('checkbox', { name: /Trắc nghiệm/ }))
    fireEvent.change(screen.getByLabelText('Điểm tối đa'), { target: { value: '2.5' } })
    fireEvent.click(screen.getByRole('button', { name: 'Thêm câu đã chọn' }))
    await waitFor(() => expect(api.addSectionQuestion).toHaveBeenCalledWith('package', 'version', section.id, { questionVersionId: 'v3', maxScore: 2.5 }))
  })

  it('confirms before removing a question and disables every write when locked', async () => {
    const { rerender } = show()
    fireEvent.click(screen.getByRole('button', { name: 'Gỡ câu 1' }))
    await answerConfirm(false)
    expect(api.removeSectionQuestion).not.toHaveBeenCalled()
    fireEvent.click(screen.getByRole('button', { name: 'Gỡ câu 1' }))
    await answerConfirm(true)
    await waitFor(() => expect(api.removeSectionQuestion).toHaveBeenCalledWith('package', 'version', section.id, 'row-1'))
    rerender(<SectionQuestionsEditor packageId="package" versionId="version" section={section} packageType="PRACTICE_SET" disabled onSaved={vi.fn()} onMutate={mutate} />)
    expect(screen.getByRole('button', { name: 'Thêm câu hỏi' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Gỡ câu 1' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Đưa câu 1 xuống' })).toBeDisabled()
  })
})
