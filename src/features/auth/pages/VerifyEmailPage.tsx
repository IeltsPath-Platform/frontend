import { useEffect, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { authApi } from '../api/authApi'
import { AuthShell } from '../components/AuthShell'

type VerifyState = 'checking' | 'verified' | 'failed' | 'missing'

/** Landing page of the verification link in the email. Consumes the token once, then shows the result. */
export function VerifyEmailPage() {
  const [searchParams] = useSearchParams()
  const token = (searchParams.get('token') ?? '').trim()
  const [state, setState] = useState<VerifyState>(token ? 'checking' : 'missing')
  const [message, setMessage] = useState('')
  const sent = useRef(false)

  useEffect(() => {
    if (!token || sent.current) return
    sent.current = true
    // Drop the token from the address bar so it is not kept in history or shared by accident.
    const url = new URL(window.location.href)
    url.searchParams.delete('token')
    window.history.replaceState(window.history.state, '', url)
    authApi.verifyEmail(token)
      .then((result) => {
        setMessage(result.message || 'Xác minh email thành công.')
        setState('verified')
      })
      .catch((error: unknown) => {
        setMessage(error instanceof Error ? error.message : 'Liên kết xác minh không hợp lệ hoặc đã hết hạn.')
        setState('failed')
      })
  }, [token])

  return (
    <AuthShell
      ambientTitle="Xác minh địa chỉ email."
      ambientBody="Xác minh giúp bảo vệ tài khoản và giữ quyền khôi phục mật khẩu."
    >
      <section className="auth-form-panel" aria-labelledby="verify-email-title">
        <header className="auth-form-heading">
          <h1 id="verify-email-title">Xác minh email</h1>
        </header>
        {state === 'checking' && <p role="status">Đang xác minh…</p>}
        {state === 'verified' && (
          <>
            <p role="status">{message}</p>
            <Button asChild><Link to="/login">Đăng nhập</Link></Button>
          </>
        )}
        {state === 'failed' && (
          <>
            <p role="alert">{message}</p>
            <p>Bạn có thể gửi lại liên kết từ trang hồ sơ sau khi đăng nhập.</p>
            <Button asChild variant="outline"><Link to="/login">Đăng nhập</Link></Button>
          </>
        )}
        {state === 'missing' && (
          <>
            <p>Liên kết xác minh không đầy đủ. Hãy mở đúng liên kết trong email.</p>
            <Button asChild variant="outline"><Link to="/login">Đăng nhập</Link></Button>
          </>
        )}
      </section>
    </AuthShell>
  )
}
