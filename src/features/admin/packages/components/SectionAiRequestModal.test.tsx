import { fireEvent, render, screen, waitFor } from '@/test/render'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { SectionAiRequestModal } from './SectionAiRequestModal'

const api = vi.hoisted(() => ({ getAiAllowance: vi.fn(), requestSectionQuestions: vi.fn() }))
vi.mock('../api/sectionDraftApi', () => api)

const section = {
  id: '00000000-0000-4000-8000-000000000012', title: 'Reading 1', skill: 'READING' as const, sortOrder: 1, timeLimitSeconds: null,
  partNo: 1, coverAssetId: null, instructions: null, passage: 'A '.repeat(100), audio: null, questions: [],
}
const draft = {
  id: 'draft-id', kind: 'SECTION_QUESTIONS', status: 'QUEUED', request: {}, result: null, errorCode: null,
  model: null, promptVersion: null, createdAt: '2026-11-25T00:00:00Z', finishedAt: null, reviewedAt: null, reviewNote: null,
}

describe('SectionAiRequestModal', () => {
  beforeEach(() => { vi.clearAllMocks(); api.getAiAllowance.mockResolvedValue({ limit: 20, used: 3, remaining: 17 }); api.requestSectionQuestions.mockResolvedValue(draft) })

  it('sends the selected form values and opens the created draft', async () => {
    const onCreated = vi.fn()
    render(<SectionAiRequestModal packageId="00000000-0000-4000-8000-000000000010" versionId="00000000-0000-4000-8000-000000000011" section={section} onClose={vi.fn()} onCreated={onCreated} />)
    fireEvent.change(screen.getByLabelText('Số câu'), { target: { value: '4' } })
    fireEvent.change(screen.getByLabelText('Ghi chú'), { target: { value: 'Dùng thông tin về thời gian.' } })
    fireEvent.click(screen.getByRole('button', { name: 'Sinh câu hỏi' }))
    await waitFor(() => expect(api.requestSectionQuestions).toHaveBeenCalledWith({
      packageId: '00000000-0000-4000-8000-000000000010', versionId: '00000000-0000-4000-8000-000000000011', sectionId: '00000000-0000-4000-8000-000000000012', questionType: 'MULTIPLE_CHOICE',
      count: 4, instructions: 'Dùng thông tin về thời gian.',
    }))
    expect(onCreated).toHaveBeenCalledWith('draft-id')
  })

  it('shows a validation message under the count field and makes no request', async () => {
    render(<SectionAiRequestModal packageId="00000000-0000-4000-8000-000000000010" versionId="00000000-0000-4000-8000-000000000011" section={section} onClose={vi.fn()} onCreated={vi.fn()} />)
    fireEvent.change(screen.getByLabelText('Số câu'), { target: { value: '11' } })
    fireEvent.click(screen.getByRole('button', { name: 'Sinh câu hỏi' }))
    expect(await screen.findByText('Số câu phải từ 1 đến 10.')).toBeInTheDocument()
    expect(api.requestSectionQuestions).not.toHaveBeenCalled()
  })
})
