import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { SiteNavbar } from '@/components/SiteNavbar'
import { PASSWORD_LENGTH_MESSAGE, PASSWORD_MISMATCH_MESSAGE } from '../lib/passwordRules'
import { AuthPage } from './AuthPage'
import { ForgotPasswordPage } from './ForgotPasswordPage'

const { loginWithPasswordMock, registerWithPasswordMock, useAuthSessionMock } = vi.hoisted(() => ({
  loginWithPasswordMock: vi.fn(),
  registerWithPasswordMock: vi.fn(),
  useAuthSessionMock: vi.fn(() => ({
    isLoggedIn: false,
    roles: [],
    userName: '',
    email: '',
    points: 0,
    tier: 'FREE',
    avatarUrl: null,
  })),
}))

vi.mock('../authSession', () => ({
  loginWithPassword: loginWithPasswordMock,
  registerWithPassword: registerWithPasswordMock,
  useAuthSession: useAuthSessionMock,
  logoutSession: vi.fn(),
}))

vi.mock('@/components/toast/toastContext', () => ({
  useToast: () => ({ toast: vi.fn(), dismiss: vi.fn(), toasts: [] }),
}))

function LocationProbe() {
  const location = useLocation()
  return (
    <output data-testid="location-probe">
      {`${location.pathname}|${JSON.stringify(location.state)}`}
    </output>
  )
}

describe('AuthPage modal & SiteNavbar integration', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    loginWithPasswordMock.mockResolvedValue({ roles: [{ name: 'CUSTOMER' }] })
    registerWithPasswordMock.mockResolvedValue({ roles: [{ name: 'CUSTOMER' }] })
  })

  it('opens the auth pop-up from SiteNavbar over the current page without changing URL and restores focus on close', async () => {
    render(
      <MemoryRouter initialEntries={['/vocabulary']}>
        <SiteNavbar isLoggedIn={false} />
        <LocationProbe />
      </MemoryRouter>,
    )

    const loginBtn = screen.getByRole('button', { name: 'Đăng nhập' })
    fireEvent.click(loginBtn)

    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Đăng nhập để bắt đầu hành trình!' })).toBeInTheDocument()
    expect(screen.getByTestId('location-probe')).toHaveTextContent('/vocabulary|null')

    fireEvent.keyDown(document, { key: 'Escape' })
    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    })
    expect(screen.getByTestId('location-probe')).toHaveTextContent('/vocabulary|null')
    expect(loginBtn).toHaveFocus()
  })

  it('renders sign-in and sign-up pop-ups when navigating directly to /login and /register', () => {
    const { unmount } = render(
      <MemoryRouter initialEntries={['/login']}>
        <Routes>
          <Route path="/login" element={<AuthPage mode="sign-in" />} />
        </Routes>
      </MemoryRouter>,
    )

    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Đăng nhập để bắt đầu hành trình!' })).toBeInTheDocument()
    expect(screen.getByLabelText(/Email hoặc số điện thoại/i)).toBeInTheDocument()
    expect(screen.getByLabelText('Đăng nhập qua mạng xã hội')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Apple/i })).not.toBeInTheDocument()
    unmount()

    render(
      <MemoryRouter initialEntries={['/register']}>
        <Routes>
          <Route path="/register" element={<AuthPage mode="sign-up" />} />
        </Routes>
      </MemoryRouter>,
    )

    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Tạo tài khoản để bắt đầu hành trình' })).toBeInTheDocument()
    expect(screen.getByLabelText(/Họ và tên/i)).toBeInTheDocument()
  })

  it('switches between sign-in and sign-up modes in-place without closing the pop-up', () => {
    render(
      <MemoryRouter initialEntries={['/login']}>
        <Routes>
          <Route path="/login" element={<AuthPage mode="sign-in" />} />
        </Routes>
      </MemoryRouter>,
    )

    const dialog = screen.getByRole('dialog')
    expect(screen.getByRole('tab', { name: 'Đăng nhập' })).toHaveAttribute('aria-selected', 'true')

    fireEvent.click(screen.getByRole('tab', { name: 'Đăng ký' }))
    expect(screen.getByRole('dialog')).toBe(dialog)
    expect(screen.getByRole('tab', { name: 'Đăng ký' })).toHaveAttribute('aria-selected', 'true')
    expect(screen.getByRole('heading', { name: 'Tạo tài khoản để bắt đầu hành trình' })).toBeInTheDocument()
    expect(screen.getByLabelText(/Họ và tên/i)).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Đăng nhập' }))
    expect(screen.getByRole('dialog')).toBe(dialog)
    expect(screen.getByRole('tab', { name: 'Đăng nhập' })).toHaveAttribute('aria-selected', 'true')
    expect(screen.getByRole('heading', { name: 'Đăng nhập để bắt đầu hành trình!' })).toBeInTheDocument()
  })

  it('preserves state.from and sets communityLoginTransition when signing in to Community', async () => {
    render(
      <MemoryRouter initialEntries={[{ pathname: '/login', state: { from: { pathname: '/community' } } }]}>
        <Routes>
          <Route path="/login" element={<AuthPage mode="sign-in" />} />
          <Route path="/community" element={<LocationProbe />} />
        </Routes>
      </MemoryRouter>,
    )

    fireEvent.change(screen.getByLabelText(/Email hoặc số điện thoại/i), {
      target: { value: 'learner@example.test' },
    })
    fireEvent.change(screen.getByLabelText('Mật khẩu'), {
      target: { value: 'password123' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Đăng nhập' }))

    expect(await screen.findByTestId('location-probe')).toHaveTextContent('communityLoginTransition')
    expect(loginWithPasswordMock).toHaveBeenCalledWith('learner@example.test', 'password123')
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

    fireEvent.change(screen.getByLabelText(/Email hoặc số điện thoại/i), {
      target: { value: 'staff@example.test' },
    })
    fireEvent.change(screen.getByLabelText('Mật khẩu'), {
      target: { value: 'password123' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Đăng nhập' }))

    expect(await screen.findByRole('heading', { name: 'Không gian làm việc' })).toBeInTheDocument()
  })

  it('closes with Escape and returns to /home when opened directly via URL', async () => {
    render(
      <MemoryRouter initialEntries={['/login']}>
        <Routes>
          <Route path="/login" element={<AuthPage mode="sign-in" />} />
          <Route path="/home" element={<h1>Trang chủ IELTS Space</h1>} />
        </Routes>
      </MemoryRouter>,
    )

    expect(screen.getByRole('dialog')).toBeInTheDocument()
    fireEvent.keyDown(document, { key: 'Escape' })

    expect(await screen.findByRole('heading', { name: 'Trang chủ IELTS Space' })).toBeInTheDocument()
  })

  it('validates password length (6–72 chars) and password confirmation match on sign-up', () => {
    render(
      <MemoryRouter initialEntries={['/register']}>
        <Routes>
          <Route path="/register" element={<AuthPage mode="sign-up" />} />
        </Routes>
      </MemoryRouter>,
    )

    fireEvent.change(screen.getByLabelText(/Họ và tên/i), { target: { value: 'Nguyễn Văn A' } })
    fireEvent.change(screen.getByLabelText(/^Email/i), { target: { value: 'newuser@example.test' } })
    fireEvent.change(screen.getByLabelText('Mật khẩu'), { target: { value: '12345' } })
    fireEvent.change(screen.getByLabelText('Xác nhận mật khẩu'), { target: { value: '12345' } })
    fireEvent.click(screen.getByRole('button', { name: /Tạo tài khoản/i }))

    expect(screen.getByRole('status')).toHaveTextContent(PASSWORD_LENGTH_MESSAGE)
    expect(registerWithPasswordMock).not.toHaveBeenCalled()

    fireEvent.change(screen.getByLabelText('Mật khẩu'), { target: { value: 'validpass123' } })
    fireEvent.change(screen.getByLabelText('Xác nhận mật khẩu'), { target: { value: 'different123' } })
    fireEvent.click(screen.getByRole('button', { name: /Tạo tài khoản/i }))

    expect(screen.getByRole('status')).toHaveTextContent(PASSWORD_MISMATCH_MESSAGE)
    expect(registerWithPasswordMock).not.toHaveBeenCalled()
  })

  it('closes the login pop-up and opens the ForgotPasswordPage pop-up when clicking Quên mật khẩu?', async () => {
    render(
      <MemoryRouter initialEntries={['/vocabulary']}>
        <Routes>
          <Route path="/vocabulary" element={<SiteNavbar isLoggedIn={false} />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        </Routes>
      </MemoryRouter>,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Đăng nhập' }))
    expect(screen.getByRole('dialog')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('link', { name: 'Quên mật khẩu?' }))
    expect(await screen.findByRole('heading', { name: 'Quên mật khẩu' })).toBeInTheDocument()
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Gửi email đặt lại/i })).toBeInTheDocument()
  })
})
