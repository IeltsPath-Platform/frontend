import { beforeEach, describe, expect, it, vi } from 'vitest'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { render, screen, waitFor, within } from '@/test/render'
import { answerConfirm } from '@/test/confirm'
import { HttpError } from '@/lib/httpClient'
import type { User } from '../types'
import { UsersPage } from './UsersPage'

const { api, history, auth, search } = vi.hoisted(() => ({
  api: { listUsers: vi.fn(), createUser: vi.fn(), updateUser: vi.fn(), updateUserRoles: vi.fn(), updateUserStatus: vi.fn(), deleteUser: vi.fn() },
  history: { listLoginHistory: vi.fn() },
  auth: vi.fn(),
  search: { query: '', setQuery: vi.fn() },
}))
vi.mock('../api/userAdminApi', () => api)
vi.mock('../api/loginHistoryApi', () => history)
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
  api.listUsers.mockResolvedValue(users)
  auth.mockReturnValue({ userId: 'self-id', email: 'admin@example.com' })
  return render(<MemoryRouter><UsersPage /></MemoryRouter>)
}

describe('role labels', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    search.query = ''
  })

  it('names the roles R&D, Examiner, Staff Manager, Staff and Learner and offers no sales or mentor role', async () => {
    renderUsers([fixture('user-id', 'user@example.com')])
    await screen.findByText('user@example.com')

    const filter = screen.getByLabelText('Vai trò', { selector: 'select' })
    expect(within(filter).getAllByRole('option').map((option) => option.textContent)).toEqual([
      'Tất cả vai trò', 'Quản trị hệ thống', 'R&D', 'Examiner', 'Staff Manager', 'Staff', 'Learner',
    ])
    expect(screen.queryByText(/Mentor|Kinh doanh/)).not.toBeInTheDocument()
  })

  it('keeps showing the name of a role an account still holds although it is not offered', async () => {
    const legacy = fixture('legacy-id', 'legacy@example.com')
    legacy.roles = [{ id: 'role-sales', name: 'SALES_STAFF' }]
    renderUsers([legacy])

    expect(await screen.findByText('Kinh doanh')).toBeInTheDocument()
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
      'Chi tiết', 'Chỉnh sửa', 'Phân quyền', 'Khóa', 'Đặt lại mật khẩu', 'Thay đổi mật khẩu', 'Lịch sử đăng nhập',
    ])
    expect(within(menu).queryByRole('menuitem', { name: /Xóa/ })).not.toBeInTheDocument()
  })

  it('shows the password actions as usable items that change nothing yet', async () => {
    renderUsers([fixture('user-id', 'user@example.com')])

    for (const action of ['Đặt lại mật khẩu', 'Thay đổi mật khẩu']) {
      const menu = await openMenu('user@example.com')
      const item = within(menu).getByRole('menuitem', { name: action })
      expect(item).toBeEnabled()
      await userEvent.click(item)
      expect(screen.queryByRole('menu')).not.toBeInTheDocument()
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    }
    expect(api.updateUserStatus).not.toHaveBeenCalled()
    expect(api.updateUserRoles).not.toHaveBeenCalled()
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
    await userEvent.click(within(modal).getByLabelText('Staff'))
    await userEvent.click(within(modal).getByRole('button', { name: 'Lưu vai trò' }))

    await waitFor(() => expect(api.updateUserRoles).toHaveBeenCalledWith('user-id', ['CUSTOMER', 'STAFF']))
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
