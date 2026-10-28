import React from 'react'

interface OverviewBlockStatusProps {
  loading: boolean
  error: string | null
  onRetry: () => void
}

/** Loading and failure line of one overview block; renders nothing once the block has its data. */
export const OverviewBlockStatus: React.FC<OverviewBlockStatusProps> = ({ loading, error, onRetry }) => {
  if (error) {
    return (
      <p className="overview-block-status overview-block-error" role="alert">
        {error}{' '}
        <button type="button" className="overview-block-retry" onClick={onRetry}>Thử lại</button>
      </p>
    )
  }
  if (loading) return <p className="overview-block-status" role="status">Đang tải dữ liệu…</p>
  return null
}
