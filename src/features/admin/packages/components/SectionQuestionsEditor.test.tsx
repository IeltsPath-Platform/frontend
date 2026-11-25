import { fireEvent, render, screen, waitFor } from '@/test/render'
import { answerConfirm } from '@/test/confirm'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { PackageSection, PackageType } from '../types'
import { SectionQuestionsEditor } from './SectionQuestionsEditor'

const api = vi.hoisted(() => ({ addSectionQuestion: vi.fn(), removeSectionQuestion: vi.fn(), reorderSectionQuestions: vi.fn(), moveToNewerQuestionVersion: vi.fn() }))
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
  beforeEach(() => { vi.clearAllMocks(); bank.listQuestions.mockResolvedValue({ content: [{ id: 'q3', code: 'Q-SECTION-3', currentPublishedVersionId: 'v3', questionType: 'MULTIPLE_CHOICE', skill: 'READING' }] }) })
  function show(packageType: PackageType = 'PRACTICE_SET', disabled = false) {
    return render(<SectionQuestionsEditor packageId="package" versionId="version" section={section} packageType={packageType} disabled={disabled} onSaved={vi.fn()} onMutate={mutate} />)
  }

  it.each([
    ['MOCK_TEST', 'EXAM'], ['PRACTICE_TEST', 'EXAM'], ['PLACEMENT_TEST', 'PLACEMENT'], ['TOPIC_TEST', 'LEARNING'],
  ] as const)('requests published questions for %s with purpose %s', async (type, purpose) => {
    show(type)
    fireEvent.click(screen.getByRole('button', { name: 'Thêm câu hỏi' }))
    // Only the questions of the section's own skill are offered, so there is no skill filter.
    await waitFor(() => expect(bank.listQuestions).toHaveBeenCalledWith(expect.objectContaining({ purpose, status: 'PUBLISHED', skill: 'READING', onlyFree: true }), expect.any(AbortSignal)))
    expect(bank.listQuestions.mock.lastCall?.[0]).not.toHaveProperty('include')
    expect(screen.queryByRole('switch', { name: 'Chỉ hiện câu còn trống' })).not.toBeInTheDocument()
    expect(screen.queryByLabelText('Lọc kỹ năng')).not.toBeInTheDocument()
  })

  it('lets a Writing task with its prompt be edited only: no add, swap, reorder or remove', () => {
    const writing: PackageSection = { ...section, skill: 'WRITING', questions: [section.questions[1]!] }
    render(<SectionQuestionsEditor packageId="package" versionId="version" section={writing} packageType="MOCK_TEST" disabled={false} onSaved={vi.fn()} onMutate={mutate} />)
    expect(screen.queryByRole('button', { name: /Thêm câu hỏi|Đổi câu hỏi/ })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /^Đưa câu/ })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /^Gỡ câu/ })).not.toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Mở câu hỏi' })).toHaveAttribute('href', '/content-author/questions?edit=q2')
  })
  it('offers to move a question to its newer published version, and only while the section is editable', async () => {
    api.moveToNewerQuestionVersion.mockResolvedValue({})
    const writing: PackageSection = { ...section, skill: 'WRITING', questions: [{ ...section.questions[1]!, newerVersionNumber: 3 }] }
    const props = { packageId: 'package', versionId: 'version', section: writing, packageType: 'MOCK_TEST' as const, onSaved: vi.fn(), onMutate: mutate }
    const { rerender } = render(<SectionQuestionsEditor {...props} disabled={false} />)
    expect(screen.getByText('Có phiên bản mới (v3)')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Dùng phiên bản mới' }))
    await waitFor(() => expect(api.moveToNewerQuestionVersion).toHaveBeenCalledWith('package', 'version', 'section', 'row-2'))
    rerender(<SectionQuestionsEditor {...props} disabled />)
    expect(screen.queryByRole('button', { name: 'Dùng phiên bản mới' })).not.toBeInTheDocument()
  })

  it('offers adding for a Writing task that has no prompt yet', () => {
    render(<SectionQuestionsEditor packageId="package" versionId="version" section={{ ...section, skill: 'WRITING', questions: [] }} packageType="MOCK_TEST" disabled={false} onSaved={vi.fn()} onMutate={mutate} />)
    expect(screen.getByRole('button', { name: 'Thêm câu hỏi' })).toBeEnabled()
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

  it('adds the chosen published version with one point, without asking for a score', async () => {
    show('PRACTICE_TEST')
    fireEvent.click(screen.getByRole('button', { name: 'Thêm câu hỏi' }))
    fireEvent.click(await screen.findByRole('checkbox', { name: /Trắc nghiệm/ }))
    fireEvent.click(screen.getByRole('button', { name: 'Thêm câu đã chọn' }))
    await waitFor(() => expect(api.addSectionQuestion).toHaveBeenCalledWith('package', 'version', section.id, { questionVersionId: 'v3', maxScore: 1 }))
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

