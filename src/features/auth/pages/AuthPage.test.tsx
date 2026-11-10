import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { AuthPage } from './AuthPage'

const { loginWithPasswordMock, loginWithGoogleMock, registerWithPasswordMock, toastMock } = vi.hoisted(() => ({
  loginWithPasswordMock: vi.fn(),
  loginWithGoogleMock: vi.fn(),
  registerWithPasswordMock: vi.fn(),
  toastMock: vi.fn(),
}))

vi.mock('../authSession', () => ({
  loginWithPassword: loginWithPasswordMock,
  loginWithGoogle: loginWithGoogleMock,
  registerWithPassword: registerWithPasswordMock,
}))

vi.mock('../components/AuthForm', () => ({
  AuthForm: ({ onSubmit, onGoogleCredential }: {
    onSubmit: (payload: { email: string; password: string }) => void
    onGoogleCredential: (credential: string) => void
  }) => <>
    <button type="button" onClick={() => onSubmit({ email: 'learner@example.test', password: 'password' })}>Đăng nhập kiểm thử</button>
    <button type="button" onClick={() => onGoogleCredential('opaque-token')}>Google kiểm thử</button>
  </>,
}))

vi.mock('../components/AuthShell', () => ({
  AuthShell: ({ children }: { children: ReactNode }) => <>{children}</>,
}))

vi.mock('@/components/toast/toastContext', () => ({
  useToast: () => ({ toast: toastMock, dismiss: vi.fn(), toasts: [] }),
}))

function LocationProbe() {
  const location = useLocation()
  return <output data-testid="community-state">{JSON.stringify(location.state)}</output>
}

describe('AuthPage community redirect', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    loginWithPasswordMock.mockResolvedValue({ roles: [{ name: 'CUSTOMER' }] })
    loginWithGoogleMock.mockResolvedValue({ roles: [{ name: 'CUSTOMER' }] })
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
    ['EXAMINER', '/examiner'],
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

  it('logs in with Google and sends staff to their role destination', async () => {
    loginWithGoogleMock.mockResolvedValue({ roles: [{ name: 'EXAMINER' }] })
    render(
      <MemoryRouter initialEntries={['/login']}>
        <Routes>
          <Route path="/login" element={<AuthPage mode="sign-in" />} />
          <Route path="/examiner" element={<h1>Examiner</h1>} />
        </Routes>
      </MemoryRouter>,
    )
    fireEvent.click(screen.getByRole('button', { name: 'Google kiểm thử' }))
    expect(loginWithGoogleMock).toHaveBeenCalledWith('opaque-token')
    expect(await screen.findByRole('heading', { name: 'Examiner' })).toBeInTheDocument()
  })

  it('ignores duplicate Google callbacks while a sign-in request is in flight', async () => {
    let resolveLogin: ((value: { roles: { name: string }[] }) => void) | undefined
    loginWithGoogleMock.mockImplementation(() => new Promise((resolve) => { resolveLogin = resolve }))
    render(
      <MemoryRouter initialEntries={['/login']}>
        <Routes><Route path="/login" element={<AuthPage mode="sign-in" />} /></Routes>
      </MemoryRouter>,
    )
    const button = screen.getByRole('button', { name: 'Google kiểm thử' })
    fireEvent.click(button)
    fireEvent.click(button)
    expect(loginWithGoogleMock).toHaveBeenCalledOnce()
    resolveLogin?.({ roles: [{ name: 'CUSTOMER' }] })
    await waitFor(() => expect(loginWithGoogleMock).toHaveBeenCalledOnce())
  })

  it('shows the backend error message for Google sign-in failures', async () => {
    const { HttpError } = await import('@/lib/httpClient')
    loginWithGoogleMock.mockRejectedValue(new HttpError(503, 'Google sign-in unavailable'))
    render(
      <MemoryRouter initialEntries={['/login']}>
        <Routes><Route path="/login" element={<AuthPage mode="sign-in" />} /></Routes>
      </MemoryRouter>,
    )
    fireEvent.click(screen.getByRole('button', { name: 'Google kiểm thử' }))
    await waitFor(() => expect(toastMock).toHaveBeenCalledWith(expect.objectContaining({ title: 'Google sign-in unavailable' })))
  })
})
