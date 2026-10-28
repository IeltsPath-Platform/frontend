import React, { useState, useEffect, useMemo } from 'react'
import { useForm, Controller, useWatch } from 'react-hook-form'
import { z } from 'zod'
import { Edit3, Check, Loader2, RotateCcw, AlertCircle, User, Phone, Globe, BookOpen } from 'lucide-react'
import { motion, AnimatePresence } from 'motion/react'
import type { LearnerProfile, UserResponse } from '../api/profileApi'
import type { SavePersonalInfoInput, SavePersonalInfoResult } from '../hooks/useProfile'
import { createZodResolver } from '@/lib/zodResolver'
import { Button } from '@/components/ui/button'

const phoneRegex = /^$|^(\+?84|0)(3|5|7|8|9)[0-9]{8}$/

const personalInfoSchema = z.object({
  displayName: z
    .string()
    .min(1, 'Tên hiển thị không được để trống')
    .max(100, 'Tên hiển thị không được vượt quá 100 ký tự'),
  fullName: z
    .string()
    .min(1, 'Họ và tên không được để trống')
    .max(150, 'Họ và tên không được vượt quá 150 ký tự'),
  phoneNumber: z
    .string()
    .refine((val) => phoneRegex.test(val.trim()), {
      message: 'Số điện thoại không đúng định dạng Việt Nam (ví dụ 0912345678 hoặc +84912345678)',
    }),
  bio: z
    .string()
    .max(1000, 'Tiểu sử không được vượt quá 1000 ký tự'),
  timezone: z.string().max(50, 'Múi giờ không hợp lệ'),
  selfReportedBand: z.number().min(0).max(9),
})

type PersonalInfoFormData = z.infer<typeof personalInfoSchema>

interface PersonalInfoSectionProps {
  user: UserResponse | null
  profile: LearnerProfile | null
  onSave: (data: SavePersonalInfoInput) => Promise<SavePersonalInfoResult>
  onShowToast: (message: string, tone?: 'success' | 'error' | 'info') => void
}

export const PersonalInfoSection: React.FC<PersonalInfoSectionProps> = ({
  user,
  profile,
  onSave,
  onShowToast,
}) => {
  const [isEditing, setIsEditing] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [saveSuccess, setSaveSuccess] = useState(false)
  const [serverPhoneError, setServerPhoneError] = useState<string | null>(null)
  const [serverGeneralError, setServerGeneralError] = useState<string | null>(null)

  // System timezones
  const timezones = useMemo(() => {
    try {
      if (typeof Intl !== 'undefined' && 'supportedValuesOf' in Intl) {
        return Intl.supportedValuesOf('timeZone')
      }
    } catch {
      // Fallback below
    }
    return [
      'Asia/Ho_Chi_Minh',
      'Asia/Bangkok',
      'Asia/Singapore',
      'Asia/Tokyo',
      'Asia/Seoul',
      'Australia/Sydney',
      'Europe/London',
      'Europe/Paris',
      'America/New_York',
      'America/Los_Angeles',
      'UTC',
    ]
  }, [])

  const defaultValues: PersonalInfoFormData = useMemo(() => ({
    displayName: profile?.displayName || user?.fullName || '',
    fullName: user?.fullName || '',
    phoneNumber: user?.phoneNumber || '',
    bio: profile?.bio || '',
    timezone: profile?.timezone || 'Asia/Ho_Chi_Minh',
    selfReportedBand: profile?.selfReportedBand != null ? Number(profile.selfReportedBand) : 0,
  }), [profile, user])

  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors, isDirty },
  } = useForm<PersonalInfoFormData>({
    resolver: createZodResolver(personalInfoSchema),
    defaultValues,
  })

  // Synchronize form when user or profile data updates while not editing
  useEffect(() => {
    if (!isEditing) {
      reset(defaultValues)
    }
  }, [defaultValues, isEditing, reset])

  // Warn before leaving if unsaved changes
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isEditing && isDirty) {
        e.preventDefault()
        e.returnValue = ''
      }
    }
    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [isEditing, isDirty])

  const watchedBio = useWatch({ control, name: 'bio', defaultValue: '' }) ?? ''
  const watchedBand = useWatch({ control, name: 'selfReportedBand', defaultValue: 0 }) ?? 0

  const handleFormSubmit = async (data: PersonalInfoFormData) => {
    setIsSaving(true)
    setServerPhoneError(null)
    setServerGeneralError(null)
    try {
      const result = await onSave({
        fullName: data.fullName,
        phoneNumber: data.phoneNumber,
        displayName: data.displayName,
        bio: data.bio,
        timezone: data.timezone,
        selfReportedBand: data.selfReportedBand > 0 ? data.selfReportedBand : null,
      })

      if (result.userUpdated && result.profileUpdated) {
        setSaveSuccess(true)
        onShowToast('Cập nhật thông tin cá nhân thành công!', 'success')
        setTimeout(() => {
          setSaveSuccess(false)
          setIsEditing(false)
        }, 1200)
      } else if (result.fieldErrors?.phoneNumber) {
        setServerPhoneError(result.fieldErrors.phoneNumber)
        if (result.errorMessage) {
          onShowToast(result.errorMessage, 'error')
        }
      } else if (result.errorMessage) {
        setServerGeneralError(result.errorMessage)
        onShowToast(result.errorMessage, 'error')
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Lỗi khi lưu thông tin.'
      setServerGeneralError(msg)
      onShowToast(msg, 'error')
    } finally {
      setIsSaving(false)
    }
  }

  const handleCancel = () => {
    if (isDirty) {
      const confirmDiscard = window.confirm('Bạn có thay đổi chưa lưu. Bạn có chắc muốn hủy không?')
      if (!confirmDiscard) return
    }
    reset(defaultValues)
    setServerPhoneError(null)
    setServerGeneralError(null)
    setIsEditing(false)
  }

  return (
    <section className="profile-section-card" aria-labelledby="personal-info-title">
      <div className="profile-section-header">
        <div className="profile-section-title-wrap">
          <User className="profile-section-icon" aria-hidden="true" size={20} />
          <div>
            <h2 id="personal-info-title" className="profile-section-title">
              Thông tin cá nhân
            </h2>
            <p className="profile-section-subtitle">
              Quản lý họ tên, số điện thoại, tiểu sử và mục tiêu tự đánh giá của bạn
            </p>
          </div>
        </div>

        {!isEditing && (
          <Button
            type="button"
            variant="outline"
            className="profile-edit-toggle-btn"
            onClick={() => setIsEditing(true)}
          >
            <Edit3 size={15} aria-hidden="true" />
            <span>Chỉnh sửa</span>
          </Button>
        )}
      </div>

      <AnimatePresence mode="wait">
        {!isEditing ? (
          /* ================= VIEW MODE ================= */
          <motion.div
            key="view-mode"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.2 }}
            className="profile-info-grid"
          >
            <div className="profile-info-item">
              <span className="profile-info-label">Tên hiển thị (Nickname)</span>
              <strong className="profile-info-value">{profile?.displayName || 'Chưa đặt'}</strong>
            </div>

            <div className="profile-info-item">
              <span className="profile-info-label">Họ và tên đầy đủ</span>
              <strong className="profile-info-value">{user?.fullName || 'Chưa cập nhật'}</strong>
            </div>

            <div className="profile-info-item">
              <span className="profile-info-label">Số điện thoại</span>
              <strong className="profile-info-value">{user?.phoneNumber || 'Chưa liên kết'}</strong>
            </div>

            <div className="profile-info-item">
              <span className="profile-info-label">Múi giờ</span>
              <strong className="profile-info-value">{profile?.timezone || 'Asia/Ho_Chi_Minh'}</strong>
            </div>

            <div className="profile-info-item">
              <span className="profile-info-label">Band điểm tự khai</span>
              <strong className="profile-info-value">
                {profile?.selfReportedBand != null ? `IELTS ${Number(profile.selfReportedBand).toFixed(1)}` : 'Chưa đặt'}
              </strong>
            </div>

            <div className="profile-info-item full-width">
              <span className="profile-info-label">Tiểu sử (Bio)</span>
              <p className="profile-info-bio">
                {profile?.bio?.trim() || 'Chưa có thông tin giới thiệu bản thân.'}
              </p>
            </div>
          </motion.div>
        ) : (
          /* ================= EDIT MODE ================= */
          <motion.form
            key="edit-mode"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.2 }}
            onSubmit={handleSubmit(handleFormSubmit)}
            className="profile-edit-form"
            noValidate
          >
            {serverGeneralError && (
              <div className="profile-form-banner-error" role="alert">
                <AlertCircle size={16} aria-hidden="true" />
                <span>{serverGeneralError}</span>
              </div>
            )}

            <div className="profile-form-grid">
              {/* Display Name */}
              <div className="profile-field-group">
                <label htmlFor="field-displayName" className="profile-field-label">
                  Tên hiển thị <span className="profile-required">*</span>
                </label>
                <div className="profile-input-wrapper">
                  <User size={16} className="profile-input-icon" aria-hidden="true" />
                  <input
                    id="field-displayName"
                    type="text"
                    {...register('displayName')}
                    className={`profile-input ${errors.displayName ? 'input-error' : ''}`}
                    placeholder="Ví dụ: Alex Nguyễn"
                    disabled={isSaving}
                  />
                </div>
                {errors.displayName && (
                  <span className="profile-field-error" role="alert">
                    {errors.displayName.message}
                  </span>
                )}
              </div>

              {/* Full Name */}
              <div className="profile-field-group">
                <label htmlFor="field-fullName" className="profile-field-label">
                  Họ và tên đầy đủ <span className="profile-required">*</span>
                </label>
                <div className="profile-input-wrapper">
                  <User size={16} className="profile-input-icon" aria-hidden="true" />
                  <input
                    id="field-fullName"
                    type="text"
                    {...register('fullName')}
                    className={`profile-input ${errors.fullName ? 'input-error' : ''}`}
                    placeholder="Ví dụ: Nguyễn Văn Alex"
                    disabled={isSaving}
                  />
                </div>
                {errors.fullName && (
                  <span className="profile-field-error" role="alert">
                    {errors.fullName.message}
                  </span>
                )}
              </div>

              {/* Phone Number */}
              <div className="profile-field-group">
                <label htmlFor="field-phoneNumber" className="profile-field-label">
                  Số điện thoại
                </label>
                <div className="profile-input-wrapper">
                  <Phone size={16} className="profile-input-icon" aria-hidden="true" />
                  <input
                    id="field-phoneNumber"
                    type="tel"
                    {...register('phoneNumber')}
                    className={`profile-input ${errors.phoneNumber || serverPhoneError ? 'input-error' : ''}`}
                    placeholder="0912345678"
                    disabled={isSaving}
                  />
                </div>
                {(errors.phoneNumber?.message || serverPhoneError) && (
                  <span className="profile-field-error" role="alert">
                    {errors.phoneNumber?.message || serverPhoneError}
                  </span>
                )}
              </div>

              {/* Timezone */}
              <div className="profile-field-group">
                <label htmlFor="field-timezone" className="profile-field-label">
                  Múi giờ
                </label>
                <div className="profile-input-wrapper">
                  <Globe size={16} className="profile-input-icon" aria-hidden="true" />
                  <select
                    id="field-timezone"
                    {...register('timezone')}
                    className="profile-select"
                    disabled={isSaving}
                  >
                    {timezones.map((tz) => (
                      <option key={tz} value={tz}>
                        {tz}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Self-reported Band Slider */}
              <div className="profile-field-group full-width">
                <div className="profile-band-slider-header">
                  <label htmlFor="field-selfReportedBand" className="profile-field-label">
                    <BookOpen size={16} aria-hidden="true" className="inline mr-1" />
                    Band điểm tự khai: <strong>{watchedBand > 0 ? `IELTS ${Number(watchedBand).toFixed(1)}` : 'Chưa đặt (0.0)'}</strong>
                  </label>
                  <span className="profile-slider-hint">Kéo slider để chọn band từ 0.0 đến 9.0</span>
                </div>
                <div className="profile-slider-wrapper">
                  <Controller
                    name="selfReportedBand"
                    control={control}
                    render={({ field }) => (
                      <div className="profile-slider-track-box">
                        <input
                          id="field-selfReportedBand"
                          type="range"
                          min={0}
                          max={9}
                          step={0.5}
                          value={field.value}
                          onChange={(e) => field.onChange(Number(e.target.value))}
                          className="profile-range-slider"
                          disabled={isSaving}
                          aria-valuemin={0}
                          aria-valuemax={9}
                          aria-valuenow={field.value}
                          aria-valuetext={`Band điểm tự khai ${field.value}`}
                        />
                        <div className="profile-slider-scale">
                          <span>0</span>
                          <span>3.0</span>
                          <span>5.0</span>
                          <span>6.5</span>
                          <span>7.5</span>
                          <span>9.0</span>
                        </div>
                      </div>
                    )}
                  />
                </div>
              </div>

              {/* Bio with counter */}
              <div className="profile-field-group full-width">
                <div className="profile-bio-header">
                  <label htmlFor="field-bio" className="profile-field-label">
                    Tiểu sử
                  </label>
                  <span
                    className={`profile-char-counter ${watchedBio.length > 900 ? 'counter-warn' : ''}`}
                  >
                    {watchedBio.length} / 1000
                  </span>
                </div>
                <textarea
                  id="field-bio"
                  {...register('bio')}
                  rows={4}
                  className={`profile-textarea ${errors.bio ? 'input-error' : ''}`}
                  placeholder="Chia sẻ đôi nét về bản thân, kinh nghiệm học IELTS hoặc mục tiêu sắp tới của bạn…"
                  disabled={isSaving}
                />
                {errors.bio && (
                  <span className="profile-field-error" role="alert">
                    {errors.bio.message}
                  </span>
                )}
              </div>
            </div>

            {/* Form Action Buttons */}
            <div className="profile-form-actions">
              <Button
                type="button"
                variant="ghost"
                onClick={handleCancel}
                disabled={isSaving}
                className="profile-cancel-btn"
              >
                <RotateCcw size={16} aria-hidden="true" />
                Hủy thay đổi
              </Button>

              <Button
                type="submit"
                disabled={isSaving}
                className={`profile-save-btn ${saveSuccess ? 'save-btn-success' : ''}`}
              >
                {isSaving ? (
                  <>
                    <Loader2 size={16} className="profile-spinner" aria-hidden="true" />
                    Đang lưu…
                  </>
                ) : saveSuccess ? (
                  <>
                    <Check size={16} className="profile-check-anim" aria-hidden="true" />
                    Đã lưu thành công!
                  </>
                ) : (
                  'Lưu thay đổi'
                )}
              </Button>
            </div>
          </motion.form>
        )}
      </AnimatePresence>
    </section>
  )
}
