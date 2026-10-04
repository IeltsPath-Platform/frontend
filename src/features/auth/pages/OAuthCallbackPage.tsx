import { useEffect, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { OAUTH_ENABLED } from '@/lib/env'
import { HttpError } from '@/lib/httpClient'
import { authApi } from '../api/authApi'
import { AuthShell } from '../components/AuthShell'
import { loginWithAccessToken } from '../authSession'

/**
 * Placeholder route for future OAuth redirect.
 * With VITE_OAUTH_ENABLED=false this only shows a safe message (no fake session).
 */
export function OAuthCallbackPage() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const [message, setMessage] = useState(
    OAUTH_ENABLED ? 'Đang hoàn tất đăng nhập…' : 'Đăng nhập mạng xã hội chưa được hỗ trợ.',
  )

  useEffect(() => {
    if (!OAUTH_ENABLED) return
    let cancelled = false
    ;(async () => {
      try {
        const tokens = await authApi.handleOAuthCallback(searchParams)
        if (cancelled) return
        await loginWithAccessToken(tokens.accessToken)
        if (cancelled) return
        navigate('/learn', { replace: true })
      } catch (error) {
        if (cancelled) return
        setMessage(error instanceof HttpError ? error.message : error instanceof Error ? error.message : 'OAuth thất bại.')
      }
    })()
    return () => { cancelled = true }
  }, [navigate, searchParams])

  return (
    <AuthShell ambientTitle="Đăng nhập mạng xã hội" ambientBody="Chờ backend OAuth sẵn sàng.">
      <section className="auth-form-panel" aria-labelledby="oauth-callback-title">
        <header className="auth-form-heading">
          <p>IELTS SPACE</p>
          <h1 id="oauth-callback-title">OAuth</h1>
          <span>{message}</span>
        </header>
        <p className="auth-mode-toggle"><Link to="/login">Quay lại đăng nhập</Link></p>
      </section>
    </AuthShell>
  )
}
