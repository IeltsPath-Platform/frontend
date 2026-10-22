import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ArrowRight, Gamepad2, Rocket, UserRound, Users } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { gameApi } from '../api/gameApi'
import type { ActiveGame, GameCatalog } from '../types/game'
import { ActiveGameDialog } from '../components/ActiveGameDialog'
import { activeGamePath, isActiveGameConflict } from '../lib/activeGame'
import '../games-room.css'

export function GameCatalogPage() {
  const navigate = useNavigate()
  const [catalog, setCatalog] = useState<GameCatalog | null>(null)
  const [error, setError] = useState('')
  const [retry, setRetry] = useState(0)
  const [modeOpen, setModeOpen] = useState(false)
  const [code, setCode] = useState('')
  const [joinError, setJoinError] = useState('')
  const [joining, setJoining] = useState(false)
  const submitting = useRef(false)
  const [activeGame, setActiveGame] = useState<ActiveGame | null>(null)
  const [pendingCode, setPendingCode] = useState('')
  const [replacing, setReplacing] = useState(false)
  const [replaceError, setReplaceError] = useState('')
  async function joinRoom(roomCode: string) {
    try {
      const room = await gameApi.join(roomCode)
      navigate(`/games/rooms/${room.id}`)
    } catch (cause) {
      const active = isActiveGameConflict(cause)
        ? await gameApi.activeGame().catch(() => null)
        : null
      if (active) {
        setPendingCode(roomCode)
        setReplaceError('')
        setActiveGame(active)
        return
      }
      setJoinError(
        cause instanceof Error ? cause.message : 'Không tham gia được phòng.',
      )
    }
  }
  async function leaveAndJoin() {
    if (replacing) return
    setReplacing(true)
    setReplaceError('')
    try {
      await gameApi.leaveActiveGame()
    } catch {
      setReplaceError(
        'Chưa rời được phòng cũ. Vui lòng kiểm tra kết nối và thử lại.',
      )
      setReplacing(false)
      return
    }
    setActiveGame(null)
    setJoining(true)
    try {
      await joinRoom(pendingCode)
    } finally {
      setReplacing(false)
      setJoining(false)
    }
  }
  useEffect(() => {
    const controller = new AbortController()
    gameApi
      .catalog(controller.signal)
      .then((data) => {
        if (!controller.signal.aborted) {
          setCatalog(data)
          setError('')
        }
      })
      .catch((cause: unknown) => {
        if (!controller.signal.aborted)
          setError(
            cause instanceof Error ? cause.message : 'Không tải được trò chơi.',
          )
      })
    return () => controller.abort()
  }, [retry])
  return (
    <main className="game-room-page">
      <header className="game-page-heading">
        <span className="game-eyebrow">HỌC QUA TRÒ CHƠI</span>
        <h1>Mỗi từ mới, một thử thách</h1>
        <p>Khám phá trò chơi, luyện từ vựng và chơi cùng bạn bè.</p>
      </header>
      {error ? (
        <div className="game-panel game-state" role="alert">
          <p>{error}</p>
          <Button
            variant="outline"
            onClick={() => {
              setError('')
              setRetry((v) => v + 1)
            }}
          >
            Thử lại
          </Button>
        </div>
      ) : !catalog ? (
        <div className="game-panel game-state" role="status">
          Đang tải trò chơi…
        </div>
      ) : catalog.games.length === 0 ? (
        <div className="game-panel game-state">
          Chưa có trò chơi. Vui lòng quay lại sau.
        </div>
      ) : (
        <section className="game-catalog-grid" aria-label="Danh sách trò chơi">
          {catalog.games.map((game) => {
            const available =
              game.gameType === 'WORDLY' && game.status === 'AVAILABLE'
            return (
              <article
                className={`game-catalog-card ${available ? 'game-catalog-wordly' : ''}`}
                key={game.gameType}
              >
                <div className="game-card-art" aria-hidden="true">
                  {game.gameType === 'WORDLY' ? (
                    <div className="game-letter-demo">
                      {'WORD'.split('').map((letter, i) => (
                        <span key={i}>{letter}</span>
                      ))}
                    </div>
                  ) : (
                    <Rocket size={64} strokeWidth={1.3} />
                  )}
                </div>
                <div className="game-card-body">
                  <span className="game-eyebrow">
                    {available ? 'LUYỆN TỪ VỰNG' : 'SẮP RA MẮT'}
                  </span>
                  <h2>{game.name}</h2>
                  <p>{game.description}</p>
                  <Button
                    disabled={!available}
                    className="game-primary-action"
                    onClick={() => setModeOpen(true)}
                  >
                    {available ? (
                      <>
                        <Gamepad2 /> Chơi Wordly <ArrowRight />
                      </>
                    ) : (
                      'Sắp ra mắt'
                    )}
                  </Button>
                </div>
              </article>
            )
          })}
        </section>
      )}
      <section className="game-panel game-join-panel">
        <div>
          <h2>
            <Users size={22} /> Tham gia phòng bạn bè
          </h2>
          <p>Nhập mã phòng gồm 6 ký tự để vào sảnh chờ.</p>
        </div>
        <form
          className="game-join-form"
          aria-busy={joining}
          onSubmit={async (event) => {
            event.preventDefault()
            if (submitting.current) return
            const roomCode = code.trim().toUpperCase()
            if (!/^[A-Z0-9]{6}$/.test(roomCode)) {
              setJoinError('Nhập mã phòng gồm đúng 6 chữ cái hoặc chữ số.')
              return
            }
            submitting.current = true
            setJoining(true)
            setJoinError('')
            try {
              await joinRoom(roomCode)
            } finally {
              submitting.current = false
              setJoining(false)
            }
          }}
        >
          <label className="sr-only" htmlFor="game-room-code">
            Mã phòng
          </label>
          <Input
            id="game-room-code"
            value={code}
            onChange={(event) => {
              setCode(event.target.value.toUpperCase())
              setJoinError('')
            }}
            maxLength={6}
            autoComplete="off"
            autoCapitalize="characters"
            spellCheck={false}
            placeholder="AB7K2Q"
            disabled={joining}
            aria-invalid={!!joinError}
            aria-describedby={joinError ? 'game-join-error' : undefined}
          />
          <Button type="submit" disabled={joining}>
            {joining ? 'Đang vào…' : 'Vào phòng'}
            <ArrowRight />
          </Button>
        </form>
        {joinError && (
          <p id="game-join-error" className="game-error" role="alert">
            {joinError}
          </p>
        )}
      </section>
      <ActiveGameDialog
        game={activeGame}
        busy={replacing}
        error={replaceError}
        replaceLabel="Vào phòng mới"
        onRejoin={() => {
          if (activeGame) navigate(activeGamePath(activeGame))
        }}
        onReplace={() => void leaveAndJoin()}
        onClose={() => setActiveGame(null)}
      />
      <Dialog open={modeOpen} onOpenChange={setModeOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Wordly · Chọn chế độ chơi</DialogTitle>
            <DialogDescription>
              Luyện tập theo nhịp của bạn hoặc tạo phòng cùng bạn bè.
            </DialogDescription>
          </DialogHeader>
          <div className="game-mode-options">
            <Button variant="outline" asChild>
              <Link to="/games/wordly/setup?mode=SOLO">
                <UserRound />
                <span>
                  <strong>Chơi đơn</strong>
                  <small>Luyện tập theo nhịp của bạn</small>
                </span>
                <ArrowRight />
              </Link>
            </Button>
            <Button variant="outline" asChild>
              <Link to="/games/wordly/setup?mode=MULTIPLAYER">
                <Users />
                <span>
                  <strong>Nhiều người</strong>
                  <small>Thi đấu cùng tối đa 4 người</small>
                </span>
                <ArrowRight />
              </Link>
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </main>
  )
}
