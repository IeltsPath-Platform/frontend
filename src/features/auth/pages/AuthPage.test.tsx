import { fireEvent, render, screen } from '@testing-library/react'
import type { ReactNode } from 'react'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { AuthPage } from './AuthPage'

const { loginWithPasswordMock, registerWithPasswordMock } = vi.hoisted(() => ({
  loginWithPasswordMock: vi.fn(),
  registerWithPasswordMock: vi.fn(),
}))

vi.mock('../authSession', () => ({
  loginWithPassword: loginWithPasswordMock,
  registerWithPassword: registerWithPasswordMock,
}))

vi.mock('../components/AuthForm', () => ({
  AuthForm: ({ onSubmit }: { onSubmit: (payload: { email: string; password: string }) => void }) => (
    <button type="button" onClick={() => onSubmit({ email: 'learner@example.test', password: 'password' })}>
      Đăng nhập kiểm thử
    </button>
  ),
}))

vi.mock('../components/AuthShell', () => ({
  AuthShell: ({ children }: { children: ReactNode }) => <>{children}</>,
}))

vi.mock('@/components/toast/toastContext', () => ({
  useToast: () => ({ toast: vi.fn(), dismiss: vi.fn(), toasts: [] }),
}))

function LocationProbe() {
  const location = useLocation()
  return <output data-testid="community-state">{JSON.stringify(location.state)}</output>
}

describe('AuthPage community redirect', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    loginWithPasswordMock.mockResolvedValue({ roles: [{ name: 'CUSTOMER' }] })
  })

  it('marks a successful login redirect to the requested Community route', async () => {
    render(
      <MemoryRouter initialEntries={[{ pathname: '/login', state: { from: { pathname: '/community' } } }]}>
        <Routes>
          <Route path="/login" element={<AuthPage mode="sign-in" />} />
          <Route path="/community" element={<LocationProbe />} />
        </Routes>
      </MemoryRouter>,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Đăng nhập kiểm thử' }))
    expect(await screen.findByTestId('community-state')).toHaveTextContent('communityLoginTransition')
  })

  it.each([
    ['ADMIN', '/admin'],
    ['CONTENT_AUTHOR', '/content-author'],
  ])('sends %s to its workspace even when login started in Community', async (role, destination) => {
    loginWithPasswordMock.mockResolvedValue({ roles: [{ name: role }] })
    render(
      <MemoryRouter initialEntries={[{ pathname: '/login', state: { from: { pathname: '/community' } } }]}>
        <Routes>
          <Route path="/login" element={<AuthPage mode="sign-in" />} />
          <Route path={destination} element={<h1>Không gian làm việc</h1>} />
        </Routes>
      </MemoryRouter>,
    )
    fireEvent.click(screen.getByRole('button', { name: 'Đăng nhập kiểm thử' }))
    expect(await screen.findByRole('heading', { name: 'Không gian làm việc' })).toBeInTheDocument()
  })
})
