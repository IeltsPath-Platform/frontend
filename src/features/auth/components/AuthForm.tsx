import { Link } from 'react-router-dom'
import type { FormEvent } from 'react'
import { Button } from '@/components/ui/button'
import { InputField } from './InputField'
import { SocialButtons, type SocialProvider } from './SocialButtons'

export type AuthMode = 'sign-in' | 'sign-up'

export interface AuthSubmitPayload {
  email: string
  password: string
  fullName?: string
}

interface AuthFormProps {
  mode: AuthMode
  statusMessage: string
  submitting?: boolean
  onSubmit: (payload: AuthSubmitPayload) => void
  onSocialSelect: (provider: SocialProvider) => void
}

const FORM_COPY: Record<AuthMode, { title: string; description: string; submitLabel: string; prompt: string; switchLabel: string; switchTo: string }> = {
  'sign-in': {
    title: 'Chào mừng bạn trở lại',
    description: 'Đăng nhập để tiếp tục lộ trình IELTS của bạn.',
    submitLabel: 'Đăng nhập',
    prompt: 'Chưa có tài khoản?',
    switchLabel: 'Đăng ký ngay',
    switchTo: '/register',
  },
  'sign-up': {
    title: 'Tạo tài khoản mới',
    description: 'Bắt đầu kế hoạch học IELTS phù hợp với bạn.',
    submitLabel: 'Tạo tài khoản',
    prompt: 'Đã có tài khoản?',
    switchLabel: 'Đăng nhập',
    switchTo: '/login',
  },
}

export function AuthForm({ mode, statusMessage, submitting = false, onSubmit, onSocialSelect }: AuthFormProps) {
  const copy = FORM_COPY[mode]
  const passwordAutocomplete = mode === 'sign-in' ? 'current-password' : 'new-password'

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const formData = new FormData(event.currentTarget)
    const email = formData.get('email')
    const password = formData.get('password')
    const fullName = formData.get('fullName')

    if (typeof email !== 'string' || typeof password !== 'string' || !email || !password) return
    if (mode === 'sign-up') {
      if (typeof fullName !== 'string' || !fullName.trim()) return
      onSubmit({ email, password, fullName: fullName.trim() })
      return
    }
    onSubmit({ email, password })
  }

  return (
    <section className="auth-form-panel" aria-labelledby="auth-form-title">
      <header className="auth-form-heading">
        <p>{mode === 'sign-in' ? 'IELTS SPACE' : 'BẮT ĐẦU HỌC'}</p>
        <h1 id="auth-form-title">{copy.title}</h1>
        <span>{copy.description}</span>
      </header>
      <form className="auth-form" onSubmit={handleSubmit}>
        <div className="auth-fields">
          {mode === 'sign-up' ? (
            <InputField
              id={`${mode}-fullName`}
              name="fullName"
              label="Họ và tên"
              type="text"
              autoComplete="name"
              required
              placeholder="Nguyễn Văn A"
            />
          ) : null}
          <InputField
            id={`${mode}-email`}
            name="email"
            label="Email"
            type="email"
            autoComplete="username"
            autoCapitalize="none"
            inputMode="email"
            required
            placeholder="name@example.com"
          />
          <InputField
            id={`${mode}-password`}
            name="password"
            label="Mật khẩu"
            type="password"
            autoComplete={passwordAutocomplete}
            required
            minLength={mode === 'sign-up' ? 6 : undefined}
            placeholder="Ít nhất 6 ký tự"
            hint={mode === 'sign-up' ? 'Dùng ít nhất 6 ký tự để bảo vệ tài khoản.' : undefined}
          />
        </div>
        {mode === 'sign-in' ? (
          <Button type="button" variant="link" className="auth-forgot-password" disabled>
            Quên mật khẩu? (sắp có)
          </Button>
        ) : null}
        <Button type="submit" className="auth-submit-button" disabled={submitting}>
          {submitting ? 'Đang xử lý…' : copy.submitLabel}
        </Button>
        <div className="auth-divider" role="separator" aria-label="hoặc"><span>hoặc</span></div>
        <SocialButtons onSelect={onSocialSelect} />
        <p className="auth-status" role="status" aria-live="polite">{statusMessage}</p>
      </form>
      <p className="auth-mode-toggle">{copy.prompt} <Link to={copy.switchTo}>{copy.switchLabel}</Link></p>
    </section>
  )
}
