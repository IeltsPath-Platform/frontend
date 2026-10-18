import { ReactionIcon } from './ReactionIcons'
import { REACTION_META, type ReactionType } from '../utils/communityFormat'

export interface ReactionSummaryProps {
  reactionCounts?: Record<string, number>
  className?: string
}

export function ReactionSummary({ reactionCounts = {}, className = '' }: ReactionSummaryProps) {
  // Lọc các reaction có số lượng > 0 và sắp xếp theo số lượng giảm dần
  const activeEntries = (Object.entries(reactionCounts) as [ReactionType, number][])
    .filter(([type, count]) => count > 0 && type in REACTION_META)
    .sort((a, b) => b[1] - a[1])

  const total = activeEntries.reduce((sum, [, count]) => sum + count, 0)

  // Nếu tổng = 0 thì không hiển thị gì theo yêu cầu
  if (total === 0) {
    return null
  }

  // Tối đa 3 icon có nhiều nhất chồng nhẹ lên nhau
  const topReactions = activeEntries.slice(0, 3)

  // Chi tiết tooltip dạng: "Thích 5 · Yêu thích 3 · Hữu ích 2"
  const breakdownTooltip = activeEntries
    .map(([type, count]) => `${REACTION_META[type].label} ${count}`)
    .join(' · ')

  // Văn bản cho trình đọc màn hình
  const screenReaderText = `Tổng cộng ${total} cảm xúc: ${breakdownTooltip}`

  return (
    <div className={`reaction-summary-row ${className}`} role="status">
      <div
        className="reaction-summary-left"
        tabIndex={0}
        aria-label={screenReaderText}
      >
        {/* Tối đa 3 icon xếp chồng */}
        <div className="reaction-summary-stack" aria-hidden="true">
          {topReactions.map(([type]) => (
            <span key={type} className="reaction-summary-stack-item">
              <ReactionIcon type={type} size={16} />
            </span>
          ))}
        </div>

        {/* Tổng số hiển thị */}
        <span className="reaction-summary-total">{total}</span>

        {/* Tooltip khi hover xem chi tiết breakdown từng loại */}
        <div className="reaction-summary-tooltip" role="tooltip" aria-hidden="true">
          {breakdownTooltip}
        </div>

        {/* Accessible text cho screen readers */}
        <span className="sr-only">{screenReaderText}</span>
      </div>
    </div>
  )
}
