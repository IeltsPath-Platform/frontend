import { useEffect, useMemo, useRef, useState, type RefObject } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { rocketApi } from '../api/rocketApi'
import { RocketCanvas } from '../components/RocketCanvas'
import { RocketEndScreen } from '../components/RocketEndScreen'
import { RocketHud } from '../components/RocketHud'
import { RocketSetupCard } from '../components/RocketSetupCard'
import { useCountdown } from '../hooks/useCountdown'
import { useRocketMatch, type RocketStage } from '../hooks/useRocketMatch'
import type { RocketScene } from '../scene/RocketScene'
import { playCue } from '../scene/rocketSound'
import '../rocket.css'

const SOUND_KEY = 'rocket-sound'

function readSound() {
  try {
    return window.localStorage.getItem(SOUND_KEY) !== 'off'
  } catch {
    return true
  }
}

/** `/games/rocket` shows the setup card, `/games/rocket/:matchId` plays; the 3D scene stays mounted across both. */
export function RocketGamePage() {
  const { matchId } = useParams()
  const [scene, setScene] = useState<RocketScene | null>(null)
  const [sceneStatus, setSceneStatus] = useState<'loading' | 'ready' | 'fallback'>('loading')
  const [hovered, setHovered] = useState<number | null>(null)
  const pickRef = useRef<(index: number) => void>(() => undefined)

  // The game is full screen; stop the page behind it (site footer) from scrolling.
  useEffect(() => {
    const root = document.documentElement
    const previous = root.style.overflow
    root.style.overflow = 'hidden'
    return () => {
      root.style.overflow = previous
    }
  }, [])

  return (
    <div className={`rocket-root ${sceneStatus === 'fallback' ? 'is-fallback' : ''}`}>
      <RocketCanvas
        onReady={(created) => {
          setScene(created)
          setSceneStatus(created ? 'ready' : 'fallback')
        }}
        onPick={(index) => pickRef.current(index)}
        onHover={setHovered}
      />
      {sceneStatus === 'loading' && (
        <div className="rocket-loading" role="status">
          Đang chuẩn bị bầu trời…
        </div>
      )}
      {matchId ? (
        <RocketPlay
          key={matchId}
          matchId={matchId}
          scene={scene}
          stageReady={sceneStatus !== 'loading'}
          hovered={hovered}
          setHovered={setHovered}
          pickRef={pickRef}
        />
      ) : (
        <RocketSetup scene={scene} />
      )}
    </div>
  )
}

function RocketSetup({ scene }: { scene: RocketScene | null }) {
  const navigate = useNavigate()
  const [starting, setStarting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    void scene?.idle()
  }, [scene])

  return (
    <main className="rocket-center">
      <RocketSetupCard
        starting={starting}
        error={error}
        onStart={(questionCount) => {
          setStarting(true)
          setError(null)
          rocketApi
            .startSolo({ questionCount })
            .then(({ matchId }) => navigate(`/games/rocket/${encodeURIComponent(matchId)}`))
            .catch((cause: unknown) => {
              setError(cause instanceof Error ? cause.message : 'Không bắt đầu được lượt chơi.')
              setStarting(false)
            })
        }}
      />
    </main>
  )
}

type RocketPlayProps = {
  matchId: string
  scene: RocketScene | null
  stageReady: boolean
  hovered: number | null
  setHovered: (index: number | null) => void
  pickRef: RefObject<(index: number) => void>
}

function RocketPlay({ matchId, scene, stageReady, hovered, setHovered, pickRef }: RocketPlayProps) {
  const navigate = useNavigate()
  const [soundOn, setSoundOn] = useState(readSound)
  const [exitOpen, setExitOpen] = useState(false)
  const [leaving, setLeaving] = useState(false)
  const hudRef = useRef<HTMLElement>(null)
  const stage = useMemo<RocketStage | null>(
    () =>
      scene && {
        showRound: (words) => scene.showRound(words),
        launch: (index) => scene.launch(index),
        revealCorrect: (index) => scene.revealCorrect(index),
        revealWrong: (chosen, correct) => scene.revealWrong(chosen, correct),
        travel: () => scene.travel(),
        idle: () => scene.idle(),
      },
    [scene],
  )
  const { state, choose, timeUp, retry, leave } = useRocketMatch(matchId, stage, stageReady)
  const { round, phase } = state
  const aiming = phase === 'aiming' && !exitOpen
  const countdown = useCountdown(round?.opensAt ?? null, round?.deadlineAt ?? null, state.clockOffsetMs, aiming, timeUp)

  useEffect(() => {
    pickRef.current = (index) => {
      const option = round?.options[index]
      if (option && aiming) choose(option.optionId)
    }
  }, [aiming, choose, pickRef, round])

  useEffect(() => {
    scene?.highlight(aiming ? hovered : null)
  }, [aiming, hovered, scene])

  // Planets are laid out below the HUD, whose height changes with the viewport and the wrapped question.
  const hasHud = Boolean(round) && phase !== 'finished'
  useEffect(() => {
    const hud = hudRef.current
    if (!scene || !hud || !hasHud) return
    const measure = () => scene.setSafeTop(hud.getBoundingClientRect().bottom)
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(hud)
    return () => {
      observer.disconnect()
      scene.setSafeTop(0)
    }
  }, [hasHud, scene])

  useEffect(() => {
    if (!soundOn) return
    if (phase === 'launching' && state.chosenOptionId) playCue('launch')
    if (phase === 'reveal' && state.reveal) playCue(state.reveal.correct ? 'correct' : 'wrong')
  }, [phase, soundOn, state.chosenOptionId, state.reveal])

  useEffect(() => {
    if (!aiming || !round) return
    const onKey = (event: KeyboardEvent) => {
      if (event.target instanceof HTMLElement && event.target.closest('input,textarea,[role=dialog]')) return
      const index = Number(event.key) - 1
      const option = round.options[index]
      if (option) {
        event.preventDefault()
        choose(option.optionId)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [aiming, choose, round])

  const toggleSound = () => {
    setSoundOn((on) => {
      try {
        window.localStorage.setItem(SOUND_KEY, on ? 'off' : 'on')
      } catch {
        // Preference only lasts for this visit.
      }
      return !on
    })
  }

  const announcement =
    phase === 'reveal' && state.reveal
      ? state.reveal.correct
        ? `Chính xác, cộng ${state.reveal.points} điểm.`
        : `Chưa đúng. Còn ${state.reveal.livesRemaining} mạng.`
      : phase === 'aiming' && round
        ? `Câu ${round.number} trên ${round.total}: ${round.meaning}`
        : ''

  if (phase === 'finished' && state.final) {
    return (
      <RocketEndScreen
        result={state.final}
        onReplay={() => navigate('/games/rocket')}
        onHome={() => navigate('/games')}
      />
    )
  }

  return (
    <>
      <RocketHud
        ref={hudRef}
        state={state}
        timeFraction={countdown.fraction}
        seconds={countdown.seconds}
        hovered={hovered}
        soundOn={soundOn}
        onHover={(index) => setHovered(aiming ? index : null)}
        onChoose={choose}
        onToggleSound={toggleSound}
        onExit={() => setExitOpen(true)}
      />
      <p className="sr-only" aria-live="polite">
        {announcement}
      </p>
      {phase === 'error' && (
        <div className="rocket-center">
          <div className="rocket-card rocket-error-card" role="alert">
            <p>{state.error}</p>
            <div className="rocket-end-actions">
              <button type="button" className="rocket-primary" onClick={retry}>
                Thử lại
              </button>
              <button type="button" className="rocket-secondary" onClick={() => navigate('/games/rocket')}>
                Chơi lượt mới
              </button>
            </div>
          </div>
        </div>
      )}
      <Dialog open={exitOpen} onOpenChange={setExitOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rời lượt chơi?</DialogTitle>
            <DialogDescription>Điểm đã đạt được vẫn được giữ, nhưng lượt chơi này sẽ kết thúc.</DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setExitOpen(false)}>
              Chơi tiếp
            </Button>
            <Button
              disabled={leaving}
              onClick={() => {
                setLeaving(true)
                leave()
                  .catch(() => undefined)
                  .finally(() => navigate('/games'))
              }}
            >
              {leaving ? 'Đang rời…' : 'Rời trận'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
