import { Heart, Sparkles, Trophy } from 'lucide-react'
import type { GamificationSummary } from '~types/learningPath'

/**
 * What a submission earned and cost: XP, a new level, hearts lost. Shows nothing for a submission that changed none
 * of these, such as a review with no correct first answer.
 */
export function RewardSummary({ gamification }: { gamification: GamificationSummary | null }) {
  if (!gamification) return null
  const { xpEarned, xpCapped, totalXp, level, leveledUp, heartsLost, heartsRemaining } = gamification
  const lostHearts = (heartsLost ?? 0) > 0
  if (xpEarned <= 0 && !xpCapped && !leveledUp && !lostHearts) return null

  return (
    <section aria-label="Kết quả tích lũy" className="lp-reward" role="status">
      {leveledUp ? (
        <p className="lp-reward__level">
          <Trophy aria-hidden="true" size={18} />
          Lên cấp {level}! Tim đã được hồi đầy.
        </p>
      ) : null}
      {xpEarned > 0 ? (
        <p className="lp-reward__xp">
          <Sparkles aria-hidden="true" size={16} />
          <b>+{xpEarned} XP</b>
          <span>Cấp {level} · {totalXp} XP</span>
        </p>
      ) : null}
      {xpCapped ? (
        <p className="lp-hint">Bạn đã chạm trần XP của hôm nay, phần vượt không được tính. Mai lại tính tiếp.</p>
      ) : null}
      {lostHearts ? (
        <p className="lp-reward__hearts">
          <Heart aria-hidden="true" size={16} />
          Mất {heartsLost} tim{heartsRemaining !== null ? ` · còn ${heartsRemaining}` : ''}
          {heartsRemaining === 0 ? '. Bạn đã hết tim.' : ''}
        </p>
      ) : null}
    </section>
  )
}
