import { useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { HttpError } from '@/lib/httpClient'
import { useToast } from '@/components/toast/toastContext'
import { AuthForm, type AuthMode, type AuthSubmitPayload } from '../components/AuthForm'
import { AuthShell } from '../components/AuthShell'
import { loginWithGoogle, loginWithPassword, registerWithPassword } from '../authSession'
import { mapAuthPasswordHttpError } from '../lib/passwordRules'
import { signInDestination } from '../staffRoles'

interface AuthPageProps {
  mode: AuthMode
}

export function AuthPage({ mode }: AuthPageProps) {
  const { toast } = useToast()
  const [submitting, setSubmitting] = useState(false)
  const googleInFlight = useRef(false)
  const navigate = useNavigate()
  const location = useLocation()
  const from = (location.state as { from?: { pathname?: string } } | null)?.from?.pathname

  async function handleSubmit(payload: AuthSubmitPayload) {
    setSubmitting(true)
    try {
      const user = mode === 'sign-up'
        ? await registerWithPassword({
          email: payload.email,
          password: payload.password,
          fullName: payload.fullName ?? payload.email.split('@')[0] ?? 'Học viên',
        })
        : await loginWithPassword(payload.email, payload.password)
      const redirectTo = signInDestination(user.roles.map((role) => role.name), from)
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

  async function handleGoogleCredential(idToken: string) {
    if (googleInFlight.current) return
    googleInFlight.current = true
    setSubmitting(true)
    try {
      const user = await loginWithGoogle(idToken)
      const redirectTo = signInDestination(user.roles.map((role) => role.name), from)
      navigate(redirectTo, {
        replace: true,
        state: mode === 'sign-in' && redirectTo.startsWith('/community')
          ? { communityLoginTransition: true }
          : null,
      })
    } catch (error) {
      const message = error instanceof HttpError && error.code === 'GOOGLE_EMAIL_NOT_SUPPORTED'
        ? 'Tài khoản Google cần dùng Gmail hoặc email Google Workspace. Bạn có thể đăng nhập bằng mật khẩu.'
        : error instanceof HttpError && error.code === 'GOOGLE_SIGNIN_NOT_ALLOWED'
          ? 'Tài khoản này cần đăng nhập bằng mật khẩu.'
          : error instanceof HttpError
            ? error.message
            : 'Không thể đăng nhập bằng Google. Vui lòng thử lại.'
      toast({
        title: message,
        tone: 'error',
      })
    } finally {
      googleInFlight.current = false
      setSubmitting(false)
    }
  }

  function handleGoogleError(message: string) {
    toast({ title: message, tone: 'error' })
  }

  return (
    <AuthShell showNavbar={false}>
      <AuthForm
        mode={mode}
        submitting={submitting}
        onSubmit={handleSubmit}
        onGoogleCredential={handleGoogleCredential}
        onGoogleError={handleGoogleError}
      />
    </AuthShell>
  )
}
