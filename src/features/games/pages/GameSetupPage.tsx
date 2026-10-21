import { GameNoticeDialog } from '../components/GameNoticeDialog'
import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { ArrowLeft, Heart, Play } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { GameSettingsForm } from '../components/GameSettingsForm'
import { gameApi } from '../api/gameApi'
import type { ActiveGame, CreateRoomInput, GameRoom } from '../types/game'
import { HttpError } from '@/lib/httpClient'
import { startSoloRoom } from '../lib/startSoloRoom'
import { ActiveGameDialog } from '../components/ActiveGameDialog'
import { activeGamePath, isActiveGameConflict } from '../lib/activeGame'
import '../games-room.css'

export function GameSetupPage() {
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const playerMode =
    params.get('mode') === 'MULTIPLAYER' ? 'MULTIPLAYER' : 'SOLO'
  const [value, setValue] = useState<CreateRoomInput>({
    playerMode,
    initialLives: 4,
    playMode: 'FINITE',
    wordLimit: 10,
    timeEnabled: true,
  })
  const [pending, setPending] = useState(false)
  const [error, setError] = useState('')
  const submitting = useRef(false)
  const pendingSoloRoom = useRef<GameRoom | null>(null)
  const lifetime = useRef<AbortController | null>(null)
  const [activeGame, setActiveGame] = useState<ActiveGame | null>(null)
  const [replacing, setReplacing] = useState(false)
  const [replaceError, setReplaceError] = useState('')
  useEffect(() => {
    const controller = new AbortController()
    lifetime.current = controller
    return () => controller.abort()
  }, [])

  /** checkActive=false only after the user chose to leave their previous room. */
  async function submit(checkActive: boolean) {
    if (submitting.current) return
    if (
      value.playMode === 'FINITE' &&
      (!Number.isInteger(value.wordLimit) ||
        (value.wordLimit ?? 0) < 5 ||
        (value.wordLimit ?? 0) > 2147483647)
    ) {
      setError(
        (value.wordLimit ?? 0) > 2147483647
          ? 'Số từ vượt quá giới hạn cho phép.'
          : 'Vui lòng nhập số từ là số nguyên từ 5 trở lên.',
      )
      return
    }
    submitting.current = true
    const signal = lifetime.current?.signal
    setPending(true)
    setError('')
    try {
      if (checkActive) {
        const active = await gameApi.activeGame(signal)
        signal?.throwIfAborted()
        if (active) {
          setReplaceError('')
          setActiveGame(active)
          return
        }
      }
      if (playerMode === 'SOLO') {
        let room = pendingSoloRoom.current
        if (room) {
          try {
            room = await gameApi.room(room.id)
            signal?.throwIfAborted()
          } catch (cause) {
            if (!(cause instanceof HttpError) || cause.status !== 404) {
              throw cause
            }
            pendingSoloRoom.current = null
            room = null
          }
        }
        if (
          room?.status === 'WAITING' &&
          (room.settings?.initialLives !== value.initialLives ||
            room.settings?.playMode !== value.playMode ||
            room.settings?.wordLimit !== value.wordLimit ||
            room.settings?.timeEnabled !== value.timeEnabled)
        ) {
          await gameApi.leaveRoom(room.id)
          signal?.throwIfAborted()
          pendingSoloRoom.current = null
          room = null
        }
        if (!room) {
          room = await gameApi.createRoom({ ...value, playerMode })
          pendingSoloRoom.current = room
          signal?.throwIfAborted()
        }
        const match = await startSoloRoom(room, signal)
        signal?.throwIfAborted()
        pendingSoloRoom.current = null
        navigate(`/games/matches/${match.matchId}/play`, {
          replace: true,
        })
        return
      }
      const room = await gameApi.createRoom({ ...value, playerMode })
      signal?.throwIfAborted()
      navigate(`/games/rooms/${room.id}`)
    } catch (cause) {
      if (signal?.aborted) return
      if (isActiveGameConflict(cause)) {
        // Another tab joined or created a room after the check above.
        const active = await gameApi.activeGame(signal).catch(() => null)
        if (signal?.aborted) return
        if (active) {
          setReplaceError('')
          setActiveGame(active)
          return
        }
      }
      setError(
        playerMode === 'SOLO'
          ? 'Chưa bắt đầu được lượt chơi. Vui lòng kiểm tra kết nối và thử lại.'
          : 'Không tạo được phòng. Vui lòng kiểm tra kết nối và thử lại.',
      )
    } finally {
      submitting.current = false
      if (!signal?.aborted) setPending(false)
    }
  }

  async function replaceActiveGame() {
    if (replacing) return
    setReplacing(true)
    setReplaceError('')
    try {
      await gameApi.leaveActiveGame()
      if (lifetime.current?.signal.aborted) return
      setActiveGame(null)
      await submit(false)
    } catch {
      if (!lifetime.current?.signal.aborted)
        setReplaceError(
          'Chưa rời được phòng cũ. Vui lòng kiểm tra kết nối và thử lại.',
        )
    } finally {
      if (!lifetime.current?.signal.aborted) setReplacing(false)
    }
  }
  return (
    <main className="game-room-page game-setup-page">
      <Link className="game-back" to="/games">
        <ArrowLeft size={18} /> Trò chơi
      </Link>
      <header className="game-page-heading">
        <span className="game-eyebrow">
          WORDLY · {playerMode === 'SOLO' ? 'CHƠI ĐƠN' : 'NHIỀU NGƯỜI'}
        </span>
        <h1>
          {playerMode === 'SOLO'
            ? 'Chơi theo nhịp của bạn'
            : 'Tạo phòng cùng bạn bè'}
        </h1>
        <p>Thiết lập lượt chơi và thử sức với những từ mới.</p>
      </header>
      <div className="game-setup-grid">
        <section className="game-panel">
          <h2>
            <Heart size={21} /> Cấu hình Wordly
          </h2>
          <form
            noValidate
            className="game-form"
            aria-busy={pending}
            onSubmit={(event) => {
              event.preventDefault()
              void submit(true)
            }}
          >
            <GameSettingsForm
              value={{ ...value, playerMode }}
              onChange={setValue}
              disabled={pending}
            />
            <GameNoticeDialog message={error} onClose={() => setError('')} />
            <ActiveGameDialog
              game={activeGame}
              busy={replacing}
              error={replaceError}
              replaceLabel="Tạo phòng mới"
              onRejoin={() => {
                if (activeGame) navigate(activeGamePath(activeGame))
              }}
              onReplace={() => void replaceActiveGame()}
              onClose={() => setActiveGame(null)}
            />
            <Button
              type="submit"
              disabled={pending}
              className="game-primary-action"
            >
              <Play size={18} />
              {playerMode === 'SOLO'
                ? pending
                  ? 'Đang bắt đầu…'
                  : 'Bắt đầu chơi'
                : pending
                  ? 'Đang tạo phòng…'
                  : 'Tạo phòng chơi'}
            </Button>
          </form>
        </section>
        <aside className="game-panel game-howto">
          <span className="game-eyebrow">CÁCH CHƠI</span>
          <h2>Một gợi ý. Một từ mới.</h2>
          <div className="game-letter-demo" aria-hidden="true">
            {'WORDLY'.split('').map((letter, index) => (
              <span key={index}>{letter}</span>
            ))}
          </div>
          <p>
            Đoán từ tiếng Anh dựa trên nghĩa. Từ có N chữ cái sẽ có N+1 lượt
            đoán.
          </p>
          <p>
            Đúng liên tiếp từ 3 từ: thêm 50 điểm mỗi từ. Đoán sai một hàng không
            mất mạng và không ngắt chuỗi.
          </p>
          {playerMode === 'MULTIPLAYER' && (
            <p className="game-note">
              Tối đa 4 người, cùng một chuỗi từ và tiến độ riêng. Tất cả sẵn
              sàng để chủ phòng bắt đầu.
            </p>
          )}
        </aside>
      </div>
    </main>
  )
}
