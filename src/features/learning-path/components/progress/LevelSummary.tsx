import { Sparkles } from 'lucide-react'
import type { LearnerProgress } from '~types/learningPath'
import { levelFraction } from '../../lib/progressMeta'

/** Level and XP: how far through the level, and how much of today's XP cap is used. */
export function LevelSummary({ progress }: { progress: LearnerProgress }) {
  const fraction = levelFraction(progress)
  return (
    <div className="lp-level">
      <p className="lp-level__badge">
        <Sparkles aria-hidden="true" size={18} />
        <b>Cấp {progress.level}</b>
        <span>{progress.totalXp} XP</span>
      </p>
      <label className="lp-level__bar">
        <span>Còn {progress.xpToNextLevel} XP để lên cấp {progress.level + 1}</span>
        <progress max={1} value={fraction} />
      </label>
      <p className="lp-hint">
        Hôm nay {progress.xpToday}/{progress.dailyCap} XP từ trả lời câu hỏi. Phần vượt không được tính; XP từ mốc, nhiệm vụ
        và streak không bị giới hạn.
      </p>
    </div>
  )
}
