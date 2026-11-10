import { ArrowLeft, ArrowRight, CheckCircle2, KeyRound, ShieldCheck, X } from 'lucide-react'
import { Dialog as DialogPrimitive } from 'radix-ui'
import { useEffect, useRef, useState, type FormEvent } from 'react'
import { Link, useNavigate, useNavigationType } from 'react-router-dom'
import authOwlSignIn from '@/assets/owl/auth-owl-signin.png'
import authOwlSignUp from '@/assets/owl/auth-owl-signup.png'
import { Button } from '@/components/ui/button'
import { HttpError } from '@/lib/httpClient'
import { useToast } from '@/components/toast/toastContext'
import { authApi } from '../api/authApi'
import { InputField } from '../components/InputField'
import '../auth.css'

export interface ForgotPasswordPageProps {
  open?: boolean
  onOpenChange?: (open: boolean) => void
}

export function ForgotPasswordPage({ open = true, onOpenChange }: ForgotPasswordPageProps) {
  const { toast } = useToast()
  const contentRef = useRef<HTMLDivElement>(null)
  const navigate = useNavigate()
  const navigationType = useNavigationType()

  const [submitting, setSubmitting] = useState(false)
  const [sent, setSent] = useState(false)
  const [submittedEmail, setSubmittedEmail] = useState('')
  const [validationError, setValidationError] = useState('')
  const [shake, setShake] = useState(false)
  const [cooldownSeconds, setCooldownSeconds] = useState(0)

  useEffect(() => {
    if (!cooldownSeconds) return
    const timer = window.setTimeout(() => setCooldownSeconds((seconds) => Math.max(0, seconds - 1)), 1000)
    return () => window.clearTimeout(timer)
  }, [cooldownSeconds])

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

  function triggerValidationError(message: string) {
    setValidationError(message)
    setShake(false)
    if (typeof window !== 'undefined' && typeof window.requestAnimationFrame === 'function') {
      window.requestAnimationFrame(() => setShake(true))
    } else {
      setShake(true)
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setValidationError('')
    setShake(false)

    const formData = new FormData(event.currentTarget)
    const email = formData.get('email')
    if (typeof email !== 'string' || !email.trim()) {
      triggerValidationError('Vui lòng nhập địa chỉ email đã đăng ký.')
      return
    }

    const normalizedEmail = email.trim()
    setSubmitting(true)
    try {
      const result = await authApi.forgotPassword(normalizedEmail)
      setSubmittedEmail(normalizedEmail)
      setSent(true)
      setCooldownSeconds(60)
      toast({
        title: 'Đã gửi yêu cầu',
        description:
          result.message
          || 'Nếu email tồn tại, chúng tôi sẽ gửi hướng dẫn đặt lại mật khẩu.',
        tone: 'success',
      })
    } catch (error) {
      toast({
        title: error instanceof HttpError ? error.message : 'Không gửi được yêu cầu. Thử lại.',
        tone: 'error',
      })
    } finally {
      setSubmitting(false)
    }
  }

  const transitionDirection = sent ? 'rtl' : 'none'

  return (
    <DialogPrimitive.Root
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) {
          handleDismiss()
        }
      }}
    >
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay
          className="auth-modal-overlay"
          data-testid="auth-modal-overlay"
        />
        <DialogPrimitive.Content
          ref={contentRef}
          className="auth-modal-content"
          aria-labelledby="forgot-form-title"
          aria-describedby="forgot-form-description"
          onOpenAutoFocus={(event) => {
            event.preventDefault()
            contentRef.current?.focus()
          }}
          onFocusOutside={(event) => event.preventDefault()}
        >
          <div className="auth-modal-grid" data-mode={sent ? 'sign-in' : 'sign-up'} data-direction={transitionDirection}>
            <aside
              className="auth-modal-aside"
              aria-label="Khôi phục mật khẩu The IELTS Space"
              data-mode={sent ? 'sign-in' : 'sign-up'}
              data-direction={transitionDirection}
            >
              <div className="auth-modal-aside-header">
                <span className="auth-modal-greeting">
                  <span className="auth-modal-greeting-wave" aria-hidden="true">👋</span>
                  <span>Xin chào!</span>
                </span>

                <div className="auth-modal-copy-morph" data-direction={transitionDirection}>
                  {sent ? (
                    <div
                      key="forgot-copy-outgoing"
                      className="auth-modal-copy-layer auth-modal-copy-layer--outgoing"
                      aria-hidden="true"
                    >
                      <div className="auth-modal-aside-title">Quên mật khẩu? Khôi phục nhanh!</div>
                      <p className="auth-modal-aside-description">
                        Nhập email đã đăng ký tài khoản tại The IELTS Space. Chúng tôi sẽ tạo mã xác nhận để giúp bạn thiết lập lại mật khẩu ngay!
                      </p>
                    </div>
                  ) : null}
                  <div
                    key={sent ? 'forgot-copy-sent' : 'forgot-copy-initial'}
                    className="auth-modal-copy-layer auth-modal-copy-layer--incoming"
                  >
                    <DialogPrimitive.Title className="auth-modal-aside-title">
                      {sent ? 'Đã gửi yêu cầu khôi phục!' : 'Quên mật khẩu? Khôi phục nhanh!'}
                    </DialogPrimitive.Title>
                    <DialogPrimitive.Description className="auth-modal-aside-description">
                      {sent
                        ? 'Mã đặt lại mật khẩu đã được tạo cho tài khoản của bạn. Hãy chuyển sang bước đặt lại mật khẩu để hoàn tất nhé!'
                        : 'Nhập email đã đăng ký tài khoản tại The IELTS Space. Chúng tôi sẽ tạo mã xác nhận để giúp bạn thiết lập lại mật khẩu ngay!'}
                    </DialogPrimitive.Description>
                  </div>
                </div>
              </div>

              <div className="auth-modal-illustration-wrap" data-direction={transitionDirection}>
                <div className="auth-modal-owl-float-rig">
                  <img
                    src={authOwlSignUp}
                    alt="Cú mèo The IELTS Space cầm ống nhòm tìm kiếm mã khôi phục"
                    aria-hidden={sent}
                    className={`auth-modal-owl-illustration auth-modal-owl-layer auth-modal-owl-layer--sign-up${
                      sent ? ' is-flying-away' : ' is-active'
                    }`}
                    draggable={false}
                  />
                  <img
                    src={authOwlSignIn}
                    alt="Cú mèo The IELTS Space cưỡi tên lửa sẵn sàng quay lại hành trình"
                    aria-hidden={!sent}
                    className={`auth-modal-owl-illustration auth-modal-owl-layer auth-modal-owl-layer--sign-in${
                      sent ? ' is-flying-in is-active' : ' is-hidden-initial'
                    }`}
                    draggable={false}
                  />
                </div>
              </div>
            </aside>

            <div className="auth-modal-form-column">
              <section
                className={`auth-form-panel auth-modal-form-card auth-forgot-card${shake ? ' auth-form-panel--shake' : ''}`}
                aria-labelledby="forgot-form-title"
                onAnimationEnd={(event) => {
                  if (event.animationName === 'auth-modal-shake') {
                    setShake(false)
                  }
                }}
              >
                <div className="auth-forgot-top-bar">
                  <Link to="/login" className="auth-forgot-back-pill">
                    <ArrowLeft aria-hidden="true" size={15} strokeWidth={2.2} />
                    <span>Quay lại đăng nhập</span>
                  </Link>
                  <span className={`auth-forgot-step-badge${sent ? ' is-sent' : ''}`}>
                    {sent ? 'Bước 2/2 · Đã tạo mã' : 'Bước 1/2 · Xác minh email'}
                  </span>
                </div>

                <header className="auth-forgot-header">
                  <h1 id="forgot-form-title" className="auth-forgot-heading-title">
                    Quên mật khẩu
                  </h1>
                  <p id="forgot-form-description" className="auth-forgot-heading-desc">
                    Chúng tôi sẽ xử lý mã đặt lại mật khẩu cho địa chỉ email đã đăng ký của bạn.
                  </p>
                </header>

                <div className="auth-match-move-stage" data-direction={transitionDirection}>
                  <form className="auth-form" noValidate onSubmit={handleSubmit}>
                    <div className="auth-fields auth-fields--match-move">
                      <div className="auth-shared-item auth-shared-item--email" data-shared-step="1">
                        <InputField
                          id="forgot-email"
                          name="email"
                          label="Email"
                          requiredMark
                          icon="mail"
                          type="email"
                          autoComplete="username"
                          autoCapitalize="none"
                          inputMode="email"
                          required
                          placeholder="Nhập email của bạn"
                          disabled={submitting}
                        />
                      </div>
                    </div>

                    {validationError ? (
                      <p className="auth-status auth-status--error" role="status" aria-live="polite">
                        {validationError}
                      </p>
                    ) : (
                      <p className="auth-status" role="status" aria-live="polite" />
                    )}

                    <div className="auth-shared-item auth-shared-item--cta" data-shared-step="2">
                      <Button type="submit" className="auth-submit-button auth-submit-button--cta" disabled={submitting || cooldownSeconds > 0}>
                        <span key={sent ? 'resend' : 'send'} className="auth-submit-label-morph">
                          {submitting ? 'Đang gửi…' : cooldownSeconds > 0 ? `Gửi lại sau ${cooldownSeconds}s` : sent ? 'Gửi lại email' : 'Gửi email đặt lại'}
                        </span>
                        {!submitting ? <ArrowRight className="auth-submit-arrow" aria-hidden="true" size={18} strokeWidth={2.25} /> : null}
                      </Button>
                    </div>
                  </form>

                  <div
                    className={`auth-forgot-info-card${sent ? ' auth-forgot-info-card--sent' : ''}`}
                    data-direction={transitionDirection}
                  >
                    {sent ? (
                      <div key="info-sent" className="auth-forgot-info-inner">
                        <div className="auth-forgot-info-row">
                          <span className="auth-forgot-info-icon auth-forgot-info-icon--success" aria-hidden="true">
                            <CheckCircle2 size={18} strokeWidth={2.2} />
                          </span>
                          <div className="auth-forgot-info-copy">
                            <strong>Đã tạo yêu cầu cho {submittedEmail || 'email của bạn'}</strong>
                            <p>Nếu tài khoản tồn tại, mã xác nhận đã sẵn sàng để bạn đặt lại mật khẩu mới.</p>
                          </div>
                        </div>
                        <Link to="/reset-password" className="auth-forgot-reset-cta">
                          <span>Tôi đã có mã — đặt lại mật khẩu</span>
                          <ArrowRight aria-hidden="true" size={16} strokeWidth={2.2} />
                        </Link>
                      </div>
                    ) : (
                      <div key="info-guide" className="auth-forgot-info-inner">
                        <div className="auth-forgot-info-row">
                          <span className="auth-forgot-info-icon" aria-hidden="true">
                            <KeyRound size={17} strokeWidth={2} />
                          </span>
                          <div className="auth-forgot-info-copy">
                            <strong>Nhận mã khôi phục nhanh chóng</strong>
                            <p>Nhập đúng email tài khoản để hệ thống cấp mã xác nhận đặt lại mật khẩu.</p>
                          </div>
                        </div>
                        <div className="auth-forgot-info-row">
                          <span className="auth-forgot-info-icon" aria-hidden="true">
                            <ShieldCheck size={17} strokeWidth={2} />
                          </span>
                          <div className="auth-forgot-info-copy">
                            <strong>Bảo mật tài khoản học viên</strong>
                            <p>Mật khẩu mới từ 6–72 ký tự giúp bảo vệ tiến trình học IELTS của bạn.</p>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  <p className="auth-mode-toggle auth-shared-item auth-shared-item--footer" data-shared-step="3">
                    Nhớ mật khẩu rồi?{' '}
                    <Link to="/login">Quay lại đăng nhập</Link>
                    {' · '}
                    <Link to="/register">Đăng ký ngay</Link>
                  </p>
                </div>
              </section>

              <DialogPrimitive.Close asChild>
                <button
                  type="button"
                  className="auth-modal-close-btn"
                  aria-label="Đóng"
                >
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
