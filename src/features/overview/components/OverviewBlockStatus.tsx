import React from 'react'
import { CircleAlert } from 'lucide-react'

interface OverviewBlockStatusProps {
  loading: boolean
  error: string | null
  onRetry: () => void
}

/** Loading and failure line of one overview block; renders nothing once the block has its data. */
export const OverviewBlockStatus: React.FC<OverviewBlockStatusProps> = ({ loading, error, onRetry }) => {
  if (error) {
    return (
      <div className="overview-block-status overview-block-error" role="alert">
        <CircleAlert size={18} aria-hidden="true" />
        <span>Chưa thể tải dữ liệu. Vui lòng thử lại.</span>
        <button type="button" className="overview-block-retry" onClick={onRetry}>Thử lại</button>
      </div>
    )
  }
  if (loading) return <p className="overview-block-status" role="status">Đang tải dữ liệu…</p>
  return null
}
