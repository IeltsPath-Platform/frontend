import React from 'react'

export const ProfileSkeleton: React.FC = () => {
  return (
    <div className="profile-skeleton-root" role="status" aria-label="Đang tải dữ liệu hồ sơ cá nhân…">
      {/* Header skeleton */}
      <div className="profile-skeleton-header">
        <div className="profile-skeleton-cover shimmer" />
        <div className="profile-skeleton-header-body">
          <div className="profile-skeleton-avatar shimmer" />
          <div className="profile-skeleton-details">
            <div className="profile-skeleton-line title shimmer" />
            <div className="profile-skeleton-line subtitle shimmer" />
            <div className="profile-skeleton-chips">
              <div className="profile-skeleton-chip shimmer" />
              <div className="profile-skeleton-chip shimmer" />
              <div className="profile-skeleton-chip shimmer" />
            </div>
          </div>
        </div>
      </div>

      {/* Cards skeleton */}
      <div className="profile-skeleton-card shimmer" />
      <div className="profile-skeleton-card shimmer" />
      <div className="profile-skeleton-card shimmer" />
    </div>
  )
}
