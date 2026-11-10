import React, { useState } from 'react'
import { Eye } from 'lucide-react'
import type { LearnerProfile, ProfileVisibilityChoice } from '../api/profileApi'

interface PrivacySectionProps {
  profile: LearnerProfile | null
  onUpdateVisibility: (visibility: ProfileVisibilityChoice) => Promise<unknown>
  onShowToast: (message: string, tone?: 'success' | 'error' | 'info') => void
}

export const PrivacySection: React.FC<PrivacySectionProps> = ({
  profile,
  onUpdateVisibility,
  onShowToast,
}) => {
  const isPublic = (profile?.visibility ?? 'PUBLIC') === 'PUBLIC'
  const [updating, setUpdating] = useState(false)

  const handleToggle = async () => {
    if (updating) return
    const next: ProfileVisibilityChoice = isPublic ? 'PRIVATE' : 'PUBLIC'
    setUpdating(true)
    try {
      await onUpdateVisibility(next)
      onShowToast(next === 'PUBLIC' ? 'Đã công khai hồ sơ' : 'Đã chuyển hồ sơ sang riêng tư', 'success')
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Lỗi cập nhật quyền riêng tư.'
      onShowToast(msg, 'error')
    } finally {
      setUpdating(false)
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

      <div className="profile-privacy-row">
        <div className="profile-privacy-text">
          <strong id="privacy-switch-label">Công khai hồ sơ</strong>
          <p id="privacy-switch-desc">
            {isPublic
              ? 'Đang bật: học viên đã đăng nhập có thể xem tên, ảnh đại diện, tiểu sử và mục tiêu của bạn.'
              : 'Đang tắt: chỉ riêng bạn xem được thông tin và tiến độ học tập của mình.'}
          </p>
        </div>
        <button
          type="button"
          role="switch"
          className="profile-switch"
          aria-checked={isPublic}
          aria-labelledby="privacy-switch-label"
          aria-describedby="privacy-switch-desc"
          disabled={updating}
          onClick={() => void handleToggle()}
        />
      </div>
    </section>
  )
}
