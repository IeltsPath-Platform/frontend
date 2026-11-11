import { ArrowRight } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useState, type FormEvent } from 'react'
import { Button } from '@/components/ui/button'
import {
  isPasswordLengthValid,
  PASSWORD_LENGTH_MESSAGE,
  PASSWORD_MAX_LENGTH,
  PASSWORD_MIN_LENGTH,
  PASSWORD_MISMATCH_MESSAGE,
} from '../lib/passwordRules'
import { InputField } from './InputField'

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
  onModeChange?: (nextMode: AuthMode) => void
  onForgotPasswordClick?: () => void
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
  onModeChange,
  onForgotPasswordClick,
}: AuthFormProps) {
  const copy = AUTH_MODAL_COPY[mode]
  const isSignUp = mode === 'sign-up'
  const passwordAutocomplete = mode === 'sign-in' ? 'current-password' : 'new-password'
  const [validationState, setValidationState] = useState<{ mode: AuthMode; message: string; shake: boolean }>({
    mode,
    message: '',
    shake: false,
  })
  const clientMessage = validationState.mode === mode ? validationState.message : ''
  const shakeActive = validationState.mode === mode && validationState.shake

  function triggerValidationError(message: string) {
    setValidationState({ mode, message, shake: false })
    if (typeof window !== 'undefined' && typeof window.requestAnimationFrame === 'function') {
      window.requestAnimationFrame(() => setValidationState({ mode, message, shake: true }))
    } else {
      setValidationState({ mode, message, shake: true })
    }
  }

  function handleModeSwitch(targetMode: AuthMode) {
    if (targetMode === mode) return
    setValidationState({ mode: targetMode, message: '', shake: false })
    onModeChange?.(targetMode)
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setValidationState({ mode, message: '', shake: false })
    const formData = new FormData(event.currentTarget)
    const email = formData.get('email')
    const password = formData.get('password')
    const fullName = formData.get('fullName')
    const confirmPassword = formData.get('confirmPassword')

    if (typeof email !== 'string' || typeof password !== 'string' || !email.trim() || !password) {
      triggerValidationError('Vui lòng điền đầy đủ thông tin bắt buộc.')
      return
    }

    if (mode === 'sign-up') {
      if (typeof fullName !== 'string' || !fullName.trim()) {
        triggerValidationError('Vui lòng nhập họ và tên của bạn.')
        return
      }
      if (!isPasswordLengthValid(password)) {
        triggerValidationError(PASSWORD_LENGTH_MESSAGE)
        return
      }
      if (typeof confirmPassword !== 'string' || password !== confirmPassword) {
        triggerValidationError(PASSWORD_MISMATCH_MESSAGE)
        return
      }
      onSubmit({ email: email.trim(), password, fullName: fullName.trim() })
      return
    }

    onSubmit({ email: email.trim(), password })
  }

  return (
    <section
      className={`auth-form-panel auth-modal-form-card${shakeActive ? ' auth-form-panel--shake' : ''}`}
      aria-labelledby="auth-modal-title"
      data-mode={mode}
      data-direction={transitionDirection}
      onAnimationEnd={(event) => {
        if (event.animationName === 'auth-modal-shake') {
          setValidationState((prev) => ({ ...prev, shake: false }))
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
        <form className="auth-form" noValidate onSubmit={handleSubmit}>
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
                  requiredMark
                  icon="user"
                  type="text"
                  autoComplete="name"
                  required={isSignUp}
                  disabled={!isSignUp}
                  tabIndex={isSignUp ? undefined : -1}
                  placeholder="Nhập họ và tên của bạn"
                />
              </div>
            </div>

            {/* Shared Field: Email (glides horizontally & vertically, morphing icon & label) */}
            <div className="auth-shared-item auth-shared-item--email" data-shared-step="1">
              <InputField
                id="auth-email"
                name="email"
                label={isSignUp ? 'Email' : 'Email hoặc số điện thoại'}
                requiredMark={isSignUp}
                icon={isSignUp ? 'mail' : 'user'}
                type="email"
                autoComplete="username"
                autoCapitalize="none"
                inputMode="email"
                required
                placeholder={isSignUp ? 'Nhập email của bạn' : 'Nhập email hoặc số điện thoại'}
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

          {clientMessage ? (
            <p className="auth-status auth-status--error" role="status" aria-live="polite">
              {clientMessage}
            </p>
          ) : (
            <p className="auth-status" role="status" aria-live="polite" />
          )}
        </form>
      </div>
    </section>
  )
}
