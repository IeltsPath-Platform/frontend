import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { GuestOnly, RequireRole } from './AuthGuards'

const { auth } = vi.hoisted(() => ({ auth: vi.fn() }))
vi.mock('./authSession', () => ({ useAuthSession: auth }))

function renderGuard(roles: string[]) {
  return render(
    <MemoryRouter>
      <RequireRole fallback={<p>Không có quyền</p>} roles={roles}>
        <p>Nội dung quản trị</p>
      </RequireRole>
    </MemoryRouter>,
  )
}

describe('RequireRole', () => {
  beforeEach(() => vi.clearAllMocks())

  it('shows the children when the user holds one of the roles', () => {
    auth.mockReturnValue({ isLoggedIn: true, roles: ['CUSTOMER', 'CONTENT_AUTHOR'] })
    renderGuard(['ADMIN', 'CONTENT_AUTHOR'])
    expect(screen.getByText('Nội dung quản trị')).toBeInTheDocument()
  })

  it('explains the missing role instead of redirecting', () => {
    auth.mockReturnValue({ isLoggedIn: true, roles: ['CUSTOMER'] })
    renderGuard(['ADMIN', 'CONTENT_AUTHOR'])
    expect(screen.getByText('Không có quyền')).toBeInTheDocument()
    expect(screen.queryByText('Nội dung quản trị')).not.toBeInTheDocument()
  })

  it('treats a missing role list as no role', () => {
    auth.mockReturnValue({ isLoggedIn: true })
    renderGuard(['ADMIN'])
    expect(screen.getByText('Không có quyền')).toBeInTheDocument()
  })
})

describe('GuestOnly', () => {
  it.each([
    ['ADMIN', '/admin'],
    ['CONTENT_AUTHOR', '/content-author'],
    ['CUSTOMER', '/community'],
  ])('sends a restored %s session to the appropriate destination', (role, destination) => {
    auth.mockReturnValue({ isLoggedIn: true, roles: [role] })
    render(
      <MemoryRouter initialEntries={[{ pathname: '/login', state: { from: { pathname: '/community' } } }]}>
        <Routes>
          <Route path="/login" element={<GuestOnly><p>Đăng nhập</p></GuestOnly>} />
          <Route path={destination} element={<p>Đích đến: {destination}</p>} />
        </Routes>
      </MemoryRouter>,
    )
    expect(screen.getByText(`Đích đến: ${destination}`)).toBeInTheDocument()
  })
})
