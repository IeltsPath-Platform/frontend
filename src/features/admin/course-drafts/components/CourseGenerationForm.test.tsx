import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
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
    tree.fetchKnowledgeTree.mockResolvedValue({ nodes: [
      { id: knowledgePointId, code: 'KP_PARAPHRASE', name: 'Nhận diện cách diễn đạt', skill: 'READING', cefrLevel: 'C1' },
      { id: '33333333-3333-4333-8333-333333333333', code: 'KP_LISTEN_NUMBERS', name: 'Nghe số', skill: 'LISTENING', cefrLevel: 'B1' },
      { id: '44444444-4444-4444-8444-444444444444', code: 'KP_READ_BASICS', name: 'Đọc nền', skill: 'READING', cefrLevel: 'B2' },
      { id: '77777777-7777-4777-8777-777777777777', code: 'KP_READ_FOUNDATION', name: 'Đọc nhập môn', skill: 'READING', cefrLevel: 'B1' },
      { id: '55555555-5555-4555-8555-555555555555', code: 'KP_READ_ADVANCED', name: 'Đọc nâng cao', skill: 'READING', cefrLevel: 'C2' },
      { id: '66666666-6666-4666-8666-666666666666', code: 'TRAP_WRONG_PARAGRAPH', name: 'Tìm nhầm đoạn văn', skill: 'READING', cefrLevel: null },
    ] })
  })
  function submit() { fireEvent.submit(screen.getByRole('form', { name: 'Sinh bản nháp khóa học' })) }

  async function openChooser() {
    fireEvent.click(await screen.findByRole('button', { name: /^(Chọn điểm kiến thức|Sửa lựa chọn)$/ }))
    return await screen.findByRole('dialog', { name: 'Chọn điểm kiến thức' })
  }
  async function closeChooser(dialog: HTMLElement) {
    fireEvent.click(within(dialog).getByRole('button', { name: 'Lưu' }))
    await waitFor(() => expect(screen.queryByRole('dialog', { name: 'Chọn điểm kiến thức' })).not.toBeInTheDocument())
  }

  async function pickParaphrase() {
    const dialog = await openChooser()
    fireEvent.click(within(dialog).getByRole('checkbox', { name: /KP_PARAPHRASE/ }))
    await closeChooser(dialog)
  }

  it('submits the picked knowledge points with the other fields, and no topic phrases', async () => {
    const onCreated = vi.fn()
    render(<CourseGenerationForm onCreated={onCreated} onCancel={vi.fn()} />)
    await pickParaphrase()
    expect(within(screen.getByRole('table', { name: 'Điểm kiến thức đã chọn' })).getByText('KP_PARAPHRASE')).toBeInTheDocument()
    submit()
    await waitFor(() => expect(onCreated).toHaveBeenCalledWith(draft))
    expect(api.requestCourseDraft).toHaveBeenCalledWith({ bandLevel: 6.5, skills: ['READING'], topics: [], knowledgePointIds: [knowledgePointId], lessonCount: 8, instructions: '' })
  })

  it('offers only the picked skills, up to the band level, highest level first, without error traps', async () => {
    render(<CourseGenerationForm onCreated={vi.fn()} onCancel={vi.fn()} />)
    const dialog = await openChooser()
    const offered = within(dialog).getAllByRole('checkbox', { name: /KP_/ }).map((box) => box.closest('label')?.textContent ?? '')
    expect(offered).toHaveLength(2)
    expect(offered[0]).toContain('KP_PARAPHRASE')
    expect(offered[1]).toContain('KP_READ_BASICS')
    expect(within(dialog).queryByRole('checkbox', { name: /KP_LISTEN_NUMBERS/ })).not.toBeInTheDocument()
    expect(within(dialog).queryByRole('checkbox', { name: /KP_READ_ADVANCED/ })).not.toBeInTheDocument()
    expect(within(dialog).queryByRole('checkbox', { name: /KP_READ_FOUNDATION/ })).not.toBeInTheDocument()
    expect(within(dialog).queryByRole('checkbox', { name: /TRAP_WRONG_PARAGRAPH/ })).not.toBeInTheDocument()
    expect(within(dialog).getByText(/cấp C1 và B2/)).toBeInTheDocument()
  })

  it('groups the dialog by level, filters by level and by text, and clears every pick at once', async () => {
    render(<CourseGenerationForm onCreated={vi.fn()} onCancel={vi.fn()} />)
    const dialog = await openChooser()
    expect(within(dialog).getByRole('region', { name: 'Cấp C1' })).toBeInTheDocument()
    expect(within(dialog).getByRole('region', { name: 'Cấp B2' })).toBeInTheDocument()
    expect(within(dialog).queryByRole('region', { name: 'Cấp B1' })).not.toBeInTheDocument()
    fireEvent.click(within(dialog).getByRole('button', { name: /^B2/ }))
    expect(within(dialog).queryByRole('checkbox', { name: /KP_PARAPHRASE/ })).not.toBeInTheDocument()
    fireEvent.click(within(dialog).getByRole('button', { name: /^Tất cả/ }))
    fireEvent.change(within(dialog).getByLabelText('Lọc điểm kiến thức'), { target: { value: 'basics' } })
    expect(within(dialog).getAllByRole('checkbox', { name: /KP_/ })).toHaveLength(1)
    fireEvent.change(within(dialog).getByLabelText('Lọc điểm kiến thức'), { target: { value: 'zzz' } })
    expect(within(dialog).getByText('Không có điểm kiến thức khớp bộ lọc.')).toBeInTheDocument()
    fireEvent.change(within(dialog).getByLabelText('Lọc điểm kiến thức'), { target: { value: '' } })
    fireEvent.click(within(dialog).getByRole('checkbox', { name: /KP_PARAPHRASE/ }))
    fireEvent.click(within(dialog).getByRole('checkbox', { name: /KP_READ_BASICS/ }))
    expect(within(dialog).getByText(/2\/40 đã chọn/)).toBeInTheDocument()
    fireEvent.click(within(dialog).getByRole('button', { name: 'Bỏ chọn tất cả' }))
    expect(within(dialog).getByText(/0\/40 đã chọn/)).toBeInTheDocument()
  })

  it('removes a picked point from its row, and starts the pick again when the band or the skills change', async () => {
    render(<CourseGenerationForm onCreated={vi.fn()} onCancel={vi.fn()} />)
    const dialog = await openChooser()
    fireEvent.click(within(dialog).getByRole('checkbox', { name: /KP_PARAPHRASE/ }))
    fireEvent.click(within(dialog).getByRole('checkbox', { name: /KP_READ_BASICS/ }))
    await closeChooser(dialog)
    const picks = screen.getByRole('table', { name: 'Điểm kiến thức đã chọn' })
    fireEvent.click(screen.getByRole('button', { name: 'Bỏ chọn KP_PARAPHRASE' }))
    expect(within(picks).queryByText('KP_PARAPHRASE')).not.toBeInTheDocument()
    expect(within(picks).getByText('KP_READ_BASICS')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('radio', { name: '5.5' }))
    expect(within(picks).queryByText('KP_READ_BASICS')).not.toBeInTheDocument()
    expect(within(picks).getByText('Chưa chọn điểm kiến thức nào.')).toBeInTheDocument()

    const again = await openChooser()
    fireEvent.click(within(again).getByRole('checkbox', { name: /KP_READ_BASICS/ }))
    await closeChooser(again)
    expect(within(picks).getByText('KP_READ_BASICS')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('checkbox', { name: /^Nghe$/ }))
    expect(within(picks).queryByText('KP_READ_BASICS')).not.toBeInTheDocument()
    const last = await openChooser()
    expect(within(last).getByRole('checkbox', { name: /KP_LISTEN_NUMBERS/ })).toBeInTheDocument()
  })

  it('keeps the picks when the band chosen again is the same one', async () => {
    render(<CourseGenerationForm onCreated={vi.fn()} onCancel={vi.fn()} />)
    await pickParaphrase()
    fireEvent.click(screen.getByRole('radio', { name: '6.5' }))
    expect(within(screen.getByRole('table', { name: 'Điểm kiến thức đã chọn' })).getByText('KP_PARAPHRASE')).toBeInTheDocument()
  })

  it('says so when the band has no knowledge points at its own level, and offers the level below it', async () => {
    render(<CourseGenerationForm onCreated={vi.fn()} onCancel={vi.fn()} />)
    await screen.findByRole('button', { name: 'Chọn điểm kiến thức' })
    fireEvent.click(screen.getByRole('radio', { name: '8.0' }))
    const top = await openChooser()
    expect(within(top).getByRole('checkbox', { name: /KP_READ_ADVANCED/ })).toBeInTheDocument()
    expect(within(top).getByRole('checkbox', { name: /KP_PARAPHRASE/ })).toBeInTheDocument()
    expect(within(top).queryByRole('checkbox', { name: /KP_READ_BASICS/ })).not.toBeInTheDocument()
    await closeChooser(top)
    fireEvent.click(screen.getByRole('radio', { name: '3.0' }))
    expect(screen.getByText(/cấp A2 chưa có điểm kiến thức/)).toBeInTheDocument()
  })

  it('requires a knowledge point and at least one skill', async () => {
    render(<CourseGenerationForm onCreated={vi.fn()} onCancel={vi.fn()} />)
    submit()
    expect(await screen.findByRole('alert')).toHaveTextContent('Chọn ít nhất một điểm kiến thức')
    await pickParaphrase()
    fireEvent.click(screen.getByRole('checkbox', { name: /^Đọc$/ }))
    submit()
    expect(screen.getByRole('alert')).toHaveTextContent('Chọn ít nhất một kỹ năng')
    expect(api.requestCourseDraft).not.toHaveBeenCalled()
  })

  it.each(['0', '31'])('rejects invalid lesson count %s', async (count) => {
    render(<CourseGenerationForm onCreated={vi.fn()} onCancel={vi.fn()} />)
    await pickParaphrase()
    fireEvent.change(screen.getByLabelText('Số bài học'), { target: { value: count } })
    submit()
    expect(await screen.findByRole('alert')).toHaveTextContent('số nguyên từ 1 đến 30')
    expect(api.requestCourseDraft).not.toHaveBeenCalled()
  })

  it('locks the request while pending and keeps all fields after failure', async () => {
    let reject!: (reason: Error) => void
    api.requestCourseDraft.mockReturnValueOnce(new Promise((_resolve, rejectRequest) => { reject = rejectRequest }))
    render(<CourseGenerationForm onCreated={vi.fn()} onCancel={vi.fn()} />)
    await pickParaphrase()
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
    expect(within(screen.getByRole('table', { name: 'Điểm kiến thức đã chọn' })).getByText('KP_PARAPHRASE')).toBeInTheDocument()
    expect(screen.getByLabelText(/Hướng dẫn thêm/)).toHaveValue('Ưu tiên bài ngắn')
  })

  it('ignores late creation callbacks after the form unmounts', async () => {
    let resolve!: (value: CourseDraft) => void
    api.requestCourseDraft.mockReturnValueOnce(new Promise((resolveRequest) => { resolve = resolveRequest }))
    const onCreated = vi.fn()
    const { unmount } = render(<CourseGenerationForm onCreated={onCreated} onCancel={vi.fn()} />)
    await pickParaphrase()
    submit()
    unmount()
    await act(async () => resolve(draft))
    expect(onCreated).not.toHaveBeenCalled()
  })
})
