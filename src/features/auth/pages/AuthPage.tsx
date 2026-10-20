import { useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { OAUTH_ENABLED } from '@/lib/env'
import { HttpError } from '@/lib/httpClient'
import { useToast } from '@/components/toast/toastContext'
import { AuthForm, type AuthMode, type AuthSubmitPayload } from '../components/AuthForm'
import { AuthShell } from '../components/AuthShell'
import type { SocialProvider } from '../components/SocialButtons'
import { loginWithPassword, registerWithPassword } from '../authSession'
import { authApi } from '../api/authApi'
import { mapAuthPasswordHttpError } from '../lib/passwordRules'

interface AuthPageProps {
  mode: AuthMode
}

export function AuthPage({ mode }: AuthPageProps) {
  const { toast } = useToast()
  const [submitting, setSubmitting] = useState(false)
  const navigate = useNavigate()
  const location = useLocation()
  const redirectTo = (location.state as { from?: { pathname?: string } } | null)?.from?.pathname || '/overview'

  async function handleSubmit(payload: AuthSubmitPayload) {
    setSubmitting(true)
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
      navigate(redirectTo, {
        replace: true,
        state: mode === 'sign-in' && redirectTo.startsWith('/community')
          ? { communityLoginTransition: true }
          : null,
      })
    } catch (error) {
      toast({
        title: mode === 'sign-up'
          ? mapAuthPasswordHttpError(error, 'Không thể đăng ký. Vui lòng thử lại.')
          : error instanceof HttpError
            ? error.message
            : 'Không thể xác thực. Vui lòng thử lại.',
        tone: 'error',
      })
    } finally {
      setSubmitting(false)
    }
  }

  function handleSocialSelect(provider: SocialProvider) {
    if (!OAUTH_ENABLED) {
      toast({ title: `Đăng nhập với ${provider} chưa được hỗ trợ.`, tone: 'info' })
      return
    }
    try {
      authApi.startOAuth(provider)
    } catch (error) {
      toast({
        title: error instanceof Error ? error.message : `Không bắt đầu được đăng nhập ${provider}.`,
        tone: 'error',
      })
    }
  }

  return (
    <AuthShell showNavbar={false}>
      <AuthForm
        mode={mode}
        submitting={submitting}
        oauthEnabled={OAUTH_ENABLED}
        onSubmit={handleSubmit}
        onSocialSelect={handleSocialSelect}
      />
    </AuthShell>
  )
}
