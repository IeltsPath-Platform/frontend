import { useEffect, useRef, useState, type FormEvent } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { authApi } from '../api/authApi'
import { AuthShell } from '../components/AuthShell'
import { InputField } from '../components/InputField'
import {
  isPasswordLengthValid,
  mapAuthPasswordHttpError,
  PASSWORD_LENGTH_HINT,
  PASSWORD_LENGTH_MESSAGE,
  PASSWORD_LENGTH_PLACEHOLDER,
  PASSWORD_MAX_LENGTH,
  PASSWORD_MIN_LENGTH,
  PASSWORD_MISMATCH_MESSAGE,
} from '../lib/passwordRules'

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
    if (!isPasswordLengthValid(newPassword)) {
      setStatusMessage(PASSWORD_LENGTH_MESSAGE)
      return
    }
    if (newPassword !== confirmPassword) {
      setStatusMessage(PASSWORD_MISMATCH_MESSAGE)
      return
    }

    setSubmitting(true)
    setStatusMessage('')
    try {
      const result = await authApi.resetPassword({ token, newPassword })
      setStatusMessage(result.message || 'Đặt lại mật khẩu thành công. Đang chuyển tới đăng nhập…')
      redirectTimer.current = window.setTimeout(() => navigate('/login', { replace: true }), 900)
    } catch (error) {
      setStatusMessage(mapAuthPasswordHttpError(error, 'Không đặt lại được mật khẩu. Kiểm tra mã và thử lại.'))
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
              minLength={PASSWORD_MIN_LENGTH}
              maxLength={PASSWORD_MAX_LENGTH}
              placeholder={PASSWORD_LENGTH_PLACEHOLDER}
              hint={PASSWORD_LENGTH_HINT}
            />
            <InputField
              id="reset-confirm-password"
              name="confirmPassword"
              label="Xác nhận mật khẩu"
              type="password"
              autoComplete="new-password"
              required
              minLength={PASSWORD_MIN_LENGTH}
              maxLength={PASSWORD_MAX_LENGTH}
              placeholder="Nhập lại mật khẩu mới"
              hint={PASSWORD_LENGTH_HINT}
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
