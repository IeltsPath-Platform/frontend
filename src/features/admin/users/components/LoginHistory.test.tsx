import { beforeEach, describe, expect, it, vi } from 'vitest'
import userEvent from '@testing-library/user-event'
import { render, screen, within } from '@/test/render'
import { HttpError } from '@/lib/httpClient'
import { deviceLabel, loginResultLabel } from '../lib/loginHistoryLabels'
import type { LoginHistoryPage } from '../loginHistoryTypes'
import type { User } from '../types'
import { LoginHistoryModal } from './LoginHistoryModal'

const { history } = vi.hoisted(() => ({ history: { listLoginHistory: vi.fn() } }))
vi.mock('../api/loginHistoryApi', () => history)

const USER: User = {
  id: 'user-id',
  email: 'user@example.com',
  fullName: 'Người Dùng',
  phoneNumber: null,
  status: 'ACTIVE',
  roles: [{ id: 'role-1', name: 'CUSTOMER' }],
  createdAt: '2026-10-01T10:00:00',
  updatedAt: '2026-10-01T10:00:00',
}

function page(items: LoginHistoryPage['items'], total = items.length, pageIndex = 0): LoginHistoryPage {
  return { items, page: pageIndex, size: 20, total }
}

const CHROME_WINDOWS = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36'

describe('LoginHistoryModal', () => {
  beforeEach(() => vi.clearAllMocks())

  it('lists attempts newest first with result, address and device', async () => {
    history.listLoginHistory.mockResolvedValue(page([
      { id: 'a1', success: true, failureReason: null, ipAddress: '203.0.113.9', userAgent: CHROME_WINDOWS, createdAt: '2026-10-28T09:30:00' },
      { id: 'a2', success: false, failureReason: 'BAD_PASSWORD', ipAddress: null, userAgent: null, createdAt: '2026-10-27T08:00:00' },
    ]))

    render(<LoginHistoryModal onClose={vi.fn()} user={USER} />)

    const table = await screen.findByRole('table', { name: 'Lịch sử đăng nhập' })
    const rows = within(table).getAllByRole('row').slice(1)
    expect(rows).toHaveLength(2)
    expect(within(rows[0]!).getByText('Thành công')).toBeInTheDocument()
    expect(screen.getByRole('columnheader', { name: 'Địa chỉ IP' })).toBeInTheDocument()
    expect(within(rows[0]!).getByText('203.0.113.9')).toBeInTheDocument()
    expect(within(rows[0]!).getByText('Chrome · Windows')).toBeInTheDocument()
    expect(within(rows[1]!).getByText('Sai mật khẩu')).toBeInTheDocument()
    expect(history.listLoginHistory).toHaveBeenCalledWith('user-id', 0, 20, expect.any(AbortSignal))
  })

  it('keeps the header and says so when there is no attempt yet', async () => {
    history.listLoginHistory.mockResolvedValue(page([]))

    render(<LoginHistoryModal onClose={vi.fn()} user={USER} />)

    expect(await screen.findByText('Chưa có lượt đăng nhập nào.')).toBeInTheDocument()
    expect(screen.getByRole('columnheader', { name: 'Thời gian' })).toBeInTheDocument()
    expect(screen.queryByRole('navigation', { name: 'Phân trang lịch sử đăng nhập' })).not.toBeInTheDocument()
  })

  it('moves between pages and numbers rows across them', async () => {
    const attempt = (id: string) => ({ id, success: true, failureReason: null, ipAddress: '10.0.0.1', userAgent: null, createdAt: '2026-10-28T09:30:00' })
    history.listLoginHistory.mockImplementation((_id: string, pageIndex: number) =>
      Promise.resolve(page([attempt(`p${pageIndex}`)], 21, pageIndex)))

    render(<LoginHistoryModal onClose={vi.fn()} user={USER} />)
    await screen.findByText('Trang 1 / 2 · 21 lượt')
    await userEvent.click(screen.getByRole('button', { name: 'Trang sau' }))

    expect(await screen.findByText('Trang 2 / 2 · 21 lượt')).toBeInTheDocument()
    expect(history.listLoginHistory).toHaveBeenLastCalledWith('user-id', 1, 20, expect.any(AbortSignal))
    expect(within(await screen.findByRole('table')).getByText('21')).toBeInTheDocument()
  })

  it('offers a retry when loading fails', async () => {
    history.listLoginHistory.mockRejectedValueOnce(new HttpError(500, 'Lỗi hệ thống')).mockResolvedValue(page([]))

    render(<LoginHistoryModal onClose={vi.fn()} user={USER} />)
    await userEvent.click(await screen.findByRole('button', { name: 'Thử lại' }))

    expect(await screen.findByText('Chưa có lượt đăng nhập nào.')).toBeInTheDocument()
  })
})

describe('login history labels', () => {
  it('names each result', () => {
    expect(loginResultLabel({ success: true })).toBe('Thành công')
    expect(loginResultLabel({ success: false, failureReason: 'ACCOUNT_LOCKED' })).toBe('Tài khoản bị khóa')
    expect(loginResultLabel({ success: false, failureReason: 'FUTURE_REASON' })).toBe('Thất bại')
  })

  it('shortens user agents to browser and system', () => {
    expect(deviceLabel(CHROME_WINDOWS)).toBe('Chrome · Windows')
    expect(deviceLabel('Mozilla/5.0 (Windows NT 10.0) AppleWebKit/537.36 Chrome/130.0 Safari/537.36 Edg/130.0')).toBe('Edge · Windows')
    expect(deviceLabel('Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605 Version/17 Safari/604')).toBe('Safari · iOS')
    expect(deviceLabel(null)).toBe('—')
    expect(deviceLabel('curl/8.0')).toBe('Không rõ')
  })
})
