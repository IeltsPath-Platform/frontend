import { useEffect, useRef, useState, type FormEvent } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { HttpError } from '@/lib/httpClient'
import { authApi } from '../api/authApi'
import { AuthShell } from '../components/AuthShell'
import { InputField } from '../components/InputField'

export function ResetPasswordPage() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const tokenFromUrl = (searchParams.get('token') ?? '').trim()

  const [statusMessage, setStatusMessage] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const redirectTimer = useRef<number | null>(null)

  useEffect(() => () => {
    if (redirectTimer.current !== null) window.clearTimeout(redirectTimer.current)
  }, [])

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const formData = new FormData(event.currentTarget)
    const token = String(formData.get('token') ?? '').trim()
    const newPassword = String(formData.get('newPassword') ?? '')
    const confirmPassword = String(formData.get('confirmPassword') ?? '')

    if (!token || !newPassword) return
    if (newPassword.length < 6) {
      setStatusMessage('Mật khẩu mới cần ít nhất 6 ký tự.')
      return
    }
    if (newPassword !== confirmPassword) {
      setStatusMessage('Mật khẩu xác nhận không khớp.')
      return
    }

    setSubmitting(true)
    setStatusMessage('')
    try {
      const result = await authApi.resetPassword({ token, newPassword })
      setStatusMessage(result.message || 'Đặt lại mật khẩu thành công. Đang chuyển tới đăng nhập…')
      redirectTimer.current = window.setTimeout(() => navigate('/login', { replace: true }), 900)
    } catch (error) {
      setStatusMessage(error instanceof HttpError ? error.message : 'Không đặt lại được mật khẩu. Kiểm tra mã và thử lại.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <AuthShell
      ambientTitle="Đặt lại mật khẩu an toàn."
      ambientBody="Dán mã từ email/log BE (demo), hoặc mở link có ?token=."
    >
      <section className="auth-form-panel" aria-labelledby="reset-form-title">
        <header className="auth-form-heading">
          <p>IELTS SPACE</p>
          <h1 id="reset-form-title">Đặt lại mật khẩu</h1>
          <span>Nhập mã xác nhận và mật khẩu mới.</span>
        </header>
        <form className="auth-form" onSubmit={handleSubmit}>
          <div className="auth-fields">
            <InputField
              id="reset-token"
              name="token"
              label="Mã đặt lại"
              type="text"
              autoComplete="one-time-code"
              required
              defaultValue={tokenFromUrl}
              placeholder="Dán mã từ log/Swagger hoặc email"
              hint="Demo: BE ghi mã vào log khi gọi forgot-password."
            />
            <InputField
              id="reset-new-password"
              name="newPassword"
              label="Mật khẩu mới"
              type="password"
              autoComplete="new-password"
              required
              minLength={6}
              placeholder="Ít nhất 6 ký tự"
            />
            <InputField
              id="reset-confirm-password"
              name="confirmPassword"
              label="Xác nhận mật khẩu"
              type="password"
              autoComplete="new-password"
              required
              minLength={6}
              placeholder="Nhập lại mật khẩu mới"
            />
          </div>
          <Button type="submit" className="auth-submit-button" disabled={submitting}>
            {submitting ? 'Đang xử lý…' : 'Đặt lại mật khẩu'}
          </Button>
          <p className="auth-status" role="status" aria-live="polite">{statusMessage}</p>
        </form>
        <p className="auth-mode-toggle">
          Chưa có mã? <Link to="/forgot-password">Yêu cầu lại</Link>
          {' · '}
          <Link to="/login">Đăng nhập</Link>
        </p>
      </section>
    </AuthShell>
  )
}
