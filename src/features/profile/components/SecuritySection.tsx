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
} from '@/features/auth/lib/passwordRules'
import { createZodResolver } from '@/lib/zodResolver'
import { HttpError } from '@/lib/httpClient'
import { Button } from '@/components/ui/button'

const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, 'Vui lòng nhập mật khẩu hiện tại'),
    newPassword: z
      .string()
      .min(PASSWORD_MIN_LENGTH, PASSWORD_LENGTH_MESSAGE)
      .max(PASSWORD_MAX_LENGTH, PASSWORD_LENGTH_MESSAGE),
    confirmPassword: z.string().min(1, 'Vui lòng xác nhận mật khẩu mới'),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: PASSWORD_MISMATCH_MESSAGE,
    path: ['confirmPassword'],
  })

type ChangePasswordFormData = z.infer<typeof changePasswordSchema>

interface SecuritySectionProps {
  oauthIdentities: OAuthIdentity[]
  onChangePassword: (currentPassword: string, newPassword: string) => Promise<void>
  onUnlinkOAuth: (provider: string) => Promise<void>
  onShowToast: (message: string, tone?: 'success' | 'error' | 'info') => void
}

function calculatePasswordStrength(pass: string): { score: number; label: string; color: string } {
  if (!pass) return { score: 0, label: '', color: '' }
  let score = 0
  if (pass.length >= 6) score += 1
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
  onChangePassword,
  onUnlinkOAuth,
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

  const handleConfirmUnlink = async () => {
    if (!providerToUnlink) return
    setUnlinkingProvider(providerToUnlink)
    try {
      await onUnlinkOAuth(providerToUnlink)
      onShowToast(`Đã hủy liên kết tài khoản ${providerToUnlink}`, 'success')
      setProviderToUnlink(null)
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Hủy liên kết thất bại.'
      onShowToast(msg, 'error')
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
            <h3 className="profile-subcard-title">Đổi mật khẩu</h3>
          </div>

          <form onSubmit={handleSubmit(handlePasswordSubmit)} className="profile-password-form" noValidate>
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
                  placeholder="Từ 6 đến 72 ký tự"
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
          </form>
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
        <div
          className="profile-modal-backdrop"
          role="dialog"
          aria-modal="true"
          aria-labelledby="unlink-modal-title"
        >
          <div className="profile-confirm-card">
            <h3 id="unlink-modal-title" className="profile-confirm-title">
              Hủy liên kết tài khoản {providerToUnlink}?
            </h3>
            <p className="profile-confirm-desc">
              Sau khi hủy liên kết, bạn sẽ không thể dùng tài khoản {providerToUnlink} này để đăng nhập trực tiếp. Hãy đảm bảo bạn nhớ mật khẩu tài khoản để đăng nhập lại.
            </p>
            <div className="profile-confirm-actions">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setProviderToUnlink(null)}
                disabled={unlinkingProvider !== null}
              >
                Hủy
              </Button>
              <Button
                type="button"
                variant="destructive"
                onClick={handleConfirmUnlink}
                disabled={unlinkingProvider !== null}
              >
                {unlinkingProvider !== null ? 'Đang gỡ…' : 'Xác nhận gỡ'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </section>
  )
}
