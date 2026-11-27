import { useState, type FormEvent } from 'react'
import { z } from 'zod'
import { isWeakPasswordError, PASSWORD_LENGTH_MESSAGE, PASSWORD_MAX_LENGTH, PASSWORD_MIN_LENGTH, weakPasswordMessage } from '@/features/auth/lib/passwordRules'
import { useFormErrors } from '@/lib/validation/useFormErrors'
import { AdminField } from '../../components/AdminField'
import { useAdminError } from '../../lib/useAdminError'
import { resetUserPassword } from '../api/userAdminApi'
import { userAdminErrorText } from '../lib/userErrors'
import type { User } from '../types'

const resetPasswordSchema = z.object({
  newPassword: z.string()
    .min(1, 'Mật khẩu mới không được để trống.')
    .min(PASSWORD_MIN_LENGTH, PASSWORD_LENGTH_MESSAGE)
    .max(PASSWORD_MAX_LENGTH, PASSWORD_LENGTH_MESSAGE),
})

/** Sets a new password for another user who cannot sign in. The server signs them out and e-mails them. */
export function ResetPasswordForm({ user, onCancel, onDone }: {
  user: User
  onCancel: () => void
  onDone: (message: string) => void
}) {
  const [newPassword, setNewPassword] = useState('')
  const [, setError] = useAdminError()
  const [saving, setSaving] = useState(false)
  const form = useFormErrors(resetPasswordSchema, { newPassword })

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)
    if (!form.validate()) return
    setSaving(true)
    try {
      await resetUserPassword(user.id, newPassword)
      onDone(`Đã đặt lại mật khẩu cho ${user.email}.`)
    } catch (reason) {
      setError(isWeakPasswordError(reason) ? weakPasswordMessage(reason) : userAdminErrorText(reason))
      setSaving(false)
    }
  }

  return (
    <form className="um-form" noValidate onSubmit={(event) => void submit(event)}>
      <AdminField label="Mật khẩu mới" {...form.field('newPassword')}>
        <input autoComplete="new-password" className="adm-input" maxLength={PASSWORD_MAX_LENGTH} onChange={(event) => setNewPassword(event.target.value)} type="password" value={newPassword} />
      </AdminField>
      <div className="adm-form-footer">
        <button className="adm-btn" disabled={saving} onClick={onCancel} type="button">Đóng</button>
        <button className="adm-btn adm-btn--primary" disabled={saving} type="submit">{saving ? 'Đang lưu…' : 'Lưu'}</button>
      </div>
    </form>
  )
}
