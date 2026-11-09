import { Flame, Loader2, Snowflake } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { StreakStatus } from '~types/learningPath'
import { useBuyStreakFreeze } from '../../lib/useBuyStreakFreeze'

/** The streak, and a way to buy a freeze that keeps it through one missed day. */
export function StreakPanel({ streak, onChanged }: { streak: StreakStatus; onChanged: () => void }) {
  const { buy: buyFreeze, buying, error } = useBuyStreakFreeze(onChanged)
  const lost = streak.currentDays === 0 && streak.lostStreakDays > 0

  return (
    <div className="lp-streak">
      <p className="lp-streak__days">
        <Flame aria-hidden="true" size={22} />
        <b>{streak.currentDays}</b> ngày liên tiếp
        <span className="lp-streak__best">Dài nhất: {streak.longestDays} ngày</span>
      </p>
      <p className="lp-hint" role="status">
        {lost
          ? `Chuỗi ${streak.lostStreakDays} ngày đã đứt. Làm một câu để bắt đầu chuỗi mới.`
          : streak.activeToday
            ? 'Hôm nay bạn đã học.'
            : 'Hôm nay bạn chưa làm câu nào.'}
      </p>

      {streak.freezeAvailable ? (
        <p className="lp-streak__freeze">
          <Snowflake aria-hidden="true" size={16} />
          Bạn có một lượt đóng băng: nó tự bảo vệ chuỗi qua một ngày bạn bỏ lỡ.
        </p>
      ) : (
        <div className="lp-streak__buy">
          <Button
            className="lp-btn"
            disabled={buying || streak.currentDays === 0}
            onClick={() => void buyFreeze()}
            type="button"
            variant="outline"
          >
            {buying ? <Loader2 aria-hidden="true" className="lp-spin" size={16} /> : <Snowflake aria-hidden="true" size={16} />}
            Mua đóng băng · {streak.nextFreezeCost} điểm
          </Button>
          {streak.currentDays === 0 ? <span className="lp-hint">Cần có chuỗi đang chạy mới mua được.</span> : null}
        </div>
      )}
      {error ? <p className="lp-error" role="alert">{error}</p> : null}

      <p className="lp-hint">
        Mỗi 7 ngày liên tiếp được +100 XP và +10 điểm; đạt 30 ngày được thêm +500 XP. Đóng băng liên tiếp giá tăng dần
        (10, 20, 30… điểm), tối đa 5 ngày liên tiếp.
      </p>
    </div>
  )
}
