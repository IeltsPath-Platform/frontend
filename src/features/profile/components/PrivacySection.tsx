import React, { useState } from 'react'
import { Eye, Users, Lock, Check, Loader2 } from 'lucide-react'
import type { LearnerProfile } from '../api/profileApi'

interface PrivacySectionProps {
  profile: LearnerProfile | null
  onUpdateVisibility: (visibility: 'PUBLIC' | 'COMMUNITY' | 'PRIVATE') => Promise<unknown>
  onShowToast: (message: string, tone?: 'success' | 'error' | 'info') => void
}

interface PrivacyOption {
  value: 'PUBLIC' | 'COMMUNITY' | 'PRIVATE'
  title: string
  description: string
  icon: React.ElementType
}

const privacyOptions: PrivacyOption[] = [
  {
    value: 'PUBLIC',
    title: 'Công khai (Public)',
    description: 'Bất kỳ ai trên Internet đều có thể xem hồ sơ, band điểm và mục tiêu của bạn.',
    icon: Eye,
  },
  {
    value: 'COMMUNITY',
    title: 'Cộng đồng (Community)',
    description: 'Chỉ các học viên đã đăng nhập trên IeltsPath mới có thể xem thông tin hồ sơ của bạn.',
    icon: Users,
  },
  {
    value: 'PRIVATE',
    title: 'Riêng tư (Private)',
    description: 'Chỉ riêng bạn mới có quyền xem thông tin chi tiết và tiến độ học tập của mình.',
    icon: Lock,
  },
]

export const PrivacySection: React.FC<PrivacySectionProps> = ({
  profile,
  onUpdateVisibility,
  onShowToast,
}) => {
  const currentVisibility = profile?.visibility ?? 'PUBLIC'
  const [updatingValue, setUpdatingValue] = useState<string | null>(null)

  const handleSelectVisibility = async (value: 'PUBLIC' | 'COMMUNITY' | 'PRIVATE') => {
    if (value === currentVisibility || updatingValue !== null) return
    setUpdatingValue(value)
    try {
      await onUpdateVisibility(value)
      onShowToast(`Đã chuyển quyền riêng tư sang "${value}"`, 'success')
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Lỗi cập nhật quyền riêng tư.'
      onShowToast(msg, 'error')
    } finally {
      setUpdatingValue(null)
    }
  }

  return (
    <section className="profile-section-card" aria-labelledby="privacy-title">
      <div className="profile-section-header">
        <div className="profile-section-title-wrap">
          <Eye className="profile-section-icon" aria-hidden="true" size={20} />
          <div>
            <h2 id="privacy-title" className="profile-section-title">
              Quyền riêng tư hồ sơ
            </h2>
            <p className="profile-section-subtitle">
              Kiểm soát ai có thể nhìn thấy hồ sơ cá nhân và hoạt động học tập của bạn
            </p>
          </div>
        </div>
      </div>

      <div className="profile-privacy-grid" role="radiogroup" aria-label="Lựa chọn mức độ hiển thị hồ sơ">
        {privacyOptions.map((opt) => {
          const Icon = opt.icon
          const isSelected = currentVisibility === opt.value
          const isPending = updatingValue === opt.value

          return (
            <div
              key={opt.value}
              className={`profile-privacy-card ${isSelected ? 'privacy-active' : ''}`}
              onClick={() => handleSelectVisibility(opt.value)}
              role="radio"
              aria-checked={isSelected}
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault()
                  void handleSelectVisibility(opt.value)
                }
              }}
            >
              <div className="profile-privacy-top">
                <span className="profile-privacy-icon-box">
                  <Icon size={20} aria-hidden="true" />
                </span>
                <span className="profile-privacy-radio-circle">
                  {isPending ? (
                    <Loader2 size={16} className="profile-spinner text-primary" aria-hidden="true" />
                  ) : isSelected ? (
                    <Check size={16} aria-hidden="true" />
                  ) : null}
                </span>
              </div>

              <h3 className="profile-privacy-card-title">{opt.title}</h3>
              <p className="profile-privacy-card-desc">{opt.description}</p>
            </div>
          )
        })}
      </div>
    </section>
  )
}
