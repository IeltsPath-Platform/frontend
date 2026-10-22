import { useEffect, useRef, type ReactNode } from 'react'
import { BookOpen, Clock3, House, RotateCcw, Star, Target } from 'lucide-react'
import endBgUrl from '../assets/end-bg.webp'
import owlGameOverUrl from '../assets/owl-gameover.webp'
import owlVictoryUrl from '../assets/owl-victory.webp'
import type { GameRanking } from '../../types/game'
import type { RocketResult } from '../types/rocket'
import { RocketRankingPanel } from './RocketRankingPanel'

type RocketEndScreenProps = {
  result: RocketResult
  onReplay: () => void
  onHome: () => void
  /** Multiplayer: the final ranking under the player's own stats. */
  ranking?: GameRanking | null
  ownUserId?: string | null
  replayLabel?: string
}

function formatDuration(ms: number) {
  const total = Math.max(0, Math.round(ms / 1000))
  return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`
}

export function RocketEndScreen({ result, onReplay, onHome, ranking, ownUserId = null, replayLabel }: RocketEndScreenProps) {
  // Multiplayer: whoever is still playing at the end finished it, whatever ended the match.
  const victory = ranking ? result.playerStatus === 'FINISHED' : result.endReason === 'ALL_ROUNDS_COMPLETED'
  const heading = useRef<HTMLHeadingElement>(null)

  useEffect(() => {
    heading.current?.focus()
  }, [])

  return (
    <div className={`rocket-end ${victory ? 'is-victory' : 'is-gameover'}`} style={{ backgroundImage: `url(${endBgUrl})` }}>
      <img className="rocket-end-owl" src={victory ? owlVictoryUrl : owlGameOverUrl} alt="" />
      <section className="rocket-end-panel" aria-labelledby="rocket-end-title">
        <h1 id="rocket-end-title" ref={heading} tabIndex={-1} className="rocket-end-title">
          {victory ? 'HOÀN THÀNH!' : 'GAME OVER!'}
        </h1>
        <div className="rocket-card rocket-end-card">
          <h2>{victory ? 'Tuyệt vời!' : 'Bạn đã hết lượt!'}</h2>
          <p className="rocket-muted">{victory ? 'Bạn đã vượt qua thiên hà này!' : 'Đừng lo, mọi hành trình đều có thể thử lại!'}</p>
          <dl className="rocket-stats">
            {victory ? (
              <>
                <Stat icon={<Target size={20} />} label="Số câu đúng" value={`${result.correctCount} / ${result.totalRounds}`} tone="violet" />
                <Stat icon={<Clock3 size={20} />} label="Thời gian" value={formatDuration(result.durationMs)} tone="cyan" />
                <Stat icon={<Star size={20} fill="currentColor" />} label="Điểm nhận được" value={`+${result.totalScore}`} tone="gold" />
              </>
            ) : (
              <>
                <Stat icon={<BookOpen size={20} />} label="Số từ đã luyện" value={String(result.answered)} tone="blue" />
                <Stat icon={<Target size={20} />} label="Số câu đúng" value={`${result.correctCount} / ${result.totalRounds}`} tone="violet" />
                <Stat icon={<Star size={20} fill="currentColor" />} label="Điểm đạt được" value={String(result.totalScore)} tone="gold" />
              </>
            )}
          </dl>
          {ranking && <RocketRankingPanel ranking={ranking} ownUserId={ownUserId} final />}
          <div className="rocket-end-actions">
            <button type="button" className="rocket-primary" onClick={onReplay}>
              <RotateCcw size={18} /> {replayLabel ?? (victory ? 'Chơi lại' : 'Thử lại')}
            </button>
            <button type="button" className="rocket-secondary" onClick={onHome}>
              <House size={18} /> Về trang chủ
            </button>
          </div>
        </div>
      </section>
    </div>
  )
}

function Stat({ icon, label, value, tone }: { icon: ReactNode; label: string; value: string; tone: string }) {
  return (
    <div className={`rocket-stat is-${tone}`}>
      <span className="rocket-stat-icon" aria-hidden="true">
        {icon}
      </span>
      <dt>{label}</dt>
      <dd>{value}</dd>
    </div>
  )
}
