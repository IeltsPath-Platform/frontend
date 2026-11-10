import React, { useRef, useState } from 'react'
import { Camera, Trash2, Calendar, ShieldCheck, Loader2 } from 'lucide-react'
import type { LearnerProfile, UserResponse } from '../api/profileApi'
import { validateAvatarFile, AvatarUploadError } from '../api/profileApi'
import { AvatarCropDialog } from './AvatarCropDialog'
import { Button } from '@/components/ui/button'

interface ProfileHeaderProps {
  user: UserResponse | null
  profile: LearnerProfile | null
  onUploadAvatar: (file: Blob | File) => Promise<unknown>
  onDeleteAvatar: () => Promise<unknown>
  isUploadingAvatar: boolean
  onShowToast: (message: string, tone?: 'success' | 'error' | 'info') => void
}

function getInitials(name: string): string {
  if (!name.trim()) return 'HV'
  const parts = name.trim().split(/\s+/)
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

function formatMemberSince(dateStr?: string): string {
  if (!dateStr) return 'Gần đây'
  try {
    const d = new Date(dateStr)
    return `Tháng ${d.getMonth() + 1}, ${d.getFullYear()}`
  } catch {
    return 'Gần đây'
  }
}

function getRoleLabel(roleName?: string): string {
  switch (roleName?.toUpperCase()) {
    case 'ADMIN':
      return 'Quản trị viên'
    case 'CONTENT_AUTHOR':
      return 'Tác giả nội dung'
    case 'EXAMINER':
      return 'Giám khảo'
    case 'SALES_STAFF':
      return 'Tư vấn viên'
    case 'CUSTOMER':
    default:
      return 'Học viên'
  }
}

export const ProfileHeader: React.FC<ProfileHeaderProps> = ({
  user,
  profile,
  onUploadAvatar,
  onDeleteAvatar,
  isUploadingAvatar,
  onShowToast,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [isDragOver, setIsDragOver] = useState(false)
  const [cropDialogOpen, setCropDialogOpen] = useState(false)
  const [selectedImageSrc, setSelectedImageSrc] = useState<string | null>(null)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  const displayName = profile?.displayName || user?.fullName || 'Học viên'
  const primaryRole = user?.roles?.[0]?.name ?? 'CUSTOMER'
  const avatarUrl = profile?.avatarReference

  const handleFilePicked = (file: File) => {
    try {
      validateAvatarFile(file)
      const reader = new FileReader()
      reader.onload = () => {
        setSelectedImageSrc(reader.result as string)
        setCropDialogOpen(true)
      }
      reader.readAsDataURL(file)
    } catch (err) {
      if (err instanceof AvatarUploadError) {
        onShowToast(err.message, 'error')
      } else {
        onShowToast('Tệp không hợp lệ. Vui lòng chọn ảnh định dạng JPEG, PNG hoặc WebP.', 'error')
      }
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      handleFilePicked(file)
      // Reset input value so same file can be selected again
      e.target.value = ''
    }
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragOver(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragOver(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragOver(false)
    const file = e.dataTransfer.files?.[0]
    if (file) {
      handleFilePicked(file)
    }
  }

  const handleConfirmCrop = async (croppedBlob: Blob) => {
    try {
      await onUploadAvatar(croppedBlob)
      onShowToast('Cập nhật ảnh đại diện thành công!', 'success')
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Tải ảnh lên thất bại.'
      onShowToast(msg, 'error')
      throw err
    }
  }

  const handleDeleteAvatar = async () => {
    try {
      await onDeleteAvatar()
      setShowDeleteConfirm(false)
      onShowToast('Đã xóa ảnh đại diện thành công!', 'success')
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Xóa ảnh thất bại.'
      onShowToast(msg, 'error')
    }
  }

  return (
    <section className="profile-header-card" aria-label="Thông tin tổng quan hồ sơ">
      {/* Decorative dynamic top cover */}
      <div className="profile-cover-gradient" aria-hidden="true">
        <div className="profile-cover-particle profile-particle-1" />
        <div className="profile-cover-particle profile-particle-2" />
      </div>

      <div className="profile-header-content">
        {/* Avatar area with glowing ring & drop-zone */}
        <div className="profile-avatar-outer-wrap">
          <div
            className={`profile-avatar-dropzone ${isDragOver ? 'drag-active' : ''}`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            role="button"
            tabIndex={0}
            aria-label="Nhấn hoặc kéo thả ảnh để đổi ảnh đại diện"
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault()
                fileInputRef.current?.click()
              }
            }}
          >
            {/* Glowing rotating aura */}
            <span className="profile-avatar-aura" aria-hidden="true" />

            <div className="profile-avatar-inner">
              {avatarUrl ? (
                <img
                  src={avatarUrl}
                  alt={`Ảnh đại diện của ${displayName}`}
                  className="profile-avatar-img"
                  onError={(e) => {
                    // Fallback to initials if image URL fails to load
                    (e.target as HTMLElement).style.display = 'none'
                  }}
                />
              ) : (
                <div className="profile-avatar-initials" aria-hidden="true">
                  {getInitials(displayName)}
                </div>
              )}

              {/* Hover overlay with camera icon */}
              <div className="profile-avatar-overlay" aria-hidden="true">
                {isUploadingAvatar ? (
                  <Loader2 size={24} className="profile-spinner text-white" />
                ) : (
                  <>
                    <Camera size={22} className="text-white" />
                    <span className="profile-overlay-text">Đổi ảnh</span>
                  </>
                )}
              </div>
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="sr-only"
              onChange={handleInputChange}
              aria-hidden="true"
              tabIndex={-1}
            />
          </div>

          {avatarUrl && (
            <button
              type="button"
              className="profile-delete-avatar-mini-btn"
              onClick={(e) => {
                e.stopPropagation()
                setShowDeleteConfirm(true)
              }}
              aria-label="Xóa ảnh đại diện hiện tại"
              title="Xóa ảnh đại diện"
            >
              <Trash2 size={14} />
            </button>
          )}
        </div>

        {/* Identity & Badges */}
        <div className="profile-header-details">
          <div className="profile-identity-row">
            <h1 className="profile-display-name">{displayName}</h1>
            <span className="profile-role-badge">
              <ShieldCheck size={14} aria-hidden="true" />
              {getRoleLabel(primaryRole)}
            </span>
          </div>

          <p className="profile-email">{user?.email}</p>

          <div className="profile-meta-row">
            <span className="profile-member-since">
              <Calendar size={14} aria-hidden="true" />
              Thành viên từ {formatMemberSince(user?.createdAt || profile?.createdAt)}
            </span>
          </div>
        </div>
      </div>

      {/* Crop Dialog */}
      <AvatarCropDialog
        open={cropDialogOpen}
        imageSrc={selectedImageSrc}
        onClose={() => {
          setCropDialogOpen(false)
          setSelectedImageSrc(null)
        }}
        onConfirmCrop={handleConfirmCrop}
        isUploading={isUploadingAvatar}
      />

      {/* Delete Avatar Confirmation Modal */}
      {showDeleteConfirm && (
        <div
          className="profile-modal-backdrop"
          role="dialog"
          aria-modal="true"
          aria-labelledby="delete-avatar-title"
        >
          <div className="profile-confirm-card">
            <h3 id="delete-avatar-title" className="profile-confirm-title">
              Xóa ảnh đại diện?
            </h3>
            <p className="profile-confirm-desc">
              Ảnh đại diện của bạn sẽ bị gỡ bỏ và quay về chữ cái đại diện mặc định. Thao tác này không thể hoàn tác.
            </p>
            <div className="profile-confirm-actions">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setShowDeleteConfirm(false)}
                disabled={isUploadingAvatar}
              >
                Hủy
              </Button>
              <Button
                type="button"
                variant="destructive"
                onClick={handleDeleteAvatar}
                disabled={isUploadingAvatar}
              >
                {isUploadingAvatar ? 'Đang xóa…' : 'Xác nhận xóa'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </section>
  )
}

