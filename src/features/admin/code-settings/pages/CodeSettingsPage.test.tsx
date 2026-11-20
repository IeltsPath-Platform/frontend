import { fireEvent, render, screen, waitFor, within } from '@/test/render'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { CodeSettingsPage } from './CodeSettingsPage'

const { api } = vi.hoisted(() => ({ api: { fetchCodeSettings: vi.fn(), updateCodeSettings: vi.fn() } }))
vi.mock('../api/codeSettingsApi', () => api)

const courseSetting = { kind: 'COURSE', applied: true, pattern: 'COURSE_{SEQ:3}', startNumber: 1, editable: true }

describe('CodeSettingsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    api.fetchCodeSettings.mockResolvedValue([courseSetting])
    api.updateCodeSettings.mockResolvedValue(courseSetting)
  })

  it('shows the four settings rows only for code kinds returned by the server', async () => {
    render(<CodeSettingsPage />)
    const section = await screen.findByText('1. Thiết lập bộ mã Khóa học tự sinh')
    expect(section).toBeInTheDocument()
    const editor = section.closest('details')!
    expect(within(editor).getAllByRole('switch')).toHaveLength(2)
    expect(within(editor).getByLabelText('Cấu trúc bộ mã')).toBeInTheDocument()
    expect(within(editor).getByLabelText('Số bắt đầu khởi tạo')).toHaveValue('1')
    expect(screen.queryByText(/Thiết lập bộ mã Chủ đề/)).not.toBeInTheDocument()
  })

  it('shows pattern validation under the field without saving or toasting', async () => {
    render(<CodeSettingsPage />)
    const editor = (await screen.findByText('1. Thiết lập bộ mã Khóa học tự sinh')).closest('details')!
    fireEvent.change(within(editor).getByLabelText('Cấu trúc bộ mã'), { target: { value: 'COURSE_{UNKNOWN}' } })
    fireEvent.submit(within(editor).getByRole('form', { name: 'Thiết lập bộ mã Khóa học' }))
    expect(await within(editor).findByText('Chỉ dùng {SEQ}, {SEQ:n}, {BAND} và {YYYY} cho mã khóa học.')).toBeInTheDocument()
    expect(api.updateCodeSettings).not.toHaveBeenCalled()
    expect(screen.queryByText('Đã lưu thiết lập bộ mã.')).not.toBeInTheDocument()
  })

  it('shows start number validation under its field', async () => {
    render(<CodeSettingsPage />)
    const editor = (await screen.findByText('1. Thiết lập bộ mã Khóa học tự sinh')).closest('details')!
    fireEvent.change(within(editor).getByLabelText('Số bắt đầu khởi tạo'), { target: { value: '-1' } })
    fireEvent.submit(within(editor).getByRole('form', { name: 'Thiết lập bộ mã Khóa học' }))
    expect(await within(editor).findByText('Số bắt đầu khởi tạo phải là số nguyên không âm.')).toBeInTheDocument()
    expect(api.updateCodeSettings).not.toHaveBeenCalled()
  })

  it('saves a valid block and reports the result with a toast', async () => {
    render(<CodeSettingsPage />)
    const editor = (await screen.findByText('1. Thiết lập bộ mã Khóa học tự sinh')).closest('details')!
    fireEvent.change(within(editor).getByLabelText('Số bắt đầu khởi tạo'), { target: { value: '10' } })
    fireEvent.submit(within(editor).getByRole('form', { name: 'Thiết lập bộ mã Khóa học' }))
    await waitFor(() => expect(api.updateCodeSettings).toHaveBeenCalledWith('COURSE', expect.objectContaining({ startNumber: 10 })))
    expect(await screen.findByText('Đã lưu thiết lập bộ mã.')).toBeInTheDocument()
  })

  it('opens the keyword list from the help icon', async () => {
    render(<CodeSettingsPage />)
    const editor = (await screen.findByText('1. Thiết lập bộ mã Khóa học tự sinh')).closest('details')!
    fireEvent.click(within(editor).getByRole('button', { name: 'Từ khóa dùng được' }))
    expect(screen.getByRole('dialog', { name: 'Từ khóa dùng được' })).toHaveTextContent('{BAND}')
  })
})
