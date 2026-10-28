import React, { useState } from 'react'
import { AlertTriangle, Trash2, Loader2 } from 'lucide-react'
import type { LearnerProfile } from '../api/profileApi'
import { Button } from '@/components/ui/button'

interface DangerZoneSectionProps {
  profile: LearnerProfile | null
  onDeleteAvatar: () => Promise<unknown>
  isDeleting: boolean
  onShowToast: (message: string, tone?: 'success' | 'error' | 'info') => void
}

export const DangerZoneSection: React.FC<DangerZoneSectionProps> = ({
  profile,
  onDeleteAvatar,
  isDeleting,
  onShowToast,
}) => {
  const [showConfirm, setShowConfirm] = useState(false)
  const hasAvatar = Boolean(profile?.avatarReference)

  const handleConfirmDelete = async () => {
    try {
      await onDeleteAvatar()
      setShowConfirm(false)
      onShowToast('Đã xóa ảnh đại diện thành công!', 'success')
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Xóa ảnh đại diện thất bại.'
      onShowToast(msg, 'error')
    }
  }

  return (
    <section className="profile-section-card profile-danger-card" aria-labelledby="danger-zone-title">
      <div className="profile-section-header">
        <div className="profile-section-title-wrap">
          <AlertTriangle className="profile-section-icon danger-icon" aria-hidden="true" size={20} />
          <div>
            <h2 id="danger-zone-title" className="profile-section-title danger-title">
              Vùng quản lý nâng cao
            </h2>
            <p className="profile-section-subtitle">
              Các thao tác có ảnh hưởng trực tiếp đến dữ liệu hiển thị hồ sơ cá nhân
            </p>
          </div>
        </div>
      </div>

      <div className="profile-danger-item">
        <div className="profile-danger-item-info">
          <strong className="profile-danger-item-title">Xóa ảnh đại diện hiện tại</strong>
          <p className="profile-danger-item-desc">
            Gỡ bỏ ảnh đại diện được lưu trữ trên hệ thống và quay lại avatar chữ cái mặc định.
          </p>
        </div>

        <Button
          type="button"
          variant="destructive"
          onClick={() => setShowConfirm(true)}
          disabled={!hasAvatar || isDeleting}
          className="profile-danger-action-btn"
        >
          {isDeleting ? (
            <>
              <Loader2 size={16} className="profile-spinner" aria-hidden="true" />
              Đang xóa…
            </>
          ) : (
            <>
              <Trash2 size={16} aria-hidden="true" />
              Xóa ảnh đại diện
            </>
          )}
        </Button>
      </div>

      {/* Confirmation Dialog */}
      {showConfirm && (
        <div
          className="profile-modal-backdrop"
          role="dialog"
          aria-modal="true"
          aria-labelledby="danger-confirm-title"
        >
          <div className="profile-confirm-card">
            <h3 id="danger-confirm-title" className="profile-confirm-title">
              Xác nhận xóa ảnh đại diện?
            </h3>
            <p className="profile-confirm-desc">
              Ảnh đại diện của bạn sẽ bị gỡ bỏ vĩnh viễn khỏi hệ thống lưu trữ. Thao tác này không thể hoàn tác.
            </p>
            <div className="profile-confirm-actions">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setShowConfirm(false)}
                disabled={isDeleting}
              >
                Hủy
              </Button>
              <Button
                type="button"
                variant="destructive"
                onClick={handleConfirmDelete}
                disabled={isDeleting}
              >
                {isDeleting ? 'Đang xóa…' : 'Xác nhận xóa'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </section>
  )
}

