import { CalendarClock, RotateCcw } from 'lucide-react'
import { Link } from 'react-router-dom'
import { learningApi } from '../api'
import { useApiResource } from '../lib/useApiResource'

function dateLabel(value: string) {
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? null : date.toLocaleString('vi-VN', { dateStyle: 'short', timeStyle: 'short' })
}

export function PlacementRetakeEntry() {
  const resource = useApiResource('placement-retake-entry', () => learningApi.getPlacementOptions())
  if (resource.status === 'loading') return <p className="pl-retake-entry__loading" role="status">Đang tải lượt làm lại…</p>
  if (resource.status === 'error' || !resource.data) {
    return <div className="pl-retake-entry__error" role="alert"><span>Chưa tải được trạng thái lượt làm lại.</span><button onClick={resource.reload} type="button">Thử lại</button></div>
  }
  if (!resource.data.hasPlacement) return null

  const { retakesLeft, nextRetakeAt } = resource.data
  const nextDate = nextRetakeAt ? dateLabel(nextRetakeAt) : null
  return (
    <section className="pl-retake-entry" aria-label="Làm lại bài kiểm tra đầu vào">
      <div className="pl-retake-entry__copy">
        <RotateCcw aria-hidden="true" size={20} />
        <div><strong>Làm lại bài test đầu vào</strong><span>{retakesLeft > 0 ? `Còn ${retakesLeft} lượt trong 24 giờ` : 'Đã hết lượt trong 24 giờ'}</span></div>
      </div>
      {retakesLeft === 0 && nextDate ? <p className="pl-retake-entry__next"><CalendarClock aria-hidden="true" size={16} />Mở lượt tiếp theo: {nextDate}</p> : null}
      <Link className="pl-retake-entry__link" to="/learn/placement">Làm lại bài test đầu vào{retakesLeft > 0 ? ` · còn ${retakesLeft} lượt` : ' · hết lượt'}</Link>
    </section>
  )
}
