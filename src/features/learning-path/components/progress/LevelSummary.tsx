import { ArrowUpRight, Sparkles, Star } from 'lucide-react'
import type { LearnerProgress } from '~types/learningPath'
import { levelFraction } from '../../lib/progressMeta'

/** Level and XP: how far through the level, and how much of today's XP cap is used. */
export function LevelSummary({ progress, featured = false }: { progress: LearnerProgress; featured?: boolean }) {
  const fraction = levelFraction(progress)
  if (featured) return <div className="achievement-level-content">
    <div className="achievement-emblem" aria-hidden="true">
      <span className="achievement-emblem-ribbon" />
      <div className="achievement-emblem-coin"><Star size={20} /><span>Cấp độ</span><b>{progress.level}</b></div>
    </div>
    <div className="achievement-level-copy">
      <p className="achievement-level-caption">Hành trình vẫn đang tiếp diễn</p>
      <p className="achievement-level-value">Cấp {progress.level}<span>{progress.totalXp.toLocaleString('vi-VN')} XP tích lũy</span></p>
      <p className="achievement-level-next">Còn <strong>{progress.xpToNextLevel.toLocaleString('vi-VN')} XP</strong> để lên cấp {progress.level + 1} <ArrowUpRight size={15} aria-hidden="true" /></p>
      <label className="achievement-level-meter"><span className="lp-sr-only">Tiến độ cấp {progress.level}</span><progress max={1} value={fraction} /></label>
      <div className="achievement-level-meter-label"><span>Cấp {progress.level}</span><span>Cấp {progress.level + 1}</span></div>
    </div>
    <div className="achievement-daily-xp"><span><Sparkles size={17} aria-hidden="true" /> XP hôm nay</span><strong>{progress.xpToday}<small> / {progress.dailyCap} XP từ câu hỏi</small></strong></div>
    <details className="achievement-level-rules"><summary>Cách tính XP</summary><p>XP từ câu hỏi được tính tối đa {progress.dailyCap} XP/ngày. Phần vượt không được tính; XP từ mốc, nhiệm vụ và streak không bị giới hạn.</p></details>
  </div>
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
