import { fireEvent, render, screen, waitFor, within } from '@/test/render'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { HttpError } from '@/lib/httpClient'
import { ErrorTypesPage } from './ErrorTypesPage'

const { api, graph, codes } = vi.hoisted(() => ({
  api: { fetchErrorTypes: vi.fn(), createErrorType: vi.fn(), updateErrorType: vi.fn() },
  graph: { fetchKnowledgeTree: vi.fn() },
  codes: { fetchCodeSettings: vi.fn(), fetchCodeSuggestion: vi.fn() },
}))
vi.mock('../api/errorTypeApi', () => api)
vi.mock('../../knowledge-graph/api/knowledgeGraphApi', () => graph)
vi.mock('../../code-settings/api/codeSettingsApi', () => codes)
const spelling = { id: 'e1', code: 'SPELLING', name: 'Sai chính tả', category: 'SPELLING_NUMBER', severity: 1, knowledgePointId: 'kp1', fixHint: 'Đọc lại từng từ.', status: 'ACTIVE', reviewStatus: 'DRAFT' }
const grammar = { ...spelling, id: 'e2', code: 'TENSE', name: 'Sai thì', category: 'GRAMMAR', severity: 2, knowledgePointId: null, reviewStatus: 'APPROVED' }

describe('ErrorTypesPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    api.fetchErrorTypes.mockResolvedValue([spelling, grammar])
    api.createErrorType.mockResolvedValue(spelling)
    api.updateErrorType.mockResolvedValue(spelling)
    graph.fetchKnowledgeTree.mockResolvedValue({ nodes: [{ id: 'kp1', code: 'SPELLING_KP', name: 'Chính tả', kind: 'STRATEGY', status: 'ACTIVE' }], edges: [] })
    codes.fetchCodeSettings.mockResolvedValue([{ kind: 'ERROR_TYPE', applied: false, pattern: '{NAME}', startNumber: 1, editable: true }])
    codes.fetchCodeSuggestion.mockResolvedValue({ code: '', applied: false, editable: true })
  })
  it('shows the spelling and number category, severity and linked knowledge point name', async () => {
    render(<ErrorTypesPage />)
    const row = (await screen.findByText('SPELLING')).closest('tr')!
    expect(row).toHaveTextContent('Chính tả & số')
    expect(row).toHaveTextContent('1 · Nhẹ')
    await waitFor(() => expect(row).toHaveTextContent('Chính tả'))
  })
  it('filters by category, review state and text without reloading the API', async () => {
    render(<ErrorTypesPage />)
    await screen.findByText('SPELLING')
    fireEvent.change(screen.getByLabelText('Lọc nhóm lỗi'), { target: { value: 'GRAMMAR' } })
    expect(screen.queryByText('SPELLING')).not.toBeInTheDocument()
    expect(screen.getByText('TENSE')).toBeInTheDocument()
    fireEvent.change(screen.getByLabelText('Lọc trạng thái duyệt'), { target: { value: 'DRAFT' } })
    expect(screen.getByText('Không có mã lỗi khớp bộ lọc')).toBeInTheDocument()
    fireEvent.change(screen.getByLabelText('Lọc nhóm lỗi'), { target: { value: '' } })
    fireEvent.change(screen.getByLabelText('Tìm mã hoặc tên'), { target: { value: 'chính tả' } })
    expect(screen.getByText('SPELLING')).toBeInTheDocument()
    expect(api.fetchErrorTypes).toHaveBeenCalledTimes(1)
  })
  it('creates an error type with one selected knowledge point', async () => {
    render(<ErrorTypesPage />)
    fireEvent.click(screen.getByRole('button', { name: 'Tạo mã lỗi' }))
    const form = screen.getByRole('form', { name: 'Tạo mã lỗi' })
    fireEvent.change(within(form).getByLabelText('Mã lỗi'), { target: { value: 'NEW_ERROR' } })
    fireEvent.change(within(form).getByLabelText('Tên mã lỗi'), { target: { value: 'Lỗi mới' } })
    fireEvent.change(within(form).getByLabelText('Gợi ý sửa'), { target: { value: 'Kiểm tra cấu trúc câu.' } })
    const chooseKnowledge = within(form).getByRole('button', { name: 'Chọn điểm kiến thức' })
    await waitFor(() => expect(chooseKnowledge).toBeEnabled())
    fireEvent.click(chooseKnowledge)
    const picker = await screen.findByRole('dialog', { name: 'Chọn điểm kiến thức' })
    fireEvent.click(within(picker).getByRole('checkbox', { name: 'SPELLING_KP Chính tả' }))
    fireEvent.click(within(picker).getByRole('button', { name: 'Xong' }))
    fireEvent.submit(form)
    await waitFor(() => expect(api.createErrorType).toHaveBeenCalledWith({ code: 'NEW_ERROR', name: 'Lỗi mới', category: 'GRAMMAR', severity: 1, knowledgePointId: 'kp1', fixHint: 'Kiểm tra cấu trúc câu.' }))
  })
  it('keeps the code locked and omits it from update requests', async () => {
    render(<ErrorTypesPage />)
    fireEvent.click(await screen.findByRole('button', { name: 'Sửa SPELLING' }))
    const form = screen.getByRole('form', { name: 'Sửa mã lỗi' })
    expect(within(form).getByLabelText('Mã lỗi')).toBeDisabled()
    fireEvent.change(within(form).getByLabelText('Tên mã lỗi'), { target: { value: 'Lỗi viết từ' } })
    fireEvent.submit(form)
    await waitFor(() => expect(api.updateErrorType).toHaveBeenCalledWith('e1', { name: 'Lỗi viết từ', category: 'SPELLING_NUMBER', severity: 1, knowledgePointId: 'kp1', fixHint: spelling.fixHint, status: 'ACTIVE', reviewStatus: 'DRAFT' }))
  })
  it('approves with all current editable fields', async () => {
    render(<ErrorTypesPage />)
    fireEvent.click(await screen.findByRole('button', { name: 'Duyệt SPELLING' }))
    await waitFor(() => expect(api.updateErrorType).toHaveBeenCalledWith('e1', { name: spelling.name, category: spelling.category, severity: 1, knowledgePointId: 'kp1', fixHint: spelling.fixHint, status: 'ACTIVE', reviewStatus: 'APPROVED' }))
  })
  it('deactivates without changing review status or the knowledge point', async () => {
    render(<ErrorTypesPage />)
    fireEvent.click(await screen.findByRole('button', { name: 'Ngừng dùng SPELLING' }))
    await waitFor(() => expect(api.updateErrorType).toHaveBeenCalledWith('e1', expect.objectContaining({ status: 'INACTIVE', reviewStatus: 'DRAFT', knowledgePointId: 'kp1' })))
  })
  it('translates the actual duplicate-code response', async () => {
    api.createErrorType.mockRejectedValue(new HttpError(400, "ErrorType with code 'SPELLING' already exists"))
    render(<ErrorTypesPage />)
    fireEvent.click(screen.getByRole('button', { name: 'Tạo mã lỗi' }))
    const form = screen.getByRole('form', { name: 'Tạo mã lỗi' })
    fireEvent.change(within(form).getByLabelText('Mã lỗi'), { target: { value: 'SPELLING' } })
    fireEvent.change(within(form).getByLabelText('Tên mã lỗi'), { target: { value: 'Sai chính tả' } })
    fireEvent.change(within(form).getByLabelText('Gợi ý sửa'), { target: { value: 'Đọc lại từ.' } })
    fireEvent.submit(form)
    expect(await screen.findByRole('alert')).toHaveTextContent('Mã lỗi này đã tồn tại. Hãy chọn mã khác.')
  })
  it('rejects invalid codes before sending a request', async () => {
    render(<ErrorTypesPage />)
    fireEvent.click(screen.getByRole('button', { name: 'Tạo mã lỗi' }))
    const form = screen.getByRole('form', { name: 'Tạo mã lỗi' })
    fireEvent.change(within(form).getByLabelText('Mã lỗi'), { target: { value: 'lower_case' } })
    fireEvent.submit(form)
    expect(await screen.findByText(/Mã bắt đầu bằng chữ in hoa/)).toBeInTheDocument()
    expect(api.createErrorType).not.toHaveBeenCalled()
  })
  describe('with generated codes', () => {
    const generate = (editable: boolean) => {
      codes.fetchCodeSettings.mockResolvedValue([{ kind: 'ERROR_TYPE', applied: true, pattern: '{NAME}', startNumber: 1, editable }])
      codes.fetchCodeSuggestion.mockResolvedValue({ code: 'LOI_MOI', applied: true, editable })
    }
    const fillAndSubmit = async (form: HTMLElement) => {
      fireEvent.change(within(form).getByLabelText('Tên mã lỗi'), { target: { value: 'Lỗi mới' } })
      fireEvent.change(within(form).getByLabelText('Gợi ý sửa'), { target: { value: 'Kiểm tra cấu trúc câu.' } })
      await waitFor(() => expect(within(form).getByLabelText('Mã lỗi')).toHaveValue('LOI_MOI'))
      fireEvent.submit(form)
    }

    it('fills the code from the name and sends it', async () => {
      generate(true)
      render(<ErrorTypesPage />)
      fireEvent.click(screen.getByRole('button', { name: 'Tạo mã lỗi' }))
      const form = screen.getByRole('form', { name: 'Tạo mã lỗi' })
      await fillAndSubmit(form)
      await waitFor(() => expect(codes.fetchCodeSuggestion).toHaveBeenCalledWith(expect.objectContaining({ kind: 'ERROR_TYPE', name: 'Lỗi mới' }), expect.anything()))
      await waitFor(() => expect(api.createErrorType).toHaveBeenCalledWith(expect.objectContaining({ code: 'LOI_MOI', name: 'Lỗi mới' })))
    })

    it('locks the field and leaves the code to the server when it is not editable', async () => {
      generate(false)
      render(<ErrorTypesPage />)
      fireEvent.click(screen.getByRole('button', { name: 'Tạo mã lỗi' }))
      const form = screen.getByRole('form', { name: 'Tạo mã lỗi' })
      await fillAndSubmit(form)
      expect(within(form).getByLabelText('Mã lỗi')).toBeDisabled()
      await waitFor(() => expect(api.createErrorType).toHaveBeenCalled())
      expect(api.createErrorType.mock.calls[0]![0]).not.toHaveProperty('code')
    })

    it('does not ask for a typed code, but still needs a name', async () => {
      generate(true)
      render(<ErrorTypesPage />)
      fireEvent.click(screen.getByRole('button', { name: 'Tạo mã lỗi' }))
      const form = screen.getByRole('form', { name: 'Tạo mã lỗi' })
      fireEvent.submit(form)
      await waitFor(() => expect(form.querySelectorAll('.adm-field__error').length).toBeGreaterThan(0))
      const shown = [...form.querySelectorAll('.adm-field__error')].map((node) => node.textContent ?? '')
      expect(shown.some((text) => text.includes('Tên mã lỗi'))).toBe(true)
      expect(shown.some((text) => text.includes('Mã lỗi không'))).toBe(false)
      expect(api.createErrorType).not.toHaveBeenCalled()
    })
  })
  it('opens create and edit in a side drawer and closes it with Hủy', async () => {
    render(<ErrorTypesPage />)
    fireEvent.click(await screen.findByRole('button', { name: 'Tạo mã lỗi' }))
    const drawer = screen.getByRole('dialog', { name: 'Tạo mã lỗi' })
    expect(drawer).toHaveClass('adm-drawer')
    fireEvent.click(within(drawer).getByRole('button', { name: 'Hủy' }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Sửa SPELLING' }))
    expect(screen.getByRole('dialog', { name: 'Sửa mã lỗi' })).toHaveClass('adm-drawer')
  })
  it('shows a row in a centred modal and moves to the edit drawer from it', async () => {
    render(<ErrorTypesPage />)
    fireEvent.click(await screen.findByRole('button', { name: 'Chi tiết SPELLING' }))
    const modal = screen.getByRole('dialog', { name: 'Sai chính tả' })
    expect(modal).toHaveClass('adm-modal')
    expect(modal).toHaveTextContent('Đọc lại từng từ.')
    expect(modal).toHaveTextContent('Chính tả & số')
    fireEvent.click(within(modal).getByRole('button', { name: 'Sửa' }))
    expect(screen.getByRole('dialog', { name: 'Sửa mã lỗi' })).toHaveClass('adm-drawer')
    expect(screen.queryByRole('dialog', { name: 'Sai chính tả' })).not.toBeInTheDocument()
  })
})
