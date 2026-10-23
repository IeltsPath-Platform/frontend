import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { CourseDraft } from '../types'
import { CourseGenerationForm } from './CourseGenerationForm'

const api = vi.hoisted(() => ({ requestCourseDraft: vi.fn() }))
const tree = vi.hoisted(() => ({ fetchKnowledgeTree: vi.fn() }))
vi.mock('../api/courseDraftApi', () => api)
vi.mock('../../knowledge-graph/api/knowledgeGraphApi', () => tree)
const knowledgePointId = '11111111-1111-4111-8111-111111111111'
const draft: CourseDraft = {
  id: '22222222-2222-4222-8222-222222222222', kind: 'COURSE', status: 'QUEUED', request: {}, result: null,
  errorCode: null, model: null, promptVersion: null, createdAt: '2026-10-23T00:00:00Z', finishedAt: null, reviewedAt: null, reviewNote: null,
}

describe('CourseGenerationForm', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    api.requestCourseDraft.mockResolvedValue(draft)
    tree.fetchKnowledgeTree.mockResolvedValue({ nodes: [{ id: knowledgePointId, code: 'KP_PARAPHRASE', name: 'Nhận diện cách diễn đạt' }] })
  })
  function submit() { fireEvent.submit(screen.getByRole('form', { name: 'Sinh bản nháp khóa học' })) }

  it('submits a structured request with one trimmed topic per line', async () => {
    const onCreated = vi.fn()
    render(<CourseGenerationForm onCreated={onCreated} onCancel={vi.fn()} />)
    fireEvent.change(screen.getByLabelText(/Chủ đề \(mỗi dòng/), { target: { value: ' Paraphrase \n\nInference' } })
    submit()
    await waitFor(() => expect(onCreated).toHaveBeenCalledWith(draft))
    expect(api.requestCourseDraft).toHaveBeenCalledWith({ bandLevel: 6.5, skills: ['READING'], topics: ['Paraphrase', 'Inference'], knowledgePointIds: [], lessonCount: 8, instructions: '' })
  })

  it('accepts direct knowledge point selection without requiring topic phrases', async () => {
    render(<CourseGenerationForm onCreated={vi.fn()} onCancel={vi.fn()} />)
    fireEvent.click(await screen.findByRole('checkbox', { name: /KP_PARAPHRASE/ }))
    submit()
    await waitFor(() => expect(api.requestCourseDraft).toHaveBeenCalledWith(expect.objectContaining({ knowledgePointIds: [knowledgePointId], topics: [] })))
  })

  it('requires knowledge points or topics and at least one skill', async () => {
    render(<CourseGenerationForm onCreated={vi.fn()} onCancel={vi.fn()} />)
    submit()
    expect(await screen.findByRole('alert')).toHaveTextContent('Chọn điểm kiến thức hoặc nhập ít nhất một chủ đề')
    fireEvent.change(screen.getByLabelText(/Chủ đề \(mỗi dòng/), { target: { value: 'Paraphrase' } })
    fireEvent.click(screen.getByRole('checkbox', { name: /^Đọc$/ }))
    submit()
    expect(screen.getByRole('alert')).toHaveTextContent('Chọn ít nhất một kỹ năng')
    expect(api.requestCourseDraft).not.toHaveBeenCalled()
  })

  it.each(['0', '31'])('rejects invalid lesson count %s', async (count) => {
    render(<CourseGenerationForm onCreated={vi.fn()} onCancel={vi.fn()} />)
    fireEvent.change(screen.getByLabelText(/Chủ đề \(mỗi dòng/), { target: { value: 'Paraphrase' } })
    fireEvent.change(screen.getByLabelText('Số bài học'), { target: { value: count } })
    submit()
    expect(await screen.findByRole('alert')).toHaveTextContent('số nguyên từ 1 đến 30')
    expect(api.requestCourseDraft).not.toHaveBeenCalled()
  })

  it('locks the request while pending and keeps all fields after failure', async () => {
    let reject!: (reason: Error) => void
    api.requestCourseDraft.mockReturnValueOnce(new Promise((_resolve, rejectRequest) => { reject = rejectRequest }))
    render(<CourseGenerationForm onCreated={vi.fn()} onCancel={vi.fn()} />)
    fireEvent.change(screen.getByLabelText(/Chủ đề \(mỗi dòng/), { target: { value: 'Paraphrase' } })
    fireEvent.change(screen.getByLabelText('Số bài học'), { target: { value: '12' } })
    fireEvent.change(screen.getByLabelText(/Hướng dẫn thêm/), { target: { value: 'Ưu tiên bài ngắn' } })
    submit()
    expect(screen.getByRole('button', { name: 'Đang gửi yêu cầu…' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Hủy' })).toBeDisabled()
    expect(screen.getByLabelText('Số bài học')).toBeDisabled()
    submit()
    expect(api.requestCourseDraft).toHaveBeenCalledTimes(1)
    await act(async () => reject(new Error('Không kết nối được máy chủ')))
    expect(await screen.findByRole('alert')).toBeInTheDocument()
    expect(screen.getByLabelText('Số bài học')).toHaveValue(12)
    expect(screen.getByLabelText(/Chủ đề \(mỗi dòng/)).toHaveValue('Paraphrase')
    expect(screen.getByLabelText(/Hướng dẫn thêm/)).toHaveValue('Ưu tiên bài ngắn')
  })

  it('ignores late creation callbacks after the form unmounts', async () => {
    let resolve!: (value: CourseDraft) => void
    api.requestCourseDraft.mockReturnValueOnce(new Promise((resolveRequest) => { resolve = resolveRequest }))
    const onCreated = vi.fn()
    const { unmount } = render(<CourseGenerationForm onCreated={onCreated} onCancel={vi.fn()} />)
    fireEvent.change(screen.getByLabelText(/Chủ đề \(mỗi dòng/), { target: { value: 'Paraphrase' } })
    submit()
    unmount()
    await act(async () => resolve(draft))
    expect(onCreated).not.toHaveBeenCalled()
  })
})
