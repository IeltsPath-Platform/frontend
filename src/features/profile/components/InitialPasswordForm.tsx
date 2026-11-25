import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { GoogleSignInButton } from '@/features/auth/components/GoogleSignInButton'
import {
  PASSWORD_LENGTH_MESSAGE,
  PASSWORD_LENGTH_PLACEHOLDER,
  PASSWORD_MAX_LENGTH,
  PASSWORD_MIN_LENGTH,
  PASSWORD_MISMATCH_MESSAGE,
  isWeakPasswordError,
  weakPasswordMessage,
} from '@/features/auth/lib/passwordRules'
import { createZodResolver } from '@/lib/zodResolver'
import { profileApi } from '../api/profileApi'
import { errorMessage } from '../lib/errorMessage'

const initialPasswordSchema = z
  .object({
    newPassword: z
      .string()
      .min(PASSWORD_MIN_LENGTH, PASSWORD_LENGTH_MESSAGE)
      .max(PASSWORD_MAX_LENGTH, PASSWORD_LENGTH_MESSAGE),
    confirmPassword: z.string().min(1, 'Xác nhận mật khẩu không được để trống.'),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: PASSWORD_MISMATCH_MESSAGE,
    path: ['confirmPassword'],
  })
type InitialPasswordFormData = z.infer<typeof initialPasswordSchema>

interface InitialPasswordFormProps {
  /** Receives the single-use token from the Google step; rejects with the server's message on failure. */
  onSetInitialPassword: (newPassword: string, reauthToken: string) => Promise<void>
  onShowToast: (message: string, tone?: 'success' | 'error' | 'info') => void
}

/**
 * For an account created with Google, which has no password yet. The user confirms with Google first; only then can a
 * password be created, and the server ends the other sessions after it is set.
 */
export function InitialPasswordForm({ onSetInitialPassword, onShowToast }: InitialPasswordFormProps) {
  const [reauthToken, setReauthToken] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [banner, setBanner] = useState<string | null>(null)
  const form = useForm<InitialPasswordFormData>({
    resolver: createZodResolver(initialPasswordSchema),
    defaultValues: { newPassword: '', confirmPassword: '' },
  })
  const { errors } = form.formState

  async function verifyWithGoogle(idToken: string) {
    setBusy(true)
    setBanner(null)
    try {
      const { reauthToken: token } = await profileApi.reauth({ googleIdToken: idToken })
      setReauthToken(token)
    } catch (error) {
      setBanner(errorMessage(error))
    } finally {
      setBusy(false)
    }
  }

  async function submit(data: InitialPasswordFormData) {
    if (!reauthToken) return
    setBusy(true)
    setBanner(null)
    try {
      await onSetInitialPassword(data.newPassword, reauthToken)
      onShowToast('Đã tạo mật khẩu đăng nhập.', 'success')
    } catch (error) {
      if (isWeakPasswordError(error)) {
        // Only the password is wrong: the form stays open so the user can correct it.
        form.setError('newPassword', { type: 'server', message: weakPasswordMessage(error) })
      } else {
        // The token is single-use and may be spent: confirm with Google again before retrying.
        setReauthToken(null)
        setBanner(errorMessage(error))
      }
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="profile-password-form">
      {banner && (
        <div className="profile-form-banner-error" role="alert">
          <AlertCircle size={16} aria-hidden="true" />
          <span>{banner}</span>
        </div>
      )}

      {reauthToken ? (
        <form onSubmit={form.handleSubmit(submit)} noValidate>
          <div className="profile-field-group">
            <label htmlFor="initial-new-password" className="profile-field-label">
              Mật khẩu mới <span className="profile-required">*</span>
            </label>
            <input
              id="initial-new-password"
              type="password"
              autoComplete="new-password"
              placeholder={PASSWORD_LENGTH_PLACEHOLDER}
              className={`profile-input ${errors.newPassword ? 'input-error' : ''}`}
              disabled={busy}
              {...form.register('newPassword')}
            />
            {errors.newPassword && (
              <span className="profile-field-error" role="alert">{errors.newPassword.message}</span>
            )}
          </div>

          <div className="profile-field-group">
            <label htmlFor="initial-confirm-password" className="profile-field-label">
              Xác nhận mật khẩu mới <span className="profile-required">*</span>
            </label>
            <input
              id="initial-confirm-password"
              type="password"
              autoComplete="new-password"
              className={`profile-input ${errors.confirmPassword ? 'input-error' : ''}`}
              disabled={busy}
              {...form.register('confirmPassword')}
            />
            {errors.confirmPassword && (
              <span className="profile-field-error" role="alert">{errors.confirmPassword.message}</span>
            )}
          </div>

          <Button type="submit" disabled={busy} className="profile-change-pass-btn">
            {busy ? 'Đang tạo mật khẩu…' : 'Tạo mật khẩu'}
          </Button>
        </form>
      ) : (
        <>
          <p role="status">Tài khoản này chưa có mật khẩu. Xác nhận bằng Google để tạo mật khẩu đăng nhập.</p>
          <GoogleSignInButton
            onCredential={(idToken) => void verifyWithGoogle(idToken)}
            onError={setBanner}
            disabled={busy}
          />
        </>
      )}
    </div>
  )
}
