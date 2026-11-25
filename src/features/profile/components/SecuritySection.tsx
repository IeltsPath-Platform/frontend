import React, { useState } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import { z } from 'zod'
import { Shield, KeyRound, Eye, EyeOff, Check, AlertCircle, Loader2, Link2, Unlink } from 'lucide-react'
import type { OAuthIdentity } from '../api/profileApi'
import {
  PASSWORD_MIN_LENGTH,
  PASSWORD_MAX_LENGTH,
  PASSWORD_MISMATCH_MESSAGE,
  PASSWORD_LENGTH_MESSAGE,
  PASSWORD_LENGTH_PLACEHOLDER,
  isWeakPasswordError,
  weakPasswordMessage,
} from '@/features/auth/lib/passwordRules'
import { createZodResolver } from '@/lib/zodResolver'
import { HttpError } from '@/lib/httpClient'
import { Button } from '@/components/ui/button'
import { InitialPasswordForm } from './InitialPasswordForm'
import { ReauthUnlinkDialog } from './ReauthUnlinkDialog'

const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, 'Mật khẩu hiện tại không được để trống.'),
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

type ChangePasswordFormData = z.infer<typeof changePasswordSchema>

interface SecuritySectionProps {
  oauthIdentities: OAuthIdentity[]
  hasPassword: boolean
  onChangePassword: (currentPassword: string, newPassword: string) => Promise<void>
  /** Receives the single-use token from the re-authentication step; the server checks it before unlinking. */
  onUnlinkOAuth: (provider: string, reauthToken: string) => Promise<void>
  onSetInitialPassword: (newPassword: string, reauthToken: string) => Promise<void>
  onShowToast: (message: string, tone?: 'success' | 'error' | 'info') => void
}

function calculatePasswordStrength(pass: string): { score: number; label: string; color: string } {
  if (!pass) return { score: 0, label: '', color: '' }
  let score = 0
  if (pass.length >= PASSWORD_MIN_LENGTH) score += 1
  if (pass.length >= 10) score += 1
  if (/[0-9]/.test(pass)) score += 1
  if (/[A-Z]/.test(pass) || /[^A-Za-z0-9]/.test(pass)) score += 1

  switch (score) {
    case 1:
      return { score: 1, label: 'Rất yếu', color: 'bg-red-500' }
    case 2:
      return { score: 2, label: 'Yếu', color: 'bg-orange-500' }
    case 3:
      return { score: 3, label: 'Trung bình', color: 'bg-yellow-500' }
    case 4:
    default:
      return { score: 4, label: 'Mạnh', color: 'bg-emerald-500' }
  }
}

export const SecuritySection: React.FC<SecuritySectionProps> = ({
  oauthIdentities,
  hasPassword,
  onChangePassword,
  onUnlinkOAuth,
  onSetInitialPassword,
  onShowToast,
}) => {
  const [showCurrentPass, setShowCurrentPass] = useState(false)
  const [showNewPass, setShowNewPass] = useState(false)
  const [showConfirmPass, setShowConfirmPass] = useState(false)

  const [isChangingPass, setIsChangingPass] = useState(false)
  const [passChangeSuccess, setPassChangeSuccess] = useState(false)
  const [serverPassError, setServerPassError] = useState<string | null>(null)

  const [unlinkingProvider, setUnlinkingProvider] = useState<string | null>(null)
  const [providerToUnlink, setProviderToUnlink] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    control,
    reset,
    setError,
    formState: { errors },
  } = useForm<ChangePasswordFormData>({
    resolver: createZodResolver(changePasswordSchema),
    defaultValues: {
      currentPassword: '',
      newPassword: '',
      confirmPassword: '',
    },
  })

  const newPasswordValue = useWatch({ control, name: 'newPassword', defaultValue: '' }) ?? ''
  const passwordStrength = calculatePasswordStrength(newPasswordValue)

  const handlePasswordSubmit = async (data: ChangePasswordFormData) => {
    setIsChangingPass(true)
    setServerPassError(null)
    try {
      await onChangePassword(data.currentPassword, data.newPassword)
      setPassChangeSuccess(true)
      reset()
      onShowToast('Đổi mật khẩu thành công!', 'success')
      setTimeout(() => setPassChangeSuccess(false), 2000)
    } catch (err) {
      // A weak new password is shown under its field, not as a toast.
      if (isWeakPasswordError(err)) {
        setError('newPassword', { type: 'server', message: weakPasswordMessage(err) })
        return
      }
      if (err instanceof HttpError) {
        const body = err.body as { message?: string; detail?: string } | undefined
        if (err.status === 400 || err.status === 401) {
          setServerPassError(body?.detail || body?.message || 'Mật khẩu hiện tại không chính xác.')
        } else if (err.status === 409) {
          setServerPassError('Tài khoản liên kết mạng xã hội không dùng mật khẩu.')
        } else {
          setServerPassError(body?.message || 'Không thể đổi mật khẩu. Vui lòng thử lại sau.')
        }
      } else {
        setServerPassError('Đã có lỗi xảy ra. Vui lòng kiểm tra lại kết nối mạng.')
      }
      onShowToast('Đổi mật khẩu thất bại', 'error')
    } finally {
      setIsChangingPass(false)
    }
  }

  // The dialog keeps itself open and shows the message when this rejects (for example REAUTH_REQUIRED).
  const handleUnlinkConfirmed = async (reauthToken: string) => {
    if (!providerToUnlink) return
    const provider = providerToUnlink
    setUnlinkingProvider(provider)
    try {
      await onUnlinkOAuth(provider, reauthToken)
      onShowToast(`Đã hủy liên kết tài khoản ${provider}`, 'success')
      setProviderToUnlink(null)
    } finally {
      setUnlinkingProvider(null)
    }
  }

  return (
    <section className="profile-section-card" aria-labelledby="security-title">
      <div className="profile-section-header">
        <div className="profile-section-title-wrap">
          <Shield className="profile-section-icon" aria-hidden="true" size={20} />
          <div>
            <h2 id="security-title" className="profile-section-title">
              Bảo mật tài khoản
            </h2>
            <p className="profile-section-subtitle">
              Đổi mật khẩu đăng nhập và quản lý các phương thức liên kết mạng xã hội
            </p>
          </div>
        </div>
      </div>

      <div className="profile-security-grid">
        {/* ================= PASSWORD CHANGE ================= */}
        <div className="profile-security-subcard">
          <div className="profile-subcard-header">
            <KeyRound size={18} className="profile-subcard-icon" aria-hidden="true" />
            <h3 className="profile-subcard-title">{hasPassword ? 'Đổi mật khẩu' : 'Mật khẩu tài khoản'}</h3>
          </div>

          {hasPassword ? <form onSubmit={handleSubmit(handlePasswordSubmit)} className="profile-password-form" noValidate>
            {serverPassError && (
              <div className="profile-form-banner-error" role="alert">
                <AlertCircle size={16} aria-hidden="true" />
                <span>{serverPassError}</span>
              </div>
            )}

            {/* Current Password */}
            <div className="profile-field-group">
              <label htmlFor="field-currentPass" className="profile-field-label">
                Mật khẩu hiện tại <span className="profile-required">*</span>
              </label>
              <div className="profile-input-wrapper">
                <input
                  id="field-currentPass"
                  type={showCurrentPass ? 'text' : 'password'}
                  {...register('currentPassword')}
                  className={`profile-input ${errors.currentPassword ? 'input-error' : ''}`}
                  placeholder="Nhập mật khẩu hiện tại"
                  disabled={isChangingPass}
                />
                <button
                  type="button"
                  className="profile-toggle-pass-btn"
                  onClick={() => setShowCurrentPass(!showCurrentPass)}
                  aria-label={showCurrentPass ? 'Ẩn mật khẩu hiện tại' : 'Hiện mật khẩu hiện tại'}
                >
                  {showCurrentPass ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {errors.currentPassword && (
                <span className="profile-field-error" role="alert">
                  {errors.currentPassword.message}
                </span>
              )}
            </div>

            {/* New Password */}
            <div className="profile-field-group">
              <label htmlFor="field-newPass" className="profile-field-label">
                Mật khẩu mới <span className="profile-required">*</span>
              </label>
              <div className="profile-input-wrapper">
                <input
                  id="field-newPass"
                  type={showNewPass ? 'text' : 'password'}
                  {...register('newPassword')}
                  className={`profile-input ${errors.newPassword ? 'input-error' : ''}`}
                  placeholder={PASSWORD_LENGTH_PLACEHOLDER}
                  disabled={isChangingPass}
                />
                <button
                  type="button"
                  className="profile-toggle-pass-btn"
                  onClick={() => setShowNewPass(!showNewPass)}
                  aria-label={showNewPass ? 'Ẩn mật khẩu mới' : 'Hiện mật khẩu mới'}
                >
                  {showNewPass ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {errors.newPassword && (
                <span className="profile-field-error" role="alert">
                  {errors.newPassword.message}
                </span>
              )}

              {/* Password strength bar */}
              {newPasswordValue.length > 0 && (
                <div className="profile-strength-box" aria-live="polite">
                  <div className="profile-strength-bars">
                    {[1, 2, 3, 4].map((step) => (
                      <span
                        key={step}
                        className={`profile-strength-seg ${
                          step <= passwordStrength.score ? passwordStrength.color : 'bg-slate-200'
                        }`}
                      />
                    ))}
                  </div>
                  <span className="profile-strength-label">
                    Độ mạnh: <strong>{passwordStrength.label}</strong>
                  </span>
                </div>
              )}
            </div>

            {/* Confirm New Password */}
            <div className="profile-field-group">
              <label htmlFor="field-confirmPass" className="profile-field-label">
                Xác nhận mật khẩu mới <span className="profile-required">*</span>
              </label>
              <div className="profile-input-wrapper">
                <input
                  id="field-confirmPass"
                  type={showConfirmPass ? 'text' : 'password'}
                  {...register('confirmPassword')}
                  className={`profile-input ${errors.confirmPassword ? 'input-error' : ''}`}
                  placeholder="Nhập lại mật khẩu mới"
                  disabled={isChangingPass}
                />
                <button
                  type="button"
                  className="profile-toggle-pass-btn"
                  onClick={() => setShowConfirmPass(!showConfirmPass)}
                  aria-label={showConfirmPass ? 'Ẩn xác nhận mật khẩu' : 'Hiện xác nhận mật khẩu'}
                >
                  {showConfirmPass ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {errors.confirmPassword && (
                <span className="profile-field-error" role="alert">
                  {errors.confirmPassword.message}
                </span>
              )}
            </div>

            <Button
              type="submit"
              disabled={isChangingPass}
              className={`profile-change-pass-btn ${passChangeSuccess ? 'btn-success' : ''}`}
            >
              {isChangingPass ? (
                <>
                  <Loader2 size={16} className="profile-spinner" aria-hidden="true" />
                  Đang đổi mật khẩu…
                </>
              ) : passChangeSuccess ? (
                <>
                  <Check size={16} aria-hidden="true" />
                  Đổi mật khẩu thành công!
                </>
              ) : (
                'Cập nhật mật khẩu'
              )}
            </Button>
          </form> : (
            <InitialPasswordForm onSetInitialPassword={onSetInitialPassword} onShowToast={onShowToast} />
          )}
        </div>

        {/* ================= OAUTH IDENTITIES ================= */}
        <div className="profile-security-subcard">
          <div className="profile-subcard-header">
            <Link2 size={18} className="profile-subcard-icon" aria-hidden="true" />
            <h3 className="profile-subcard-title">Tài khoản liên kết</h3>
          </div>

          <p className="profile-oauth-desc">
            Bạn có thể đăng nhập nhanh chóng bằng các tài khoản mạng xã hội đã được kết nối dưới đây.
          </p>

          <div className="profile-oauth-list">
            {/* Google item */}
            {(() => {
              const googleIdentity = oauthIdentities.find(
                (item) => item.provider.toLowerCase() === 'google'
              )
              return (
                <div className="profile-oauth-item">
                  <div className="profile-oauth-brand">
                    <span className="profile-oauth-logo google-logo" aria-hidden="true">
                      G
                    </span>
                    <div>
                      <strong className="profile-oauth-name">Google</strong>
                      <span className="profile-oauth-status">
                        {googleIdentity ? 'Đã liên kết' : 'Chưa liên kết'}
                      </span>
                    </div>
                  </div>

                  {googleIdentity && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setProviderToUnlink(googleIdentity.provider)}
                      disabled={unlinkingProvider === googleIdentity.provider}
                      className="profile-unlink-btn"
                    >
                      <Unlink size={14} aria-hidden="true" />
                      Gỡ liên kết
                    </Button>
                  )}
                </div>
              )
            })()}

            {/* If other providers */}
            {oauthIdentities
              .filter((item) => item.provider.toLowerCase() !== 'google')
              .map((item) => (
                <div key={item.id} className="profile-oauth-item">
                  <div className="profile-oauth-brand">
                    <span className="profile-oauth-logo" aria-hidden="true">
                      {item.provider.charAt(0).toUpperCase()}
                    </span>
                    <div>
                      <strong className="profile-oauth-name">{item.provider}</strong>
                      <span className="profile-oauth-status">Đã liên kết</span>
                    </div>
                  </div>

                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setProviderToUnlink(item.provider)}
                    disabled={unlinkingProvider === item.provider}
                    className="profile-unlink-btn"
                  >
                    <Unlink size={14} aria-hidden="true" />
                    Gỡ liên kết
                  </Button>
                </div>
              ))}
          </div>
        </div>
      </div>

      {/* Unlink Confirmation Modal */}
      {providerToUnlink && (
        <ReauthUnlinkDialog
          provider={providerToUnlink}
          hasPassword={hasPassword}
          onConfirmed={handleUnlinkConfirmed}
          onCancel={() => setProviderToUnlink(null)}
        />
      )}
    </section>
  )
}

