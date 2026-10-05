import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { HttpError } from '@/lib/httpClient'
import { authApi } from '../api/authApi'
import { AuthShell } from '../components/AuthShell'
import { InputField } from '../components/InputField'

export function ForgotPasswordPage() {
  const [statusMessage, setStatusMessage] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [sent, setSent] = useState(false)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const formData = new FormData(event.currentTarget)
    const email = formData.get('email')
    if (typeof email !== 'string' || !email.trim()) return

    setSubmitting(true)
    setStatusMessage('')
    try {
      const result = await authApi.forgotPassword(email.trim())
      setSent(true)
      setStatusMessage(
        result.message
          || 'Nếu email tồn tại, mã đặt lại đã được tạo. (Môi trường demo: lấy mã từ log/Swagger BE.)',
      )
    } catch (error) {
      setStatusMessage(error instanceof HttpError ? error.message : 'Không gửi được yêu cầu. Thử lại.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <AuthShell
      ambientTitle="Quên mật khẩu? Khôi phục nhanh."
      ambientBody="Nhập email đã đăng ký. Mã đặt lại sẽ được xử lý phía máy chủ (demo: xem log BE)."
    >
      <section className="auth-form-panel" aria-labelledby="forgot-form-title">
        <header className="auth-form-heading">
          <p>IELTS SPACE</p>
          <h1 id="forgot-form-title">Quên mật khẩu</h1>
          <span>Chúng tôi sẽ xử lý mã đặt lại cho email của bạn.</span>
        </header>
        <form className="auth-form" onSubmit={handleSubmit}>
          <div className="auth-fields">
            <InputField
              id="forgot-email"
              name="email"
              label="Email"
              type="email"
              autoComplete="username"
              autoCapitalize="none"
              inputMode="email"
              required
              placeholder="name@example.com"
              disabled={submitting}
            />
          </div>
          <Button type="submit" className="auth-submit-button" disabled={submitting}>
            {submitting ? 'Đang gửi…' : sent ? 'Gửi lại mã' : 'Gửi mã đặt lại'}
          </Button>
          <p className="auth-status" role="status" aria-live="polite">{statusMessage}</p>
        </form>
        <p className="auth-mode-toggle">
          {sent ? <Link to="/reset-password">Tôi đã có mã — đặt lại mật khẩu</Link> : null}
          {sent ? ' · ' : null}
          <Link to="/login">Quay lại đăng nhập</Link>
        </p>
      </section>
    </AuthShell>
  )
}
