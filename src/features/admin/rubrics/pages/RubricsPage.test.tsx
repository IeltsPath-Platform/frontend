import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { Rubric } from '../types'
import { RubricsPage } from './RubricsPage'

const api = vi.hoisted(() => ({ fetchActiveRubrics: vi.fn(), fetchDraftRubrics: vi.fn(), createRubric: vi.fn(), updateRubric: vi.fn(), activateRubric: vi.fn() }))
vi.mock('../api/rubricApi', () => api)
const active: Rubric = {
  code: 'IELTS_WRITING_T2', task: 'TASK_2', version: 1, status: 'ACTIVE', sourceNote: 'Rubric học thuật',
  criteria: (['TR', 'CC', 'LR', 'GRA'] as const).map((code, index) => ({ code, name: `Tiêu chí ${code}`, description: `Mô tả ${code}`, sortOrder: index + 1, knowledgePointId: `kp${index}`, bandDescriptors: Array.from({ length: 11 }, (_, step) => ({ band: 4 + step * 0.5, descriptor: `Mô tả band ${4 + step * 0.5}` })) })),
  examples: [{ band: 6.5, prompt: 'Đề bài học thuật', essay: 'Bài mẫu học thuật', commentary: 'Nhận xét bài mẫu' }],
}
const draft = { ...active, version: 2, status: 'DRAFT' as const }
function show() { return render(<MemoryRouter initialEntries={['/content-author/rubrics?task=TASK_2']}><RubricsPage /></MemoryRouter>) }
describe('RubricsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    api.fetchActiveRubrics.mockResolvedValue([active])
    api.fetchDraftRubrics.mockResolvedValue([])
    api.createRubric.mockResolvedValue(draft)
    api.updateRubric.mockResolvedValue(draft)
    api.activateRubric.mockResolvedValue({ ...draft, status: 'ACTIVE' })
  })
  it('shows active content and reads the task from the URL', async () => {
    show()
    expect(await screen.findByText('IELTS_WRITING_T2 · Phiên bản 1 · Đang dùng')).toBeInTheDocument()
    expect(screen.getByText('Bài mẫu học thuật')).toBeInTheDocument()
    expect(api.fetchActiveRubrics).toHaveBeenCalledWith('TASK_2', expect.any(AbortSignal))
    fireEvent.click(screen.getByRole('button', { name: 'Task 1' }))
    await waitFor(() => expect(api.fetchDraftRubrics).toHaveBeenCalledWith('TASK_1', expect.any(AbortSignal)))
  })
  it('posts a new draft then puts subsequent edits under the same code and version', async () => {
    show()
    fireEvent.click(await screen.findByRole('button', { name: 'Tạo bản nháp từ bản đang dùng' }))
    const form = screen.getByRole('form', { name: 'Soạn rubric' })
    fireEvent.change(within(form).getByLabelText('Nguồn rubric'), { target: { value: 'Đã kiểm tra chuyên môn' } })
    fireEvent.submit(form)
    await waitFor(() => expect(api.createRubric).toHaveBeenCalledWith(expect.objectContaining({ code: active.code, task: 'TASK_2', version: 2, sourceNote: 'Đã kiểm tra chuyên môn' })))
    expect(api.createRubric.mock.calls[0]![0]).not.toHaveProperty('status')
    expect(api.createRubric.mock.calls[0]![0].criteria[0]).not.toHaveProperty('knowledgePointId')
    await screen.findByText('Đã lưu bản nháp.')
    fireEvent.change(within(form).getByLabelText('Nguồn rubric'), { target: { value: 'Hiệu chỉnh lần hai' } })
    fireEvent.submit(form)
    await waitFor(() => expect(api.updateRubric).toHaveBeenCalledWith(expect.objectContaining({ code: active.code, version: 2, sourceNote: 'Hiệu chỉnh lần hai' })))
    expect(api.createRubric).toHaveBeenCalledTimes(1)
  })

  it('shows and submits the next version after the largest loaded draft', async () => {
    api.fetchDraftRubrics.mockResolvedValue([{ ...draft, version: 7 }, { ...draft, version: 3 }])
    api.createRubric.mockResolvedValue({ ...draft, version: 8 })
    show()
    expect(await screen.findByText('Bản tiếp theo: 8 (theo các phiên bản đã tải).')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Tạo bản nháp từ bản đang dùng' }))
    fireEvent.submit(screen.getByRole('form', { name: 'Soạn rubric' }))
    await waitFor(() => expect(api.createRubric).toHaveBeenCalledWith(expect.objectContaining({ code: active.code, version: 8 })))
  })
  it('does not save a criterion without any band descriptors', async () => {
    api.fetchActiveRubrics.mockResolvedValue([{ ...active, criteria: [{ ...active.criteria[0], bandDescriptors: [] }] }])
    show()
    fireEvent.click(await screen.findByRole('button', { name: 'Tạo bản nháp từ bản đang dùng' }))
    fireEvent.submit(screen.getByRole('form', { name: 'Soạn rubric' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('mỗi tiêu chí cần ít nhất một band không trùng')
    expect(api.createRubric).not.toHaveBeenCalled()
  })
  it('blocks duplicate bands inside a criterion', async () => {
    show()
    fireEvent.click(await screen.findByRole('button', { name: 'Tạo bản nháp từ bản đang dùng' }))
    const form = screen.getByRole('form', { name: 'Soạn rubric' })
    fireEvent.change(within(form).getByLabelText('Band 2 của tiêu chí 1'), { target: { value: '4' } })
    fireEvent.submit(form)
    expect(await screen.findByRole('alert')).toBeInTheDocument()
    expect(api.createRubric).not.toHaveBeenCalled()
  })
  it('confirms the grading impact before activating a saved draft', async () => {
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(false)
    api.fetchDraftRubrics.mockResolvedValue([draft])
    show()
    fireEvent.click(await screen.findByRole('button', { name: 'Sửa bản nháp 2' }))
    fireEvent.click(screen.getByRole('button', { name: 'Kích hoạt' }))
    expect(confirm).toHaveBeenCalledWith(expect.stringContaining('Rubric này sẽ được dùng để chấm mọi bài Writing Task 2 từ bây giờ.'))
    expect(api.activateRubric).not.toHaveBeenCalled()
    confirm.mockReturnValue(true)
    fireEvent.click(screen.getByRole('button', { name: 'Kích hoạt' }))
    await waitFor(() => expect(api.activateRubric).toHaveBeenCalledWith(active.code, 2))
    confirm.mockRestore()
  })
  it('requires saving changes before activation', async () => {
    api.fetchDraftRubrics.mockResolvedValue([draft])
    show()
    fireEvent.click(await screen.findByRole('button', { name: 'Sửa bản nháp 2' }))
    fireEvent.change(screen.getByLabelText('Nguồn rubric'), { target: { value: 'Nguồn mới' } })
    expect(screen.getByRole('button', { name: 'Kích hoạt' })).toBeDisabled()
  })
})
