import { beforeEach, describe, expect, it, vi } from 'vitest'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { render, screen, waitFor, within } from '@/test/render'
import { answerConfirm } from '@/test/confirm'
import { HttpError } from '@/lib/httpClient'
import type { User } from '../types'
import { UsersPage } from './UsersPage'

const { api, history, auth, search, access } = vi.hoisted(() => ({
  api: { listUsers: vi.fn(), createUser: vi.fn(), updateUser: vi.fn(), updateUserRoles: vi.fn(), updateUserStatus: vi.fn(), deleteUser: vi.fn() },
  history: { listLoginHistory: vi.fn() },
  auth: vi.fn(),
  search: { query: '', setQuery: vi.fn() },
  access: { listPlans: vi.fn(), adjustPoints: vi.fn(), grantSubscription: vi.fn() },
}))
vi.mock('../api/userAdminApi', () => api)
vi.mock('../api/loginHistoryApi', () => history)
vi.mock('../api/accessAdminApi', () => ({ accessAdminApi: access }))
vi.mock('@/features/auth/authSession', () => ({ useAuthSession: auth }))
vi.mock('../../adminSearch', () => ({ useAdminSearch: () => search }))

function fixture(id: string, email: string, status: User['status'] = 'ACTIVE'): User {
  return {
    id,
    email,
    fullName: email.split('@')[0]!,
    phoneNumber: null,
    status,
    roles: [{ id: 'role-CUSTOMER', name: 'CUSTOMER' }],
    createdAt: '2026-10-01T10:00:00',
    updatedAt: '2026-10-01T10:00:00',
  }
}

async function openMenu(email: string) {
  const row = (await screen.findByText(email)).closest('tr')!
  await userEvent.click(within(row).getByRole('button', { name: `Hành động của ${email}` }))
  return screen.findByRole('menu', { name: `Hành động của ${email}` })
}

function renderUsers(users: User[]) {
  api.listUsers.mockImplementation(({ page, size }: { page: number; size: number }) => Promise.resolve({ content: users.slice(page * size, (page + 1) * size), page, size, totalElements: users.length, totalPages: Math.ceil(users.length / size) }))
  auth.mockReturnValue({ userId: 'self-id', email: 'admin@example.com' })
  return render(<MemoryRouter><UsersPage /></MemoryRouter>)
}

describe('role labels', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    search.query = ''
  })

  it('names the six roles of the system and offers no mentor role', async () => {
    renderUsers([fixture('user-id', 'user@example.com')])
    await screen.findByText('user@example.com')

    const filter = screen.getByLabelText('Vai trò', { selector: 'select' })
    expect(within(filter).getAllByRole('option').map((option) => option.textContent)).toEqual([
      'Tất cả vai trò', 'Quản trị hệ thống', 'Content Author', 'Examiner', 'Staff Manager', 'Sales Staff', 'Learner',
    ])
    expect(screen.queryByText(/Mentor|Kinh doanh/)).not.toBeInTheDocument()
  })

  it('shows an account with the Sales Staff role under that name', async () => {
    const sales = fixture('sales-id', 'sales@example.com')
    sales.roles = [{ id: 'role-sales', name: 'SALES_STAFF' }]
    renderUsers([sales])

    expect(await screen.findByText('Sales Staff', { selector: '.um-role' })).toBeInTheDocument()
  })
})

describe('user row menu', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    search.query = ''
    api.updateUserStatus.mockResolvedValue(fixture('user-id', 'user@example.com', 'LOCKED'))
    history.listLoginHistory.mockResolvedValue({ items: [], page: 0, size: 20, total: 0 })
  })

  it('lists the actions in order, without a delete', async () => {
    renderUsers([fixture('user-id', 'user@example.com')])

    const menu = await openMenu('user@example.com')

    expect(within(menu).getAllByRole('menuitem').map((item) => item.textContent)).toEqual([
      'Chi tiết', 'Chỉnh sửa', 'Phân quyền', 'Khóa', 'Điều chỉnh điểm', 'Cấp gói Premium', 'Lịch sử đăng nhập',
    ])
    expect(within(menu).queryByRole('menuitem', { name: /Xóa/ })).not.toBeInTheDocument()
  })

  it('adjusts points with a reason and reports the new balance', async () => {
    access.adjustPoints.mockResolvedValue({ id: 'ledger-1', delta: -20, balanceAfter: 80 })
    renderUsers([fixture('user-id', 'user@example.com')])

    await userEvent.click(within(await openMenu('user@example.com')).getByRole('menuitem', { name: 'Điều chỉnh điểm' }))
    const dialog = await screen.findByRole('dialog')
    await userEvent.type(within(dialog).getByLabelText('Số điểm (âm để trừ)'), '-20')
    await userEvent.click(within(dialog).getByRole('button', { name: 'Điều chỉnh điểm' }))
    expect(await within(dialog).findByRole('alert')).toHaveTextContent('Nhập lý do')
    expect(access.adjustPoints).not.toHaveBeenCalled()

    await userEvent.type(within(dialog).getByLabelText('Lý do'), 'Thu hồi điểm tặng nhầm')
    await userEvent.click(within(dialog).getByRole('button', { name: 'Điều chỉnh điểm' }))

    expect(await screen.findByText('Đã trừ 20 điểm. Số dư mới: 80.')).toHaveAttribute('role', 'status')
    expect(access.adjustPoints).toHaveBeenCalledWith(expect.objectContaining({ userId: 'user-id', delta: -20, reason: 'Thu hồi điểm tặng nhầm' }))
    expect(access.adjustPoints.mock.calls[0]![0].idempotencyKey).toMatch(/^[0-9a-f-]{36}$/)
  })

  it('grants an active plan for the chosen number of days', async () => {
    access.listPlans.mockResolvedValue([
      { id: 'plan-old', code: 'OLD', name: 'Gói cũ', status: 'INACTIVE' },
      { id: 'plan-premium', code: 'PREMIUM', name: 'Premium', status: 'ACTIVE' },
    ])
    access.grantSubscription.mockResolvedValue({ id: 'sub-1', planName: 'Premium', endsAt: '2026-12-27T00:00:00Z' })
    renderUsers([fixture('user-id', 'user@example.com')])

    await userEvent.click(within(await openMenu('user@example.com')).getByRole('menuitem', { name: 'Cấp gói Premium' }))
    const dialog = await screen.findByRole('dialog')
    const plan = await within(dialog).findByLabelText('Gói')
    expect(within(plan).getAllByRole('option').map((option) => option.textContent)).toEqual(['Premium'])
    await userEvent.click(within(dialog).getByRole('button', { name: 'Cấp gói' }))

    await waitFor(() => expect(access.grantSubscription).toHaveBeenCalledWith(
      { userId: 'user-id', planId: 'plan-premium', durationDays: 30, humanGradingCredits: 0 },
      expect.stringMatching(/^[0-9a-f-]{36}$/),
    ))
    expect(await screen.findByText(/^Đã cấp Premium/)).toHaveAttribute('role', 'status')
  })
  it('opens the roles of an account in their own small modal', async () => {
    renderUsers([fixture('user-id', 'user@example.com')])

    await userEvent.click(within(await openMenu('user@example.com')).getByRole('menuitem', { name: 'Phân quyền' }))

    const modal = await screen.findByRole('dialog', { name: 'Phân quyền' })
    expect(modal).toHaveClass('adm-modal')
    expect(within(modal).getByRole('group', { name: 'Vai trò' })).toBeInTheDocument()
    expect(within(modal).queryByLabelText('Họ tên')).not.toBeInTheDocument()
  })

  it('saves the roles and closes the modal', async () => {
    const account = fixture('user-id', 'user@example.com')
    api.updateUserRoles.mockResolvedValue(account)
    renderUsers([account])

    await userEvent.click(within(await openMenu('user@example.com')).getByRole('menuitem', { name: 'Phân quyền' }))
    const modal = await screen.findByRole('dialog', { name: 'Phân quyền' })
    await userEvent.click(within(modal).getByLabelText('Sales Staff'))
    await userEvent.click(within(modal).getByRole('button', { name: 'Lưu vai trò' }))

    await waitFor(() => expect(api.updateUserRoles).toHaveBeenCalledWith('user-id', ['CUSTOMER', 'SALES_STAFF']))
    await waitFor(() => expect(screen.queryByRole('dialog', { name: 'Phân quyền' })).not.toBeInTheDocument())
  })

  it('locks after confirmation and unlocks without asking', async () => {
    renderUsers([fixture('user-id', 'user@example.com'), fixture('locked-id', 'locked@example.com', 'LOCKED')])

    await userEvent.click(within(await openMenu('user@example.com')).getByRole('menuitem', { name: 'Khóa' }))
    const popup = await answerConfirm(true)
    expect(popup).toHaveTextContent('Khóa tài khoản?')
    await waitFor(() => expect(api.updateUserStatus).toHaveBeenCalledWith('user-id', 'LOCKED'))
    await waitFor(() => expect(api.listUsers).toHaveBeenCalledTimes(2))

    await userEvent.click(within(await openMenu('locked@example.com')).getByRole('menuitem', { name: 'Mở khóa' }))
    await waitFor(() => expect(api.updateUserStatus).toHaveBeenCalledWith('locked-id', 'ACTIVE'))
  })

  it('does not lock when the question is declined', async () => {
    renderUsers([fixture('user-id', 'user@example.com')])

    await userEvent.click(within(await openMenu('user@example.com')).getByRole('menuitem', { name: 'Khóa' }))
    await answerConfirm(false)

    expect(api.updateUserStatus).not.toHaveBeenCalled()
  })

  it('does not reload the list when the server refuses the lock', async () => {
    api.updateUserStatus.mockRejectedValue(new HttpError(409, 'Xung đột'))
    renderUsers([fixture('locked-id', 'locked@example.com', 'LOCKED')])

    await userEvent.click(within(await openMenu('locked@example.com')).getByRole('menuitem', { name: 'Mở khóa' }))

    await waitFor(() => expect(api.updateUserStatus).toHaveBeenCalled())
    expect(api.listUsers).toHaveBeenCalledTimes(1)
  })

  it('offers no lock for the signed-in admin or for an inactive account', async () => {
    renderUsers([fixture('self-id', 'admin@example.com'), fixture('off-id', 'off@example.com', 'INACTIVE')])

    expect(within(await openMenu('admin@example.com')).getByRole('menuitem', { name: 'Khóa' })).toBeDisabled()
    await userEvent.keyboard('{Escape}')
    expect(within(await openMenu('off@example.com')).getByRole('menuitem', { name: 'Khóa' })).toBeDisabled()
  })

  it('opens the login history of the chosen account', async () => {
    renderUsers([fixture('user-id', 'user@example.com')])

    await userEvent.click(within(await openMenu('user@example.com')).getByRole('menuitem', { name: 'Lịch sử đăng nhập' }))

    expect(await screen.findByRole('dialog', { name: 'Lịch sử đăng nhập' })).toBeInTheDocument()
    await waitFor(() => expect(history.listLoginHistory).toHaveBeenCalledWith('user-id', 0, 20, expect.any(AbortSignal)))
  })
})
