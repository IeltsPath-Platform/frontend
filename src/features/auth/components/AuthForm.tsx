import { ArrowRight } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useMemo, useState, type FormEvent } from 'react'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { emailText, requiredText } from '@/lib/validation/fields'
import { useFormDataErrors } from '@/lib/validation/useFormDataErrors'
import {
  isPasswordLengthValid,
  PASSWORD_LENGTH_MESSAGE,
  PASSWORD_MAX_LENGTH,
  PASSWORD_MIN_LENGTH,
  PASSWORD_MISMATCH_MESSAGE,
} from '../lib/passwordRules'
import { InputField } from './InputField'
import { SocialButtons } from './SocialButtons'

export type AuthMode = 'sign-in' | 'sign-up'

export interface AuthSubmitPayload {
  email: string
  password: string
  fullName?: string
}

interface AuthFormProps {
  mode: AuthMode
  transitionDirection?: 'none' | 'rtl' | 'ltr'
  submitting?: boolean
  onSubmit: (payload: AuthSubmitPayload) => void
  onGoogleCredential: (idToken: string) => void
  onGoogleError: (message: string) => void
  onModeChange?: (nextMode: AuthMode) => void
  onForgotPasswordClick?: () => void
  /** Server refusal of the new password (for example a weak one), shown under the password field until the next send. */
  passwordError?: string | null
}

/** What each mode asks for. Fields are read by their name from the form. */
function authSchema(mode: AuthMode) {
  const password = z.string({ error: 'Mật khẩu không được để trống.' }).min(1, 'Mật khẩu không được để trống.')
  if (mode === 'sign-in') return z.object({ email: requiredText('Email', 255), password })
  return z.object({
    fullName: requiredText('Họ và tên', 150),
    email: emailText('Email'),
    password: password.refine(isPasswordLengthValid, PASSWORD_LENGTH_MESSAGE),
    confirmPassword: z.string({ error: 'Xác nhận mật khẩu không được để trống.' }).min(1, 'Xác nhận mật khẩu không được để trống.'),
  }).superRefine((values, ctx) => {
    if (values.confirmPassword !== '' && values.password !== values.confirmPassword) ctx.addIssue({ code: 'custom', path: ['confirmPassword'], message: PASSWORD_MISMATCH_MESSAGE })
  })
}

const AUTH_MODAL_COPY: Record<AuthMode, { submitLabel: string }> = {
  'sign-in': { submitLabel: 'Đăng nhập' },
  'sign-up': { submitLabel: 'Tạo tài khoản' },
}

export function AuthForm({
  mode,
  transitionDirection = 'none',
  submitting = false,
  onSubmit,
  onGoogleCredential,
  onGoogleError,
  onModeChange,
  onForgotPasswordClick,
  passwordError,
}: AuthFormProps) {
  const copy = AUTH_MODAL_COPY[mode]
  const isSignUp = mode === 'sign-up'
  const passwordAutocomplete = mode === 'sign-in' ? 'current-password' : 'new-password'
  const [shake, setShake] = useState<{ mode: AuthMode; active: boolean }>({ mode, active: false })
  const shakeActive = shake.mode === mode && shake.active
  const schema = useMemo(() => authSchema(mode), [mode])
  const form = useFormDataErrors(schema)
  const errors = form.errors

  function triggerShake() {
    setShake({ mode, active: false })
    if (typeof window !== 'undefined' && typeof window.requestAnimationFrame === 'function') {
      window.requestAnimationFrame(() => setShake({ mode, active: true }))
    } else {
      setShake({ mode, active: true })
    }
  }

  function handleModeSwitch(targetMode: AuthMode) {
    if (targetMode === mode) return
    form.reset()
    setShake({ mode: targetMode, active: false })
    onModeChange?.(targetMode)
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!form.validate(event.currentTarget)) {
      triggerShake()
      return
    }
    const formData = new FormData(event.currentTarget)
    const email = String(formData.get('email')).trim()
    const password = String(formData.get('password'))
    if (mode === 'sign-up') {
      onSubmit({ email, password, fullName: String(formData.get('fullName')).trim() })
      return
    }
    onSubmit({ email, password })
  }
  return (
    <section
      className={`auth-form-panel auth-modal-form-card${shakeActive ? ' auth-form-panel--shake' : ''}`}
      aria-labelledby="auth-modal-title"
      data-mode={mode}
      data-direction={transitionDirection}
      onAnimationEnd={(event) => {
        if (event.animationName === 'auth-modal-shake') {
          setShake((prev) => ({ ...prev, active: false }))
        }
      }}
    >
      <div className="auth-modal-tabs" role="tablist" aria-label="Chế độ xác thực">
        {onModeChange ? (
          <>
            <button
              type="button"
              role="tab"
              aria-selected={mode === 'sign-in'}
              className={`auth-modal-tab${mode === 'sign-in' ? ' is-active' : ''}`}
              onClick={() => handleModeSwitch('sign-in')}
            >
              Đăng nhập
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={mode === 'sign-up'}
              className={`auth-modal-tab${mode === 'sign-up' ? ' is-active' : ''}`}
              onClick={() => handleModeSwitch('sign-up')}
            >
              Đăng ký
            </button>
          </>
        ) : (
          <>
            <Link
              to="/login"
              role="tab"
              aria-selected={mode === 'sign-in'}
              className={`auth-modal-tab${mode === 'sign-in' ? ' is-active' : ''}`}
            >
              Đăng nhập
            </Link>
            <Link
              to="/register"
              role="tab"
              aria-selected={mode === 'sign-up'}
              className={`auth-modal-tab${mode === 'sign-up' ? ' is-active' : ''}`}
            >
              Đăng ký
            </Link>
          </>
        )}
        <span
          className="auth-modal-tab-indicator"
          data-mode={mode}
          aria-hidden="true"
        />
      </div>

      <div className="auth-match-move-stage" data-mode={mode} data-direction={transitionDirection}>
        <form className="auth-form" noValidate onInput={form.onInput} onSubmit={handleSubmit}>
          <div className="auth-fields auth-fields--match-move">
            {/* Slot 1: Họ và tên (Match & Move right-to-left / left-to-right + expand/collapse) */}
            <div
              className={`auth-morph-slot auth-morph-slot--signup-only${isSignUp ? ' is-expanded' : ' is-collapsed'}`}
              aria-hidden={!isSignUp}
            >
              <div className="auth-morph-slot-inner auth-morph-slot-inner--top">
                <InputField
                  id="auth-fullName"
                  name="fullName"
                  label="Họ và tên"
                  icon="user"
                  type="text"
                  autoComplete="name"
                  required={isSignUp}
                  disabled={!isSignUp}
                  tabIndex={isSignUp ? undefined : -1}
                  placeholder="Nhập họ và tên của bạn"
                  error={errors.fullName}
                />
              </div>
            </div>

            {/* Shared Field: Email (glides horizontally & vertically, morphing icon & label) */}
            <div className="auth-shared-item auth-shared-item--email" data-shared-step="1">
              <InputField
                id="auth-email"
                name="email"
                label="Email"
                icon={isSignUp ? 'mail' : 'user'}
                type="email"
                autoComplete="username"
                autoCapitalize="none"
                inputMode="email"
                required
                placeholder="Nhập email của bạn"
                error={errors.email}
              />
            </div>

            {/* Shared Field: Mật khẩu (glides horizontally & vertically) */}
            <div className="auth-shared-item auth-shared-item--password" data-shared-step="2">
              <InputField
                id="auth-password"
                name="password"
                label="Mật khẩu"
                icon="lock"
                type="password"
                autoComplete={passwordAutocomplete}
                required
                minLength={isSignUp ? PASSWORD_MIN_LENGTH : undefined}
                maxLength={isSignUp ? PASSWORD_MAX_LENGTH : undefined}
                placeholder="Nhập mật khẩu"
                error={errors.password ?? passwordError ?? undefined}
              />
            </div>

            {/* Slot 4: Xác nhận mật khẩu (Match & Move right-to-left / left-to-right + expand/collapse) */}
            <div
              className={`auth-morph-slot auth-morph-slot--signup-only${isSignUp ? ' is-expanded' : ' is-collapsed'}`}
              aria-hidden={!isSignUp}
            >
              <div className="auth-morph-slot-inner auth-morph-slot-inner--bottom">
                <InputField
                  id="auth-confirmPassword"
                  name="confirmPassword"
                  label="Xác nhận mật khẩu"
                  icon="lock"
                  type="password"
                  autoComplete="new-password"
                  required={isSignUp}
                  disabled={!isSignUp}
                  tabIndex={isSignUp ? undefined : -1}
                  minLength={PASSWORD_MIN_LENGTH}
                  maxLength={PASSWORD_MAX_LENGTH}
                  placeholder="Nhập lại mật khẩu"
                  error={errors.confirmPassword}
                />
              </div>
            </div>
          </div>

          {/* Slot: Quên mật khẩu? (glides left/right + collapses smoothly when switching to sign-up) */}
          <div
            className={`auth-morph-slot auth-morph-slot--forgot auth-morph-slot--signin-only${!isSignUp ? ' is-expanded' : ' is-collapsed'}`}
            aria-hidden={isSignUp}
          >
            <div className="auth-morph-slot-inner">
              <div className="auth-forgot-row">
                <Link
                  className="auth-forgot-password"
                  to="/forgot-password"
                  tabIndex={!isSignUp ? undefined : -1}
                  onClick={onForgotPasswordClick}
                >
                  Quên mật khẩu?
                </Link>
              </div>
            </div>
          </div>

          <div className="auth-shared-item auth-shared-item--cta" data-shared-step="3">
            <Button
              type="submit"
              className="auth-submit-button auth-submit-button--cta"
              disabled={submitting}
            >
              <span key={mode} className="auth-submit-label-morph">
                {submitting ? 'Đang xử lý…' : copy.submitLabel}
              </span>
              {!submitting ? <ArrowRight className="auth-submit-arrow" aria-hidden="true" size={18} strokeWidth={2.25} /> : null}
            </Button>
          </div>

          <div className="auth-shared-item auth-shared-item--social" data-shared-step="4">
            <div className="auth-divider" role="separator" aria-label="Hoặc">
              <span>Hoặc</span>
            </div>

            <SocialButtons
              disabled={submitting}
              onGoogleCredential={onGoogleCredential}
              onError={onGoogleError}
            />
          </div>

          <p className="auth-status" role="status" aria-live="polite" />
        </form>
      </div>
    </section>
  )
}
