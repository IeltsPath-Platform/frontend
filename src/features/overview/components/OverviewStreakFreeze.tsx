import { Loader2, Snowflake } from 'lucide-react'
import { useBuyStreakFreeze } from '@/features/learning-path/lib/useBuyStreakFreeze'
import type { StreakSummary } from '../api/overviewApi'

/** Every overview resource reloads on this event, so the streak and the points balance both show the purchase. */
const refreshStatistics = () => window.dispatchEvent(new Event('study-statistics-changed'))

/** The owned freeze, or a way to buy one while there is a streak to protect. Nothing when neither applies. */
export function OverviewStreakFreeze({ streak }: { streak: StreakSummary }) {
  const { buy, buying, error } = useBuyStreakFreeze(refreshStatistics)
  if (streak.freezeAvailable) {
    return <p className="overview-week-freeze"><Snowflake size={15} aria-hidden="true" /> Có 1 lượt đóng băng bảo vệ chuỗi</p>
  }
  if (streak.currentDays <= 0 || typeof streak.nextFreezeCost !== 'number') return null
  return (
    <div className="overview-week-buy">
      <button type="button" className="overview-week-buy-button" disabled={buying} onClick={() => void buy()}>
        {buying ? <Loader2 size={15} className="overview-spin" aria-hidden="true" /> : <Snowflake size={15} aria-hidden="true" />}
        Mua đóng băng · {streak.nextFreezeCost} điểm
      </button>
      {error && <p className="overview-week-buy-error" role="alert">{error}</p>}
    </div>
  )
}
