import { act, fireEvent, render, screen, waitFor, within } from '@/test/render'
import { answerConfirm } from '@/test/confirm'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { Rubric, RubricVersion } from '../types'
import { RubricsPage } from './RubricsPage'

const api = vi.hoisted(() => ({ fetchActiveRubrics: vi.fn(), fetchDraftRubrics: vi.fn(), fetchRubricVersions: vi.fn(), createRubric: vi.fn(), updateRubric: vi.fn(), activateRubric: vi.fn() }))
const flags = vi.hoisted(() => ({ RUBRIC_VERSIONS_ENABLED: false }))
vi.mock('../api/rubricApi', () => api)
vi.mock('../rubricFlags', () => flags)
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
    flags.RUBRIC_VERSIONS_ENABLED = false
    api.fetchActiveRubrics.mockResolvedValue([active])
    api.fetchDraftRubrics.mockResolvedValue([])
    api.fetchRubricVersions.mockResolvedValue([{ code: active.code, task: active.task, version: 1, status: 'ACTIVE' }])
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
    expect(api.fetchRubricVersions).not.toHaveBeenCalled()
  })

  it('uses all versions including retired history when enabled', async () => {
    flags.RUBRIC_VERSIONS_ENABLED = true
    api.fetchDraftRubrics.mockResolvedValue([{ ...draft, version: 3 }])
    api.fetchRubricVersions.mockResolvedValue([
      { code: active.code, task: active.task, version: 8, status: 'RETIRED' },
      { code: active.code, task: active.task, version: 1, status: 'ACTIVE' },
      { code: active.code, task: active.task, version: 3, status: 'DRAFT' },
    ])
    show()
    expect(await screen.findByText('Bản tiếp theo: 9 (theo toàn bộ lịch sử phiên bản).')).toBeInTheDocument()
    expect(api.fetchRubricVersions).toHaveBeenCalledWith(active.code, expect.any(AbortSignal))
    expect(screen.queryByText(/theo các phiên bản đã tải/)).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Tạo bản nháp từ bản đang dùng' }))
    fireEvent.submit(screen.getByRole('form', { name: 'Soạn rubric' }))
    await waitFor(() => expect(api.createRubric).toHaveBeenCalledWith(expect.objectContaining({ code: active.code, version: 9 })))
  })

  it('blocks creation during history loading and failure, then retries without guessing', async () => {
    flags.RUBRIC_VERSIONS_ENABLED = true
    let rejectHistory!: (reason: Error) => void
    api.fetchRubricVersions.mockReturnValueOnce(new Promise((_resolve, reject) => { rejectHistory = reject }))
    show()
    expect(await screen.findByText('Đang tải lịch sử phiên bản rubric…')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Tạo bản nháp từ bản đang dùng' })).toBeDisabled()
    expect(screen.queryByText(/Bản tiếp theo:/)).not.toBeInTheDocument()
    await act(async () => rejectHistory(new Error('Mất kết nối')))
    expect(await screen.findByRole('alert')).toHaveTextContent('Không tải được lịch sử phiên bản.')
    expect(screen.getByRole('button', { name: 'Tạo bản nháp từ bản đang dùng' })).toBeDisabled()
    expect(api.createRubric).not.toHaveBeenCalled()
    let resolveHistory!: (value: RubricVersion[]) => void
    api.fetchRubricVersions.mockReturnValueOnce(new Promise((resolve) => { resolveHistory = resolve }))
    fireEvent.click(screen.getByRole('button', { name: 'Thử lại' }))
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Tạo bản nháp từ bản đang dùng' })).toBeDisabled()
    await act(async () => resolveHistory([{ code: active.code, task: active.task, version: 5, status: 'RETIRED' }]))
    expect(await screen.findByText('Bản tiếp theo: 6 (theo toàn bộ lịch sử phiên bản).')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Tạo bản nháp từ bản đang dùng' })).toBeEnabled()
    expect(api.fetchRubricVersions).toHaveBeenCalledTimes(2)
  })

  it('loads the current task code and ignores history that arrives after switching tasks', async () => {
    flags.RUBRIC_VERSIONS_ENABLED = true
    let resolveOldHistory!: (value: RubricVersion[]) => void
    api.fetchRubricVersions.mockReturnValueOnce(new Promise((resolve) => { resolveOldHistory = resolve }))
    show()
    await waitFor(() => expect(api.fetchRubricVersions).toHaveBeenCalledWith(active.code, expect.any(AbortSignal)))
    const oldSignal = api.fetchRubricVersions.mock.calls[0]![1] as AbortSignal
    const taskOne = { ...active, code: 'IELTS_WRITING_T1', task: 'TASK_1' as const }
    api.fetchActiveRubrics.mockResolvedValue([taskOne])
    api.fetchRubricVersions.mockResolvedValue([{ code: taskOne.code, task: taskOne.task, version: 4, status: 'ACTIVE' }])
    fireEvent.click(screen.getByRole('button', { name: 'Task 1' }))
    expect(await screen.findByText('Bản tiếp theo: 5 (theo toàn bộ lịch sử phiên bản).')).toBeInTheDocument()
    expect(api.fetchRubricVersions).toHaveBeenLastCalledWith(taskOne.code, expect.any(AbortSignal))
    expect(oldSignal.aborted).toBe(true)
    await act(async () => resolveOldHistory([{ code: active.code, task: active.task, version: 99, status: 'RETIRED' }]))
    expect(screen.queryByText(/Bản tiếp theo: 100/)).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Tạo bản nháp từ bản đang dùng' }))
    expect(screen.getByRole('heading', { name: 'IELTS_WRITING_T1 · Bản nháp 5' })).toBeInTheDocument()
  })

  it('refreshes history after saving while keeping subsequent draft edits', async () => {
    flags.RUBRIC_VERSIONS_ENABLED = true
    api.createRubric.mockResolvedValue({ ...draft, sourceNote: 'Đã kiểm tra chuyên môn' })
    show()
    await screen.findByText('Bản tiếp theo: 2 (theo toàn bộ lịch sử phiên bản).')
    fireEvent.click(screen.getByRole('button', { name: 'Tạo bản nháp từ bản đang dùng' }))
    const form = screen.getByRole('form', { name: 'Soạn rubric' })
    fireEvent.change(within(form).getByLabelText('Nguồn rubric'), { target: { value: 'Đã kiểm tra chuyên môn' } })
    let resolveHistory!: (value: RubricVersion[]) => void
    api.fetchRubricVersions.mockReturnValueOnce(new Promise((resolve) => { resolveHistory = resolve }))
    fireEvent.submit(form)
    await screen.findByText('Đã lưu bản nháp.')
    expect(await screen.findByText('Đang tải lịch sử phiên bản rubric…')).toBeInTheDocument()
    expect(within(form).getByLabelText('Nguồn rubric')).toHaveValue('Đã kiểm tra chuyên môn')
    fireEvent.change(within(form).getByLabelText('Nguồn rubric'), { target: { value: 'Đang sửa tiếp' } })
    await act(async () => resolveHistory([
      { code: active.code, task: active.task, version: 1, status: 'ACTIVE' },
      { code: active.code, task: active.task, version: 2, status: 'DRAFT' },
    ]))
    expect(await screen.findByText('Bản tiếp theo: 3 (theo toàn bộ lịch sử phiên bản).')).toBeInTheDocument()
    expect(within(form).getByLabelText('Nguồn rubric')).toHaveValue('Đang sửa tiếp')
    expect(screen.getByRole('button', { hidden: true, name: 'Tạo bản nháp từ bản đang dùng' })).toBeDisabled()
    fireEvent.submit(form)
    await waitFor(() => expect(api.updateRubric).toHaveBeenCalledWith(expect.objectContaining({ version: 2, sourceNote: 'Đang sửa tiếp' })))
    expect(api.createRubric).toHaveBeenCalledTimes(1)
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
    api.fetchDraftRubrics.mockResolvedValue([draft])
    show()
    fireEvent.click(await screen.findByRole('button', { name: 'Sửa bản nháp 2' }))
    fireEvent.click(screen.getByRole('button', { name: 'Kích hoạt' }))
    const popup = await answerConfirm(false)
    expect(popup).toHaveTextContent('Rubric này sẽ được dùng để chấm mọi bài Writing Task 2 từ bây giờ.')
    expect(api.activateRubric).not.toHaveBeenCalled()
    fireEvent.click(screen.getByRole('button', { name: 'Kích hoạt' }))
    await answerConfirm(true)
    await waitFor(() => expect(api.activateRubric).toHaveBeenCalledWith(active.code, 2))
  })
  it('requires saving changes before activation', async () => {
    api.fetchDraftRubrics.mockResolvedValue([draft])
    show()
    fireEvent.click(await screen.findByRole('button', { name: 'Sửa bản nháp 2' }))
    fireEvent.change(screen.getByLabelText('Nguồn rubric'), { target: { value: 'Nguồn mới' } })
    expect(screen.getByRole('button', { name: 'Kích hoạt' })).toBeDisabled()
  })
})
