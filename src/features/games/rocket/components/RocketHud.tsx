import type { Ref } from 'react'
import { ArrowLeft, Check, Heart, Trophy, Volume2, VolumeX, X } from 'lucide-react'
import type { RocketMatchState } from '../hooks/useRocketMatch'
import { RocketRankingPanel } from './RocketRankingPanel'

type RocketHudProps = {
  ref?: Ref<HTMLElement>
  state: RocketMatchState
  timeFraction: number
  seconds: number
  hovered: number | null
  soundOn: boolean
  onHover: (index: number | null) => void
  onChoose: (optionId: string) => void
  onToggleSound: () => void
  onExit: () => void
}

export function RocketHud({ ref, state, timeFraction, seconds, hovered, soundOn, onHover, onChoose, onToggleSound, onExit }: RocketHudProps) {
  const { round, reveal, phase, chosenOptionId, settings } = state
  const maxLives = settings?.initialLives ?? state.lives
  const choosing = phase === 'aiming'
  // Keep the verdict on screen while the scene flies on to the next round.
  const revealing = (phase === 'reveal' || phase === 'travel') && reveal !== null
  const watching = state.spectating
  const lostLife = phase === 'reveal' && reveal && !reveal.correct && !watching
  const gained = phase === 'reveal' && reveal?.correct && !watching ? reveal.points : 0
  const multiplayer = state.playerMode === 'MULTIPLAYER'

  return (
    <header ref={ref} className="rocket-hud">
      <div className="rocket-hud-left">
        <button type="button" className="rocket-icon-button" onClick={onExit} aria-label="Thoát trò chơi">
          <ArrowLeft size={20} />
        </button>
        <div className="rocket-pill rocket-hearts" role="img" aria-label={`Còn ${state.lives} trên ${maxLives} mạng`}>
          {Array.from({ length: maxLives }, (_, i) => (
            <Heart key={i} size={20} className={i < state.lives ? 'is-full' : 'is-empty'} fill="currentColor" strokeWidth={0} />
          ))}
          {lostLife && <span className="rocket-float rocket-float-down">-1</span>}
        </div>
      </div>

      {round && (
        <section className="rocket-mission" aria-label="Câu hỏi">
          <p className="rocket-mission-question">
            <span className="rocket-mission-lead">Bay vào từ mang nghĩa</span>
            <strong>{round.meaning}</strong>
            <span className="rocket-mission-count">
              {round.number}/{round.total}
            </span>
          </p>
          <div
            className="rocket-timer"
            role="progressbar"
            aria-label="Thời gian còn lại"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={Math.round(timeFraction * 100)}
            aria-valuetext={`${seconds} giây`}
          >
            <span style={{ transform: `scaleX(${timeFraction})` }} className={timeFraction < 0.25 ? 'is-low' : ''} />
          </div>
          {multiplayer && watching && (
            <p className="rocket-wait is-spectating" role="status">
              Bạn đã bị loại — đang xem
            </p>
          )}
          {multiplayer && !watching && phase === 'locked' && (
            <p className="rocket-wait" role="status">
              {state.answeredCount !== null && state.aliveCount !== null
                ? `Đang chờ ${state.answeredCount}/${state.aliveCount} người`
                : 'Đang chờ người chơi khác'}
            </p>
          )}
          <div className="rocket-options" hidden={multiplayer && watching}>
            {round.options.map((option, index) => {
              const isAnswer = revealing && reveal?.correctOptionId === option.optionId
              const isWrong = revealing && chosenOptionId === option.optionId && !reveal?.correct
              const isChosen = chosenOptionId === option.optionId
              const className = [
                'rocket-option',
                isAnswer ? 'is-correct' : '',
                isWrong ? 'is-wrong' : '',
                !isAnswer && !isWrong && isChosen ? 'is-selected' : '',
                choosing && hovered === index ? 'is-hover' : '',
              ].join(' ')
              return (
                <button
                  key={option.optionId}
                  type="button"
                  className={className}
                  disabled={!choosing}
                  aria-keyshortcuts={String(index + 1)}
                  onClick={() => onChoose(option.optionId)}
                  onMouseEnter={() => onHover(index)}
                  onMouseLeave={() => onHover(null)}
                  onFocus={() => onHover(index)}
                  onBlur={() => onHover(null)}
                >
                  {option.word}
                  {isAnswer && <Check size={16} strokeWidth={3} aria-label="đúng" />}
                  {isWrong && <X size={16} strokeWidth={3} aria-label="sai" />}
                </button>
              )
            })}
          </div>
        </section>
      )}

      <div className="rocket-hud-right">
        <div className="rocket-pill rocket-score" aria-label={`Điểm ${state.score}`}>
          <Trophy size={20} className="rocket-trophy" />
          <span>{state.score}</span>
          {gained > 0 && <span className="rocket-float rocket-float-up">+{gained}</span>}
        </div>
        <button
          type="button"
          className="rocket-icon-button"
          onClick={onToggleSound}
          aria-pressed={soundOn}
          aria-label={soundOn ? 'Tắt âm thanh' : 'Bật âm thanh'}
        >
          {soundOn ? <Volume2 size={20} /> : <VolumeX size={20} />}
        </button>
      </div>
      {multiplayer && state.ranking && (
        <RocketRankingPanel ranking={state.ranking} ownUserId={state.ownUserId} answeredUserIds={state.answeredUserIds} />
      )}
    </header>
  )
}
