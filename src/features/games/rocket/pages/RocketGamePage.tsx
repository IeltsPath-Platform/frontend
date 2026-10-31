import { useEffect, useMemo, useRef, useState, type RefObject } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { gameApi } from '../../api/gameApi'
import { ActiveGameDialog } from '../../components/ActiveGameDialog'
import { activeGamePath, isActiveGameConflict } from '../../lib/activeGame'
import { gameErrorMessage } from '../../lib/gameErrorMessage'
import type { ActiveGame, WordFilter } from '../../types/game'
import { rocketApi } from '../api/rocketApi'
import { RocketCanvas } from '../components/RocketCanvas'
import { RocketEndScreen } from '../components/RocketEndScreen'
import { RocketHud } from '../components/RocketHud'
import { RocketSetupCard } from '../components/RocketSetupCard'
import { setupPath } from '../../lib/gameRoutes'
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
  const [activeGame, setActiveGame] = useState<ActiveGame | null>(null)
  const [replacing, setReplacing] = useState(false)
  const [replaceError, setReplaceError] = useState('')
  const lastCount = useRef(0)
  const lastWordFilter = useRef<WordFilter | null>(null)

  useEffect(() => {
    void scene?.idle()
  }, [scene])

  async function start(questionCount: number, wordFilter?: WordFilter) {
    lastCount.current = questionCount
    if (wordFilter) lastWordFilter.current = wordFilter
    setStarting(true)
    setError(null)
    try {
      const { matchId } = await rocketApi.startSolo({ questionCount, ...lastWordFilter.current })
      navigate(`/games/rocket/${encodeURIComponent(matchId)}`)
    } catch (cause) {
      // One room per user across games: offer to go back to it or leave it, as the Wordly setup does.
      const active = isActiveGameConflict(cause) ? await gameApi.activeGame().catch(() => null) : null
      if (active) {
        setReplaceError('')
        setActiveGame(active)
      } else {
        setError(gameErrorMessage(cause))
      }
      setStarting(false)
    }
  }

  async function replace() {
    if (replacing) return
    setReplacing(true)
    setReplaceError('')
    try {
      await gameApi.leaveActiveGame()
      setActiveGame(null)
      await start(lastCount.current)
    } catch {
      setReplaceError('Chưa rời được phòng cũ. Vui lòng kiểm tra kết nối và thử lại.')
    } finally {
      setReplacing(false)
    }
  }

  return (
    <main className="rocket-center">
      <RocketSetupCard starting={starting} error={error} onStart={(questionCount, wordFilter) => void start(questionCount, wordFilter)} />
      <ActiveGameDialog
        game={activeGame}
        busy={replacing}
        error={replaceError}
        replaceLabel="Bắt đầu lượt mới"
        onRejoin={() => {
          if (activeGame) navigate(activeGamePath(activeGame))
        }}
        onReplace={() => void replace()}
        onClose={() => setActiveGame(null)}
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
  const { state, choose, timeUp, retry, leave, roomId } = useRocketMatch(matchId, stage, stageReady)
  const { round, phase } = state
  const multiplayer = state.playerMode === 'MULTIPLAYER'
  const aiming = phase === 'aiming' && !exitOpen
  // Multiplayer rounds run on the server clock: keep counting while the dialog is open or the answer is in.
  const ticking = multiplayer ? phase === 'aiming' || phase === 'locked' : aiming
  const countdown = useCountdown(round?.opensAt ?? null, round?.deadlineAt ?? null, state.clockOffsetMs, ticking, timeUp)

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
      ? state.spectating
        ? 'Đã có đáp án của câu này.'
        : state.reveal.correct
          ? `Chính xác, cộng ${state.reveal.points} điểm.`
          : `Chưa đúng. Còn ${state.reveal.livesRemaining} mạng.`
      : phase === 'aiming' && round
        ? `Câu ${round.number} trên ${round.total}: ${round.meaning}`
        : ''

  if (phase === 'finished' && state.final) {
    return (
      <RocketEndScreen
        result={state.final}
        ranking={multiplayer ? state.ranking : null}
        ownUserId={state.ownUserId}
        replayLabel={multiplayer ? (roomId && !state.roomClosed ? 'Về phòng chờ' : 'Tạo phòng mới') : undefined}
        onReplay={() =>
          navigate(
            !multiplayer
              ? '/games/rocket'
              : roomId && !state.roomClosed
                ? `/games/rooms/${roomId}`
                : setupPath('ROCKET', 'MULTIPLAYER'),
          )
        }
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
            <DialogTitle>{multiplayer ? 'Rời trận đấu?' : 'Rời lượt chơi?'}</DialogTitle>
            <DialogDescription>
              {multiplayer
                ? 'Điểm đã đạt được vẫn được giữ, nhưng bạn sẽ bị tính là bỏ cuộc. Những người khác chơi tiếp.'
                : 'Điểm đã đạt được vẫn được giữ, nhưng lượt chơi này sẽ kết thúc.'}
            </DialogDescription>
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
