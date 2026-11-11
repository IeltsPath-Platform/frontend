import { X } from 'lucide-react'
import { Dialog as DialogPrimitive } from 'radix-ui'
import { useRef, useState } from 'react'
import { useLocation, useNavigate, useNavigationType } from 'react-router-dom'
import authOwlSignIn from '@/assets/owl/auth-owl-signin.png'
import authOwlSignUp from '@/assets/owl/auth-owl-signup.png'
import { HttpError } from '@/lib/httpClient'
import { useToast } from '@/components/toast/toastContext'
import { AuthForm, type AuthMode, type AuthSubmitPayload } from '../components/AuthForm'
import { loginWithPassword, registerWithPassword } from '../authSession'
import { mapAuthPasswordHttpError } from '../lib/passwordRules'
import { signInDestination } from '../staffRoles'
import '../auth.css'

const MODAL_LEFT_COPY: Record<
  AuthMode,
  {
    title: string
    description: string
    image: string
    imageAlt: string
  }
> = {
  'sign-in': {
    title: 'Đăng nhập để bắt đầu hành trình!',
    description: 'Đăng nhập để bắt đầu hành trình của bạn tại The IELTS Space!',
    image: authOwlSignIn,
    imageAlt: 'Cú mèo The IELTS Space cưỡi tên lửa bắt đầu hành trình học tập',
  },
  'sign-up': {
    title: 'Tạo tài khoản để bắt đầu hành trình',
    description:
      'Chỉ mất 1 phút để tạo tài khoản. Bạn sẽ có thể làm bài test, luyện đề, trải nghiệm các trò chơi thú vị và từng bước nâng cao năng lực IELTS của bạn!',
    image: authOwlSignUp,
    imageAlt: 'Cú mèo The IELTS Space cầm ống nhòm khám phá lộ trình IELTS',
  },
}

export interface AuthPageProps {
  mode: AuthMode
  open?: boolean
  onOpenChange?: (open: boolean) => void
  onModeChange?: (mode: AuthMode) => void
  onReturnFocus?: () => void
}

export function AuthPage({
  mode,
  open = true,
  onOpenChange,
  onModeChange,
  onReturnFocus,
}: AuthPageProps) {
  const { toast } = useToast()
  const contentRef = useRef<HTMLDivElement>(null)
  const [submitting, setSubmitting] = useState(false)
  const [transitionState, setTransitionState] = useState<{
    activeMode: AuthMode
    previousMode: AuthMode | null
    seq: number
    syncedPropMode: AuthMode
  }>({
    activeMode: mode,
    previousMode: null,
    seq: 0,
    syncedPropMode: mode,
  })

  const isSyncedWithProp = transitionState.syncedPropMode === mode
  const currentMode = isSyncedWithProp ? transitionState.activeMode : mode
  const previousMode = isSyncedWithProp ? transitionState.previousMode : null
  const transitionSeq = isSyncedWithProp ? transitionState.seq : 0
  const isSignUp = currentMode === 'sign-up'
  const transitionDirection: 'none' | 'rtl' | 'ltr' =
    transitionSeq === 0
      ? 'none'
      : isSignUp
        ? 'rtl'
        : 'ltr'

  const navigate = useNavigate()
  const location = useLocation()
  const navigationType = useNavigationType()
  const from = (location.state as { from?: { pathname?: string } } | null)?.from?.pathname

  function handleSwitchMode(nextMode: AuthMode) {
    if (nextMode === currentMode) return
    setTransitionState((prev) => ({
      activeMode: nextMode,
      previousMode: currentMode,
      seq: prev.seq + 1,
      syncedPropMode: onModeChange ? nextMode : prev.syncedPropMode,
    }))
    onModeChange?.(nextMode)
  }

  function handleDismiss() {
    if (onOpenChange) {
      onOpenChange(false)
      return
    }
    if (!from && navigationType === 'PUSH') {
      navigate(-1)
      return
    }
    navigate('/home', { replace: true })
  }

  function handleForgotPassword() {
    onOpenChange?.(false)
  }

  async function handleSubmit(payload: AuthSubmitPayload) {
    setSubmitting(true)
    try {
      const user = currentMode === 'sign-up'
        ? await registerWithPassword({
          email: payload.email,
          password: payload.password,
          fullName: payload.fullName ?? payload.email.split('@')[0] ?? 'Học viên',
        })
        : await loginWithPassword(payload.email, payload.password)
      onOpenChange?.(false)
      const redirectTo = signInDestination(user.roles.map((role) => role.name), from)
      navigate(redirectTo, {
        replace: true,
        state: currentMode === 'sign-in' && redirectTo.startsWith('/community')
          ? { communityLoginTransition: true }
          : null,
      })
    } catch (error) {
      toast({
        title: currentMode === 'sign-up'
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


  const leftCopy = MODAL_LEFT_COPY[currentMode]
  const outgoingCopy = previousMode ? MODAL_LEFT_COPY[previousMode] : null
  const signInOwlStateClass =
    transitionSeq === 0
      ? !isSignUp
        ? ' is-active'
        : ' is-hidden-initial'
      : !isSignUp
        ? ' is-flying-in is-active'
        : ' is-flying-away'
  const signUpOwlStateClass =
    transitionSeq === 0
      ? isSignUp
        ? ' is-active'
        : ' is-hidden-initial'
      : isSignUp
        ? ' is-flying-in is-active'
        : ' is-flying-away'

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
          aria-labelledby="auth-modal-title"
          aria-describedby="auth-modal-description"
          onOpenAutoFocus={(event) => {
            event.preventDefault()
            contentRef.current?.focus()
          }}
          onFocusOutside={(event) => event.preventDefault()}
          onCloseAutoFocus={(event) => {
            if (onReturnFocus) {
              event.preventDefault()
              onReturnFocus()
            }
          }}
        >
          <div className="auth-modal-grid" data-mode={currentMode} data-direction={transitionDirection}>
            <aside
              className="auth-modal-aside"
              aria-label="Giới thiệu The IELTS Space"
              data-mode={currentMode}
              data-direction={transitionDirection}
            >
              <div className="auth-modal-aside-header">
                <span className="auth-modal-greeting">
                  <span className="auth-modal-greeting-wave" aria-hidden="true">👋</span>
                  <span>Xin chào!</span>
                </span>

                {/* Accessible Dialog Title & Description with Horizontal Match & Move */}
                <div className="auth-modal-copy-morph" data-mode={currentMode} data-direction={transitionDirection}>
                  {outgoingCopy ? (
                    <div
                      key={`out-${transitionSeq}`}
                      className="auth-modal-copy-layer auth-modal-copy-layer--outgoing"
                      aria-hidden="true"
                    >
                      <div className="auth-modal-aside-title">{outgoingCopy.title}</div>
                      <p className="auth-modal-aside-description">{outgoingCopy.description}</p>
                    </div>
                  ) : null}
                  <div
                    key={`in-${currentMode}-${transitionSeq}`}
                    className="auth-modal-copy-layer auth-modal-copy-layer--incoming"
                  >
                    <DialogPrimitive.Title id="auth-modal-title" className="auth-modal-aside-title">
                      {leftCopy.title}
                    </DialogPrimitive.Title>
                    <DialogPrimitive.Description id="auth-modal-description" className="auth-modal-aside-description">
                      {leftCopy.description}
                    </DialogPrimitive.Description>
                  </div>
                </div>
              </div>

              {/* Owl Rocket Fly-Away & Fly-In Illustration */}
              <div className="auth-modal-illustration-wrap" data-mode={currentMode} data-direction={transitionDirection}>
                <div className="auth-modal-owl-float-rig">
                  <img
                    src={MODAL_LEFT_COPY['sign-in'].image}
                    alt={MODAL_LEFT_COPY['sign-in'].imageAlt}
                    aria-hidden={isSignUp}
                    className={`auth-modal-owl-illustration auth-modal-owl-layer auth-modal-owl-layer--sign-in${signInOwlStateClass}`}
                    draggable={false}
                  />
                  <img
                    src={MODAL_LEFT_COPY['sign-up'].image}
                    alt={MODAL_LEFT_COPY['sign-up'].imageAlt}
                    aria-hidden={!isSignUp}
                    className={`auth-modal-owl-illustration auth-modal-owl-layer auth-modal-owl-layer--sign-up${signUpOwlStateClass}`}
                    draggable={false}
                  />
                </div>
              </div>
            </aside>

            <div className="auth-modal-form-column">
              <AuthForm
                mode={currentMode}
                transitionDirection={transitionDirection}
                submitting={submitting}
                onSubmit={handleSubmit}
                onModeChange={handleSwitchMode}
                onForgotPasswordClick={handleForgotPassword}
              />

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
