import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor, within } from '@/test/render'
import { answerConfirm } from '@/test/confirm'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { UsersPage } from './UsersPage'
import { HttpError } from '@/lib/httpClient'
import type { User } from '../types'

const { api, auth, search } = vi.hoisted(() => ({
  api: { listUsers: vi.fn(), createUser: vi.fn(), updateUser: vi.fn(), updateUserRoles: vi.fn(), updateUserStatus: vi.fn(), deleteUser: vi.fn() },
  auth: vi.fn(),
  search: { query: '', setQuery: vi.fn() },
}))
vi.mock('../api/userAdminApi', () => api)
vi.mock('@/features/auth/authSession', () => ({ useAuthSession: auth }))
vi.mock('../../adminSearch', () => ({ useAdminSearch: () => search }))

function fixture(id: string, email: string, role = 'CUSTOMER', status = 'ACTIVE'): User {
  return {
    id,
    email,
    fullName: email.split('@')[0],
    phoneNumber: null,
    status: status as User['status'],
    roles: [{ id: `role-${role}`, name: role as User['roles'][number]['name'] }],
    createdAt: '2026-10-01T10:00:00',
    updatedAt: '2026-10-01T10:00:00',
  }
}

function renderUsers(users: User[] = [fixture('self-id', 'admin@example.com', 'ADMIN'), fixture('user-id', 'user@example.com')]) {
  api.listUsers.mockResolvedValue(users)
  auth.mockReturnValue({ userId: 'self-id', email: 'admin@example.com' })
  return render(<MemoryRouter><UsersPage /></MemoryRouter>)
}

describe('UsersPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    search.query = ''
    api.createUser.mockResolvedValue(fixture('new-user', 'new@example.com', 'CONTENT_AUTHOR'))
    api.updateUser.mockResolvedValue(fixture('user-id', 'user@example.com'))
    api.updateUserRoles.mockResolvedValue(fixture('user-id', 'user@example.com'))
    api.updateUserStatus.mockResolvedValue(fixture('user-id', 'user@example.com'))
    api.deleteUser.mockResolvedValue(fixture('user-id', 'user@example.com', 'CUSTOMER', 'INACTIVE'))
  })

  it('lists users and filters by search text, role, and status', async () => {
    search.query = 'user0@example.com'
    const users = Array.from({ length: 26 }, (_, index) => fixture(`user-${index}`, `user${index}@example.com`, index === 0 ? 'CONTENT_AUTHOR' : 'CUSTOMER', index === 0 ? 'LOCKED' : 'ACTIVE'))
    renderUsers(users)
    expect(await screen.findByText('user0@example.com')).toBeInTheDocument()
    await userEvent.selectOptions(screen.getByLabelText('Vai trò'), 'CONTENT_AUTHOR')
    await userEvent.selectOptions(screen.getByLabelText('Trạng thái'), 'LOCKED')
    expect(screen.getByText('user0@example.com')).toBeInTheDocument()
    expect(screen.queryByText('user1@example.com')).not.toBeInTheDocument()
  })

  it('paginates the unpaginated API response by 25 rows', async () => {
    renderUsers(Array.from({ length: 26 }, (_, index) => fixture(`user-${index}`, `user${index}@example.com`)))
    expect(await screen.findByText('user24@example.com')).toBeInTheDocument()
    expect(screen.queryByText('user25@example.com')).not.toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Trang sau' }))
    expect(screen.getByText('user25@example.com')).toBeInTheDocument()
    expect(screen.getByText('Trang 2 / 2 · 26 người dùng')).toBeInTheDocument()
  })

  it('creates a user with the exact request body and blocks conflicting role choices', async () => {
    const user = userEvent.setup()
    renderUsers([])
    await screen.findByRole('heading', { name: 'Người dùng' })
    await user.click(screen.getByRole('button', { name: 'Tài khoản mới' }))
    await user.type(screen.getByLabelText('Email'), 'author@example.com')
    await user.type(screen.getByLabelText('Họ tên'), 'Nội dung viên')
    await user.type(screen.getByLabelText(/Mật khẩu tạm thời/), 'secret1')
    const roles = screen.getByRole('group', { name: 'Vai trò' })
    await user.click(within(roles).getByLabelText('Quản trị hệ thống'))
    expect(within(roles).getByLabelText('R&D (nội dung)')).toBeDisabled()
    await user.click(screen.getByRole('button', { name: 'Tạo tài khoản' }))
    await waitFor(() => expect(api.createUser).toHaveBeenCalledWith({ email: 'author@example.com', fullName: 'Nội dung viên', password: 'secret1', roles: ['CUSTOMER', 'ADMIN'] }))
    expect(api.listUsers).toHaveBeenCalledTimes(2)
  })

  it.each([
    ['ROLE_CONFLICT', 'Tài khoản quản trị hệ thống không được kiêm vai trò R&D hoặc Mentor.'],
    ['SELF_ADMIN_REMOVAL', 'Bạn không thể tự gỡ quyền quản trị của chính mình.'],
    ['SELF_ACCOUNT_CHANGE', 'Bạn không thể tự khóa hoặc xóa tài khoản đang dùng.'],
    ['LAST_ADMIN', 'Đây là tài khoản quản trị cuối cùng đang hoạt động, không thể gỡ, khóa hay xóa.'],
  ])('shows the %s rule returned by the server', async (code, message) => {
    api.createUser.mockRejectedValue(new HttpError(409, 'Conflict', { details: { code } }, code))
    renderUsers([])
    await userEvent.click(await screen.findByRole('button', { name: 'Tài khoản mới' }))
    await userEvent.type(screen.getByLabelText('Email'), 'author@example.com')
    await userEvent.type(screen.getByLabelText('Họ tên'), 'Nội dung viên')
    await userEvent.type(screen.getByLabelText(/Mật khẩu tạm thời/), 'secret1')
    await userEvent.click(screen.getByRole('button', { name: 'Tạo tài khoản' }))
    expect(await screen.findByRole('alert')).toHaveTextContent(message)
  })

  it('maps the existing duplicate email response', async () => {
    api.createUser.mockRejectedValue(new HttpError(409, 'Email already exists'))
    renderUsers([])
    await userEvent.click(await screen.findByRole('button', { name: 'Tài khoản mới' }))
    await userEvent.type(screen.getByLabelText('Email'), 'used@example.com')
    await userEvent.type(screen.getByLabelText('Họ tên'), 'Người dùng cũ')
    await userEvent.type(screen.getByLabelText(/Mật khẩu tạm thời/), 'secret1')
    await userEvent.click(screen.getByRole('button', { name: 'Tạo tài khoản' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('Email đã được dùng.')
  })

  it('disables self-lock and self-delete, and protects the self ADMIN role', async () => {
    renderUsers()
    await screen.findByText('admin@example.com')
    const row = screen.getByText('admin@example.com').closest('tr')
    if (!row) throw new Error('Current user row is missing')
    await userEvent.click(within(row).getByRole('button', { name: 'Sửa' }))
    const editor = screen.getByRole('region', { name: 'Quản lý admin@example.com' })
    expect(within(editor).getByLabelText('Quản trị hệ thống')).toBeDisabled()
    expect(within(editor).getByRole('option', { name: 'Bị khóa' })).toBeDisabled()
    expect(within(editor).queryByRole('button', { name: 'Xóa tài khoản' })).not.toBeInTheDocument()
    expect(within(editor).getByRole('button', { name: 'Lưu trạng thái' })).toBeDisabled()
  })

  it('asks for confirmation before deleting another account', async () => {
    renderUsers()
    await screen.findByText('user@example.com')
    const row = screen.getByText('user@example.com').closest('tr')
    if (!row) throw new Error('User row is missing')
    await userEvent.click(within(row).getByRole('button', { name: 'Sửa' }))
    await userEvent.click(await screen.findByRole('button', { name: 'Xóa tài khoản' }))
    const popup = await answerConfirm(false)
    expect(popup).toHaveTextContent('Xóa user@example.com? Thao tác này không thể hoàn tác.')
    expect(api.deleteUser).not.toHaveBeenCalled()
    await userEvent.click(screen.getByRole('button', { name: 'Xóa tài khoản' }))
    await answerConfirm(true)
    await waitFor(() => expect(api.deleteUser).toHaveBeenCalledWith('user-id'))
  })

  it('asks before locking an account and locks it only when confirmed', async () => {
    renderUsers()
    const row = (await screen.findByText('user@example.com')).closest('tr')!
    await userEvent.click(within(row).getByRole('button', { name: 'Sửa' }))
    const editor = await screen.findByRole('region', { name: 'Quản lý user@example.com' })
    await userEvent.selectOptions(within(editor).getByLabelText('Trạng thái'), 'LOCKED')
    await userEvent.click(within(editor).getByRole('button', { name: 'Lưu trạng thái' }))
    const popup = await answerConfirm(false)
    expect(popup).toHaveTextContent('Khóa tài khoản?')
    expect(api.updateUserStatus).not.toHaveBeenCalled()
    await userEvent.click(within(editor).getByRole('button', { name: 'Lưu trạng thái' }))
    await answerConfirm(true)
    await waitFor(() => expect(api.updateUserStatus).toHaveBeenCalledWith('user-id', 'LOCKED'))
  })

  it('opens create and edit in a right drawer', async () => {
    renderUsers()
    await userEvent.click(await screen.findByRole('button', { name: 'Tài khoản mới' }))
    const create = screen.getByRole('dialog', { name: 'Tài khoản nhân sự mới' })
    expect(create).toHaveClass('adm-drawer')
    await userEvent.click(within(create).getByRole('button', { name: 'Hủy' }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    const row = screen.getByText('user@example.com').closest('tr')!
    await userEvent.click(within(row).getByRole('button', { name: 'Sửa' }))
    expect(screen.getByRole('dialog', { name: 'user' })).toHaveClass('adm-drawer')
    await userEvent.click(screen.getByRole('button', { name: 'Đóng' }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('shows a user in a centred modal and moves to the edit drawer from it', async () => {
    renderUsers()
    const row = (await screen.findByText('user@example.com')).closest('tr')!
    await userEvent.click(within(row).getByRole('button', { name: 'Chi tiết' }))
    const modal = screen.getByRole('dialog', { name: 'user' })
    expect(modal).toHaveClass('adm-modal')
    expect(modal).toHaveTextContent('user@example.com')
    expect(modal).toHaveTextContent('Học viên')
    await userEvent.click(within(modal).getByRole('button', { name: 'Sửa' }))
    expect(screen.getByRole('dialog', { name: 'user' })).toHaveClass('adm-drawer')
    expect(screen.getByRole('region', { name: 'Quản lý user@example.com' })).toBeInTheDocument()
  })
})
