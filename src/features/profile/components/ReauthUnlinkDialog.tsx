import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { GoogleSignInButton } from '@/features/auth/components/GoogleSignInButton'
import { createZodResolver } from '@/lib/zodResolver'
import { HttpError } from '@/lib/httpClient'
import { profileApi, type ReauthRequest } from '../api/profileApi'
import { errorMessage } from '../lib/errorMessage'

const passwordSchema = z.object({
  currentPassword: z.string().min(1, 'Mật khẩu hiện tại không được để trống.'),
})
type PasswordFormData = z.infer<typeof passwordSchema>

interface ReauthUnlinkDialogProps {
  provider: string
  hasPassword: boolean
  /** Receives the single-use token; rejecting keeps the dialog open and shows the message. */
  onConfirmed: (reauthToken: string) => Promise<void>
  onCancel: () => void
}

/**
 * Unlinking a sign-in method needs the account owner to prove identity again: the current password, or Google for an
 * account that has no password. The token from that step is handed to `onConfirmed`.
 */
export function ReauthUnlinkDialog({ provider, hasPassword, onConfirmed, onCancel }: ReauthUnlinkDialogProps) {
  const [busy, setBusy] = useState(false)
  const [banner, setBanner] = useState<string | null>(null)
  const form = useForm<PasswordFormData>({
    resolver: createZodResolver(passwordSchema),
    defaultValues: { currentPassword: '' },
  })

  async function confirmWith(body: ReauthRequest) {
    setBusy(true)
    setBanner(null)
    let reauthToken: string
    try {
      reauthToken = (await profileApi.reauth(body)).reauthToken
    } catch (error) {
      const wrongPassword = 'currentPassword' in body && error instanceof HttpError
        && (error.status === 400 || error.status === 401)
      if (wrongPassword) form.setError('currentPassword', { type: 'server', message: error.message })
      else setBanner(errorMessage(error))
      setBusy(false)
      return
    }
    try {
      await onConfirmed(reauthToken)
    } catch (error) {
      setBanner(errorMessage(error))
    } finally {
      setBusy(false)
    }
  }

  const { errors } = form.formState

  return (
    <div className="profile-modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="unlink-modal-title">
      <div className="profile-confirm-card">
        <h3 id="unlink-modal-title" className="profile-confirm-title">
          Hủy liên kết tài khoản {provider}?
        </h3>
        <p className="profile-confirm-desc">
          Sau khi hủy liên kết, bạn sẽ không thể dùng tài khoản {provider} này để đăng nhập trực tiếp. Hãy đảm bảo bạn nhớ mật khẩu tài khoản để đăng nhập lại.
        </p>

        {banner && (
          <div className="profile-form-banner-error" role="alert">
            <AlertCircle size={16} aria-hidden="true" />
            <span>{banner}</span>
          </div>
        )}

        {hasPassword ? (
          <form onSubmit={form.handleSubmit((data) => confirmWith({ currentPassword: data.currentPassword }))} noValidate>
            <div className="profile-field-group">
              <label htmlFor="unlink-current-password" className="profile-field-label">
                Mật khẩu hiện tại <span className="profile-required">*</span>
              </label>
              <input
                id="unlink-current-password"
                type="password"
                autoComplete="current-password"
                className={`profile-input ${errors.currentPassword ? 'input-error' : ''}`}
                disabled={busy}
                {...form.register('currentPassword')}
              />
              {errors.currentPassword && (
                <span className="profile-field-error" role="alert">{errors.currentPassword.message}</span>
              )}
            </div>
            <div className="profile-confirm-actions">
              <Button type="button" variant="ghost" onClick={onCancel} disabled={busy}>Hủy</Button>
              <Button type="submit" variant="destructive" disabled={busy}>
                {busy ? 'Đang gỡ…' : 'Xác nhận gỡ'}
              </Button>
            </div>
          </form>
        ) : (
          <>
            <GoogleSignInButton
              onCredential={(idToken) => void confirmWith({ googleIdToken: idToken })}
              onError={setBanner}
              disabled={busy}
            />
            <div className="profile-confirm-actions">
              <Button type="button" variant="ghost" onClick={onCancel} disabled={busy}>Hủy</Button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
