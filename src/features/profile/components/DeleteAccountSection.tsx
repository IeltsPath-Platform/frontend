import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { useNavigate } from 'react-router-dom'
import { z } from 'zod'
import { AlertCircle, AlertTriangle, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { GoogleSignInButton } from '@/features/auth/components/GoogleSignInButton'
import { clearAuthSession } from '@/features/auth/authSession'
import { createZodResolver } from '@/lib/zodResolver'
import { HttpError } from '@/lib/httpClient'
import { profileApi, type ReauthRequest } from '../api/profileApi'
import { errorMessage } from '../lib/errorMessage'
import { DELETE_CONFIRM_WORD, DELETION_CONSEQUENCES } from '../lib/accountDeletion'

const passwordSchema = z.object({
  currentPassword: z.string().min(1, 'Mật khẩu hiện tại không được để trống.'),
})
type PasswordFormData = z.infer<typeof passwordSchema>

interface DeleteAccountSectionProps {
  hasPassword: boolean
}

/** Danger zone that lets the signed-in user delete their own account, as Google Play requires. */
export function DeleteAccountSection({ hasPassword }: DeleteAccountSectionProps) {
  const [open, setOpen] = useState(false)

  return (
    <section className="profile-section-card profile-danger-card" aria-labelledby="delete-account-title">
      <div className="profile-section-header">
        <div className="profile-section-title-wrap">
          <Trash2 className="profile-section-icon profile-danger-icon" aria-hidden="true" size={20} />
          <div>
            <h2 id="delete-account-title" className="profile-section-title">Xóa tài khoản</h2>
            <p className="profile-section-subtitle">
              Xóa vĩnh viễn tài khoản và dữ liệu học tập của bạn. Thao tác này không thể hoàn tác.
            </p>
          </div>
        </div>
        <Button type="button" variant="destructive" onClick={() => setOpen(true)}>
          Xóa tài khoản
        </Button>
      </div>
      {open && <DeleteAccountDialog hasPassword={hasPassword} onCancel={() => setOpen(false)} />}
    </section>
  )
}

interface DeleteAccountDialogProps {
  hasPassword: boolean
  onCancel: () => void
}

export function DeleteAccountDialog({ hasPassword, onCancel }: DeleteAccountDialogProps) {
  const navigate = useNavigate()
  const [busy, setBusy] = useState(false)
  const [banner, setBanner] = useState<string | null>(null)
  const [confirmWord, setConfirmWord] = useState('')
  const confirmed = confirmWord.trim().toLocaleUpperCase('vi-VN') === DELETE_CONFIRM_WORD
  const form = useForm<PasswordFormData>({
    resolver: createZodResolver(passwordSchema),
    defaultValues: { currentPassword: '' },
  })

  async function deleteWith(body: ReauthRequest) {
    if (!confirmed) return
    setBusy(true)
    setBanner(null)
    try {
      await profileApi.deleteAccount(body)
    } catch (error) {
      const wrongPassword = 'currentPassword' in body && error instanceof HttpError
        && (error.status === 400 || error.status === 401)
      if (wrongPassword) form.setError('currentPassword', { type: 'server', message: error.message })
      else setBanner(errorMessage(error))
      setBusy(false)
      return
    }
    // The server has revoked every session; drop the local one and leave the signed-in area.
    clearAuthSession()
    navigate('/account/deleted', { replace: true })
  }

  const { errors } = form.formState

  return (
    <div className="profile-modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="delete-account-modal-title">
      <div className="profile-confirm-card">
        <h3 id="delete-account-modal-title" className="profile-confirm-title">
          <AlertTriangle size={18} className="profile-danger-icon" aria-hidden="true" /> Xóa vĩnh viễn tài khoản?
        </h3>
        <ul className="profile-danger-list">
          {DELETION_CONSEQUENCES.map((item) => <li key={item}>{item}</li>)}
        </ul>

        {banner && (
          <div className="profile-form-banner-error" role="alert">
            <AlertCircle size={16} aria-hidden="true" />
            <span>{banner}</span>
          </div>
        )}

        <div className="profile-field-group">
          <label htmlFor="delete-confirm-word" className="profile-field-label">
            Nhập <strong>{DELETE_CONFIRM_WORD}</strong> để xác nhận <span className="profile-required">*</span>
          </label>
          <input
            id="delete-confirm-word"
            className="profile-input"
            autoComplete="off"
            value={confirmWord}
            onChange={(event) => setConfirmWord(event.target.value)}
            disabled={busy}
          />
        </div>

        {hasPassword ? (
          <form onSubmit={form.handleSubmit((data) => deleteWith({ currentPassword: data.currentPassword }))} noValidate>
            <div className="profile-field-group">
              <label htmlFor="delete-current-password" className="profile-field-label">
                Mật khẩu hiện tại <span className="profile-required">*</span>
              </label>
              <input
                id="delete-current-password"
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
              <Button type="submit" variant="destructive" disabled={busy || !confirmed}>
                {busy ? 'Đang xóa…' : 'Xóa vĩnh viễn'}
              </Button>
            </div>
          </form>
        ) : (
          <>
            <p className="profile-confirm-desc">Xác thực bằng tài khoản Google đã liên kết để hoàn tất.</p>
            <GoogleSignInButton
              onCredential={(idToken) => void deleteWith({ googleIdToken: idToken })}
              onError={setBanner}
              disabled={busy || !confirmed}
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
