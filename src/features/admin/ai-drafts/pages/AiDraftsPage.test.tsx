import { act, fireEvent, render, screen, waitFor } from '@/test/render'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { HttpError } from '@/lib/httpClient'
import { draftId, makeDraft } from '../testFixtures'
import { AiDraftsPage } from './AiDraftsPage'

const api = vi.hoisted(() => ({ fetchAiDrafts: vi.fn() }))
vi.mock('../api/aiDraftApi', () => api)
vi.mock('../draftFlags', () => ({ QUESTION_DRAFTS_ENABLED: true }))

function show(query = '') {
  return render(<MemoryRouter initialEntries={[`/content-author/ai-drafts${query}`]}><Routes>
    <Route path="/content-author/ai-drafts" element={<AiDraftsPage />} />
    <Route path="/content-author/ai-drafts/:draftId" element={<h1>Draft detail destination</h1>} />
  </Routes></MemoryRouter>)
}
async function settle() { await act(async () => { await Promise.resolve() }) }

describe('AiDraftsPage', () => {
  beforeEach(() => { api.fetchAiDrafts.mockReset(); api.fetchAiDrafts.mockResolvedValue([]) })
  afterEach(() => vi.useRealTimers())

  it('lists lesson and section question drafts with the waiting status selected by default', async () => {
    api.fetchAiDrafts.mockResolvedValue([
      makeDraft({ origin: { type: 'LESSON', title: 'Bài Ngữ pháp · Mệnh đề quan hệ', lessonId: draftId, exists: true } }),
      { ...makeDraft({ id: '10000000-0000-4000-8000-000000000009' }), kind: 'SECTION_QUESTIONS', origin: { type: 'SECTION', title: 'Phần Reading · Đề thử', exists: true } },
    ])
    show()
    expect(await screen.findByRole('heading', { name: 'Duyệt câu hỏi AI' })).toBeInTheDocument()
    expect(await screen.findByText('Bài Ngữ pháp · Mệnh đề quan hệ')).toBeInTheDocument()
    expect(screen.getByText('Phần Reading · Đề thử')).toBeInTheDocument()
    expect(screen.getByLabelText('Trạng thái bản nháp')).toHaveValue('READY')
    expect(api.fetchAiDrafts).toHaveBeenCalledWith({ kind: ['QUESTIONS', 'SECTION_QUESTIONS'], status: 'READY', page: 0, size: 20 }, expect.any(AbortSignal))
    expect(screen.queryByRole('button', { name: 'Sinh câu hỏi' })).not.toBeInTheDocument()
    expect(screen.queryByText(draftId)).not.toBeInTheDocument()
  })

  it('applies the selected status to the combined question draft list', async () => {
    show('?status=FAILED&page=2')
    await screen.findByText('Chưa có bản nháp phù hợp')
    expect(api.fetchAiDrafts).toHaveBeenCalledWith({ kind: ['QUESTIONS', 'SECTION_QUESTIONS'], status: 'FAILED', page: 0, size: 20 }, expect.any(AbortSignal))
    fireEvent.change(screen.getByLabelText('Trạng thái bản nháp'), { target: { value: 'ALL' } })
    await waitFor(() => expect(api.fetchAiDrafts).toHaveBeenLastCalledWith({ kind: ['QUESTIONS', 'SECTION_QUESTIONS'], page: 0, size: 20 }, expect.any(AbortSignal)))
  })

  it('keeps the list read only for legacy create query parameters', async () => {
    show('?new=questions&knowledgePointId=10000000-0000-4000-8000-000000000002')
    await screen.findByText('Chưa có bản nháp phù hợp')
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Sinh câu hỏi' })).not.toBeInTheDocument()
  })

  it('translates backend list failures', async () => {
    api.fetchAiDrafts.mockRejectedValue(new HttpError(429, 'Raw server error'))
    show()
    expect(await screen.findByRole('alert')).toHaveTextContent('Bạn đã dùng hết lượt sinh hôm nay')
  })

  it('polls while a generation is active and stops when it is ready', async () => {
    vi.useFakeTimers()
    api.fetchAiDrafts.mockResolvedValueOnce([makeDraft({ status: 'QUEUED', result: null })])
      .mockResolvedValueOnce([makeDraft({ status: 'GENERATING', result: null })]).mockResolvedValue([makeDraft()])
    show()
    await settle()
    expect(screen.getByText('Đang chờ', { selector: 'span' })).toBeInTheDocument()
    await act(async () => { await vi.advanceTimersByTimeAsync(5000) })
    expect(screen.getByText('Đang sinh', { selector: 'span' })).toBeInTheDocument()
    await act(async () => { await vi.advanceTimersByTimeAsync(5000) })
    expect(screen.getByText('Chờ duyệt', { selector: 'span' })).toBeInTheDocument()
    await act(async () => { await vi.advanceTimersByTimeAsync(10000) })
    expect(api.fetchAiDrafts).toHaveBeenCalledTimes(3)
  })
})
