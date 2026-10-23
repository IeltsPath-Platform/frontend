import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { HttpError } from '@/lib/httpClient'
import { draftId, knowledgePointId, makeDraft } from '../testFixtures'
import type { AiDraft } from '../types'
import { AiDraftsPage } from './AiDraftsPage'

const api = vi.hoisted(() => ({ fetchAiDrafts: vi.fn(), requestQuestionDraft: vi.fn() }))
vi.mock('../api/aiDraftApi', () => api)
vi.mock('../draftFlags', () => ({ QUESTION_DRAFTS_ENABLED: true }))
vi.mock('../../questions/components/KnowledgePointPicker', () => ({
  KnowledgePointPicker: ({ value }: { value: { knowledgePointId: string }[] }) => <output data-testid="picked-knowledge">{value[0]?.knowledgePointId}</output>,
}))
function Location() { const { pathname, search } = useLocation(); return <output data-testid="location">{pathname}{search}</output> }
function show(query = '') {
  return render(<MemoryRouter initialEntries={[`/content-author/ai-drafts${query}`]}><Routes>
    <Route path="/content-author/ai-drafts" element={<AiDraftsPage />} />
    <Route path="/content-author/ai-drafts/:draftId" element={<h1>Draft detail destination</h1>} />
  </Routes><Location /></MemoryRouter>)
}
async function settle() { await act(async () => { await Promise.resolve() }) }
describe('AiDraftsPage', () => {
  beforeEach(() => { api.fetchAiDrafts.mockReset(); api.requestQuestionDraft.mockReset(); api.fetchAiDrafts.mockResolvedValue([]) })
  afterEach(() => vi.useRealTimers())

  it('fetches only question drafts with the requested status and page', async () => {
    show('?status=FAILED&page=2')
    await screen.findByText('Chưa có bản nháp phù hợp')
    expect(api.fetchAiDrafts).toHaveBeenCalledExactlyOnceWith({ kind: 'QUESTIONS', status: 'FAILED', page: 2, size: 20 }, expect.any(AbortSignal))
    expect(screen.getByText('Trang 3')).toBeInTheDocument()
    fireEvent.change(screen.getByLabelText('Trạng thái bản nháp'), { target: { value: 'READY' } })
    await waitFor(() => expect(api.fetchAiDrafts).toHaveBeenLastCalledWith({ kind: 'QUESTIONS', status: 'READY', page: 0, size: 20 }, expect.any(AbortSignal)))
    expect(screen.getByTestId('location')).toHaveTextContent('?status=READY')
  })
  it('requests the next page without polling drafts on previous pages', async () => {
    vi.useFakeTimers()
    api.fetchAiDrafts.mockResolvedValueOnce(Array.from({ length: 20 }, (_, index) => makeDraft({ id: `10000000-0000-4000-8000-${String(index + 10).padStart(12, '0')}`, status: index ? 'READY' : 'GENERATING' }))).mockResolvedValue([])
    show()
    await settle()
    expect(screen.getByRole('button', { name: 'Trang sau' })).toBeEnabled()
    fireEvent.click(screen.getByRole('button', { name: 'Trang sau' }))
    await settle()
    expect(screen.getByText('Chưa có bản nháp phù hợp')).toBeInTheDocument()
    expect(api.fetchAiDrafts).toHaveBeenLastCalledWith({ kind: 'QUESTIONS', status: undefined, page: 1, size: 20 }, expect.any(AbortSignal))
    await act(async () => { await vi.advanceTimersByTimeAsync(10000) })
    expect(api.fetchAiDrafts).toHaveBeenCalledTimes(2)
  })
  it('polls every five seconds while queued or generating, then stops when ready', async () => {
    vi.useFakeTimers()
    api.fetchAiDrafts.mockResolvedValueOnce([makeDraft({ status: 'QUEUED', result: null })]).mockResolvedValueOnce([makeDraft({ status: 'GENERATING', result: null })]).mockResolvedValue([makeDraft()])
    show()
    await settle()
    expect(screen.getByText('Đang chờ', { selector: 'span' })).toBeInTheDocument()
    await act(async () => { await vi.advanceTimersByTimeAsync(4999) })
    expect(api.fetchAiDrafts).toHaveBeenCalledTimes(1)
    await act(async () => { await vi.advanceTimersByTimeAsync(1) })
    expect(screen.getByText('Đang sinh', { selector: 'span' })).toBeInTheDocument()
    await act(async () => { await vi.advanceTimersByTimeAsync(5000) })
    expect(screen.getByText('Chờ duyệt', { selector: 'span' })).toBeInTheDocument()
    await act(async () => { await vi.advanceTimersByTimeAsync(15000) })
    expect(api.fetchAiDrafts).toHaveBeenCalledTimes(3)
  })
  it('keeps the current list visible during a poll refresh and clears polling on unmount', async () => {
    vi.useFakeTimers()
    let resolve!: (value: AiDraft[]) => void
    api.fetchAiDrafts.mockResolvedValueOnce([makeDraft({ status: 'QUEUED', result: null })]).mockReturnValue(new Promise<AiDraft[]>((done) => { resolve = done }))
    const view = show()
    await settle()
    await act(async () => { await vi.advanceTimersByTimeAsync(5000) })
    expect(screen.getByRole('link', { name: `Bản nháp câu hỏi · ${draftId}` })).toBeInTheDocument()
    expect(screen.getByText('Đang cập nhật danh sách…')).toBeInTheDocument()
    await act(async () => resolve([makeDraft({ status: 'GENERATING', result: null })]))
    view.unmount()
    await act(async () => { await vi.advanceTimersByTimeAsync(10000) })
    expect(api.fetchAiDrafts).toHaveBeenCalledTimes(2)
  })
  it('shows a failed generation reason and does not poll a terminal draft', async () => {
    vi.useFakeTimers()
    api.fetchAiDrafts.mockResolvedValue([makeDraft({ status: 'FAILED', errorCode: 'INVALID_REPLY', result: null })])
    show()
    await settle()
    expect(screen.getByText('AI trả kết quả không hợp lệ')).toBeInTheDocument()
    await act(async () => { await vi.advanceTimersByTimeAsync(15000) })
    expect(api.fetchAiDrafts).toHaveBeenCalledTimes(1)
  })
  it('prefills knowledge from the query and navigates to the returned draft after a request', async () => {
    api.requestQuestionDraft.mockResolvedValue(makeDraft({ status: 'QUEUED', result: null }))
    show(`?new=questions&knowledgePointId=${knowledgePointId}`)
    expect(screen.getByTestId('picked-knowledge')).toHaveTextContent(knowledgePointId)
    fireEvent.submit(screen.getByRole('form', { name: 'Tạo bản nháp câu hỏi' }))
    await screen.findByRole('heading', { name: 'Draft detail destination' })
    expect(api.requestQuestionDraft).toHaveBeenCalledExactlyOnceWith({ knowledgePointId, questionType: 'MULTIPLE_CHOICE', count: 5, difficulty: 'MEDIUM' })
    expect(screen.getByTestId('location')).toHaveTextContent(`/content-author/ai-drafts/${draftId}`)
  })
  it('retains the request form after a quota failure', async () => {
    api.requestQuestionDraft.mockRejectedValue(new HttpError(429, 'Daily quota', { details: { code: 'AI_QUOTA_EXCEEDED' } }))
    show(`?new=questions&knowledgePointId=${knowledgePointId}`)
    fireEvent.change(screen.getByLabelText('Số câu'), { target: { value: '8' } })
    fireEvent.submit(screen.getByRole('form', { name: 'Tạo bản nháp câu hỏi' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('Bạn đã dùng hết lượt sinh hôm nay')
    expect(screen.getByLabelText('Số câu')).toHaveValue(8)
    expect(screen.getByTestId('picked-knowledge')).toHaveTextContent(knowledgePointId)
    expect(api.requestQuestionDraft).toHaveBeenCalledTimes(1)
  })
  it.each([400, 429])('translates an HTTP %i list load failure', async (status) => {
    api.fetchAiDrafts.mockRejectedValue(new HttpError(status, 'Raw server error'))
    show()
    expect(await screen.findByRole('alert')).toHaveTextContent(status === 429 ? 'Bạn đã dùng hết lượt sinh hôm nay' : 'Yêu cầu không hợp lệ. Kiểm tra dữ liệu và trạng thái bản nháp rồi thử lại.')
  })
  it.each(['?page=-1&status=invalid', '?page=1.5', '?page=2147483648'])('normalizes an invalid page query %s before requesting', async (query) => {
    show(query)
    await screen.findByText('Chưa có bản nháp phù hợp')
    expect(api.fetchAiDrafts).toHaveBeenCalledExactlyOnceWith({ kind: 'QUESTIONS', status: undefined, page: 0, size: 20 }, expect.any(AbortSignal))
  })
})
