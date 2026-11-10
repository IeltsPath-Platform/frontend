import { ArrowLeft, ArrowRight, KeyRound, ShieldCheck, X } from 'lucide-react'
import { Dialog as DialogPrimitive } from 'radix-ui'
import { useEffect, useRef, useState, type FormEvent } from 'react'
import { Link, useNavigate, useNavigationType, useSearchParams } from 'react-router-dom'
import authOwlSignIn from '@/assets/owl/auth-owl-signin.png'
import { Button } from '@/components/ui/button'
import { useToast } from '@/components/toast/toastContext'
import { authApi } from '../api/authApi'
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
import '../auth.css'

export interface ResetPasswordPageProps {
  open?: boolean
  onOpenChange?: (open: boolean) => void
}

/** Final step of password recovery, shown as the same modal as sign-in and forgot-password. */
export function ResetPasswordPage({ open = true, onOpenChange }: ResetPasswordPageProps) {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const navigationType = useNavigationType()
  const { toast } = useToast()
  const contentRef = useRef<HTMLDivElement>(null)
  const tokenFromUrl = (searchParams.get('token') ?? '').trim()

  // Field validation stays under the form; the submit result is announced as a toast.
  const [validationMessage, setValidationMessage] = useState('')
  const [shake, setShake] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const redirectTimer = useRef<number | null>(null)

  useEffect(() => () => {
    if (redirectTimer.current !== null) window.clearTimeout(redirectTimer.current)
  }, [])

  function handleDismiss() {
    if (onOpenChange) {
      onOpenChange(false)
      return
    }
    if (navigationType === 'PUSH') {
      navigate(-1)
      return
    }
    navigate('/home', { replace: true })
  }

  function showValidation(message: string) {
    setValidationMessage(message)
    setShake(false)
    if (typeof window !== 'undefined' && typeof window.requestAnimationFrame === 'function') {
      window.requestAnimationFrame(() => setShake(true))
    } else {
      setShake(true)
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const formData = new FormData(event.currentTarget)
    const token = String(formData.get('token') ?? '').trim()
    const newPassword = String(formData.get('newPassword') ?? '')
    const confirmPassword = String(formData.get('confirmPassword') ?? '')

    if (!token || !newPassword) {
      showValidation('Vui lòng nhập mã đặt lại và mật khẩu mới.')
      return
    }
    if (!isPasswordLengthValid(newPassword)) {
      showValidation(PASSWORD_LENGTH_MESSAGE)
      return
    }
    if (newPassword !== confirmPassword) {
      showValidation(PASSWORD_MISMATCH_MESSAGE)
      return
    }

    setSubmitting(true)
    setValidationMessage('')
    try {
      const result = await authApi.resetPassword({ token, newPassword })
      toast({ title: result.message || 'Đặt lại mật khẩu thành công. Đang chuyển tới đăng nhập…', tone: 'success' })
      redirectTimer.current = window.setTimeout(() => navigate('/login', { replace: true }), 900)
    } catch (error) {
      toast({
        title: mapAuthPasswordHttpError(error, 'Không đặt lại được mật khẩu. Kiểm tra mã và thử lại.'),
        tone: 'error',
      })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <DialogPrimitive.Root
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) handleDismiss()
      }}
    >
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="auth-modal-overlay" data-testid="auth-modal-overlay" />
        <DialogPrimitive.Content
          ref={contentRef}
          className="auth-modal-content"
          aria-labelledby="reset-form-title"
          aria-describedby="reset-form-description"
          onOpenAutoFocus={(event) => {
            event.preventDefault()
            contentRef.current?.focus()
          }}
          onFocusOutside={(event) => event.preventDefault()}
        >
          <div className="auth-modal-grid" data-mode="sign-in" data-direction="none">
            <aside className="auth-modal-aside" aria-label="Đặt lại mật khẩu The IELTS Space" data-mode="sign-in" data-direction="none">
              <div className="auth-modal-aside-header">
                <span className="auth-modal-greeting">
                  <span className="auth-modal-greeting-wave" aria-hidden="true">👋</span>
                  <span>Xin chào!</span>
                </span>
                <div className="auth-modal-copy-morph" data-direction="none">
                  <div className="auth-modal-copy-layer auth-modal-copy-layer--incoming">
                    <DialogPrimitive.Title className="auth-modal-aside-title">Đặt lại mật khẩu an toàn!</DialogPrimitive.Title>
                    <DialogPrimitive.Description className="auth-modal-aside-description">
                      Dán mã xác nhận bạn vừa nhận và chọn mật khẩu mới để quay lại hành trình IELTS tại The IELTS Space.
                    </DialogPrimitive.Description>
                  </div>
                </div>
              </div>

              <div className="auth-modal-illustration-wrap" data-direction="none">
                <div className="auth-modal-owl-float-rig">
                  <img
                    src={authOwlSignIn}
                    alt="Cú mèo The IELTS Space cưỡi tên lửa sẵn sàng quay lại hành trình"
                    className="auth-modal-owl-illustration auth-modal-owl-layer auth-modal-owl-layer--sign-in is-active"
                    draggable={false}
                  />
                </div>
              </div>
            </aside>

            <div className="auth-modal-form-column">
              <section
                className={`auth-form-panel auth-modal-form-card auth-forgot-card${shake ? ' auth-form-panel--shake' : ''}`}
                aria-labelledby="reset-form-title"
                onAnimationEnd={(event) => {
                  if (event.animationName === 'auth-modal-shake') setShake(false)
                }}
              >
                <div className="auth-forgot-top-bar">
                  <Link to="/forgot-password" className="auth-forgot-back-pill">
                    <ArrowLeft aria-hidden="true" size={15} strokeWidth={2.2} />
                    <span>Yêu cầu mã mới</span>
                  </Link>
                  <span className="auth-forgot-step-badge is-sent">Bước cuối · Mật khẩu mới</span>
                </div>

                <header className="auth-forgot-header">
                  <h1 id="reset-form-title" className="auth-forgot-heading-title">Đặt lại mật khẩu</h1>
                  <p id="reset-form-description" className="auth-forgot-heading-desc">
                    Nhập mã xác nhận và mật khẩu mới cho tài khoản của bạn.
                  </p>
                </header>

                <div className="auth-match-move-stage" data-direction="none">
                  <form className="auth-form" noValidate onSubmit={handleSubmit}>
                    <div className="auth-fields">
                      <InputField
                        id="reset-token"
                        name="token"
                        label="Mã đặt lại"
                        requiredMark
                        icon="mail"
                        type="text"
                        autoComplete="one-time-code"
                        required
                        defaultValue={tokenFromUrl}
                        placeholder="Dán mã từ email hoặc log BE (demo)"
                        disabled={submitting}
                      />
                      <InputField
                        id="reset-new-password"
                        name="newPassword"
                        label="Mật khẩu mới"
                        requiredMark
                        icon="lock"
                        type="password"
                        autoComplete="new-password"
                        required
                        minLength={PASSWORD_MIN_LENGTH}
                        maxLength={PASSWORD_MAX_LENGTH}
                        placeholder={PASSWORD_LENGTH_PLACEHOLDER}
                        hint={PASSWORD_LENGTH_HINT}
                        disabled={submitting}
                      />
                      <InputField
                        id="reset-confirm-password"
                        name="confirmPassword"
                        label="Xác nhận mật khẩu"
                        requiredMark
                        icon="lock"
                        type="password"
                        autoComplete="new-password"
                        required
                        minLength={PASSWORD_MIN_LENGTH}
                        maxLength={PASSWORD_MAX_LENGTH}
                        placeholder="Nhập lại mật khẩu mới"
                        disabled={submitting}
                      />
                    </div>

                    {validationMessage ? (
                      <p className="auth-status auth-status--error" role="status" aria-live="polite">{validationMessage}</p>
                    ) : (
                      <p className="auth-status" role="status" aria-live="polite" />
                    )}

                    <Button type="submit" className="auth-submit-button auth-submit-button--cta" disabled={submitting}>
                      <span className="auth-submit-label-morph">{submitting ? 'Đang xử lý…' : 'Đặt lại mật khẩu'}</span>
                      {!submitting ? <ArrowRight className="auth-submit-arrow" aria-hidden="true" size={18} strokeWidth={2.25} /> : null}
                    </Button>
                  </form>

                  <div className="auth-forgot-info-card">
                    <div className="auth-forgot-info-inner">
                      <div className="auth-forgot-info-row">
                        <span className="auth-forgot-info-icon" aria-hidden="true"><KeyRound size={17} strokeWidth={2} /></span>
                        <div className="auth-forgot-info-copy">
                          <strong>Mã lấy ở đâu?</strong>
                          <p>Môi trường demo: backend ghi mã vào log khi gọi quên mật khẩu, hoặc mở link có ?token=.</p>
                        </div>
                      </div>
                      <div className="auth-forgot-info-row">
                        <span className="auth-forgot-info-icon" aria-hidden="true"><ShieldCheck size={17} strokeWidth={2} /></span>
                        <div className="auth-forgot-info-copy">
                          <strong>Mật khẩu an toàn</strong>
                          <p>Dùng 6–72 ký tự và không trùng mật khẩu cũ để bảo vệ tiến trình học của bạn.</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <p className="auth-mode-toggle">
                    Chưa có mã? <Link to="/forgot-password">Yêu cầu lại</Link>
                    {' · '}
                    <Link to="/login">Đăng nhập</Link>
                  </p>
                </div>
              </section>

              <DialogPrimitive.Close asChild>
                <button type="button" className="auth-modal-close-btn" aria-label="Đóng">
                  <X aria-hidden="true" size={20} strokeWidth={2.2} />
                </button>
              </DialogPrimitive.Close>
            </div>
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  )
}
