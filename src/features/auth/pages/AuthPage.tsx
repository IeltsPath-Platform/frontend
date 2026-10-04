import { useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { OAUTH_ENABLED } from '@/lib/env'
import { HttpError } from '@/lib/httpClient'
import { AuthForm, type AuthMode, type AuthSubmitPayload } from '../components/AuthForm'
import { AuthShell } from '../components/AuthShell'
import type { SocialProvider } from '../components/SocialButtons'
import { loginWithPassword, registerWithPassword } from '../authSession'
import { authApi } from '../api/authApi'

interface AuthPageProps {
  mode: AuthMode
}

export function AuthPage({ mode }: AuthPageProps) {
  const [statusMessage, setStatusMessage] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const navigate = useNavigate()
  const location = useLocation()
  const redirectTo = (location.state as { from?: { pathname?: string } } | null)?.from?.pathname || '/learn'

  async function handleSubmit(payload: AuthSubmitPayload) {
    setSubmitting(true)
    setStatusMessage('')
    try {
      if (mode === 'sign-up') {
        await registerWithPassword({
          email: payload.email,
          password: payload.password,
          fullName: payload.fullName ?? payload.email.split('@')[0] ?? 'Học viên',
        })
      } else {
        await loginWithPassword(payload.email, payload.password)
      }
      navigate(redirectTo, { replace: true })
    } catch (error) {
      const message = error instanceof HttpError ? error.message : 'Không thể xác thực. Vui lòng thử lại.'
      setStatusMessage(message)
    } finally {
      setSubmitting(false)
    }
  }

  function handleSocialSelect(provider: SocialProvider) {
    if (!OAUTH_ENABLED) {
      setStatusMessage(`Đăng nhập với ${provider} chưa được hỗ trợ.`)
      return
    }
    try {
      authApi.startOAuth(provider)
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : `Không bắt đầu được đăng nhập ${provider}.`)
    }
  }

  return (
    <AuthShell>
      <AuthForm
        mode={mode}
        statusMessage={statusMessage}
        submitting={submitting}
        oauthEnabled={OAUTH_ENABLED}
        onSubmit={handleSubmit}
        onSocialSelect={handleSocialSelect}
      />
    </AuthShell>
  )
}
