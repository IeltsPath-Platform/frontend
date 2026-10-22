import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { Check, Copy, Crown, LogOut, Plus, Settings2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { useToast } from '@/components/toast/toastContext'
import { apiRequest, HttpError } from '@/lib/httpClient'
import { useAuthSession } from '@/features/auth/authSession'
import type { UserResponse } from '@/features/auth/api/types'
import { gameApi } from '../api/gameApi'
import type { GameRoom } from '../types/game'
import { RoomSettingsDialog } from '../components/RoomSettingsDialog'
import { GameNoticeDialog } from '../components/GameNoticeDialog'
import { SoloGameEntry } from '../components/SoloGameEntry'
import { RoomSettingsSummary } from '../components/RoomSettingsSummary'
import { useGameConnection } from '../hooks/useGameConnection'
import { gameName, playPath, toGameType } from '../lib/gameRoutes'
import '../games-room.css'

export function GameRoomPage() {
  const { roomId } = useParams()
  const { email } = useAuthSession()
  return <GameRoomContent key={`${email ?? 'guest'}:${roomId ?? ''}`} />
}

function GameRoomContent() {
  const { roomId } = useParams()
  const navigate = useNavigate()
  const { toast } = useToast()
  const [room, setRoom] = useState<GameRoom | null>(null)
  const [userId, setUserId] = useState('')
  const [error, setError] = useState('')
  const [retry, setRetry] = useState(0)
  const [pending, setPending] = useState(false)
  const [editing, setEditing] = useState(false)
  const [leaving, setLeaving] = useState(false)
  const [kicking, setKicking] = useState<{
    userId: string
    displayName: string | null
  } | null>(null)
  const [removed, setRemoved] = useState('')
  const actionLock = useRef(false)
  const generation = useRef(0)
  const alive = useRef(false)
  const lastKnownRoom = useRef<GameRoom | null>(null)
  const connected = useGameConnection(roomId ?? null, (event) => {
    if (event.type === 'PLAYER_KICKED' || event.type === 'ROOM_CLOSED') {
      generation.current += 1
      setRemoved(
        event.message ||
          (event.type === 'PLAYER_KICKED'
            ? 'Bạn đã được chủ phòng đưa ra khỏi phòng.'
            : 'Chủ phòng đã đóng phòng.'),
      )
    }
    if (event.type === 'ROOM_STATE' && event.room && !actionLock.current) {
      generation.current += 1
      updateRoom(event.room)
    }
    if (event.type === 'MATCH_STARTED' && event.match)
      navigate(
        playPath(toGameType(lastKnownRoom.current?.gameType), event.match.matchId),
        { replace: true },
      )
  })

  useEffect(() => {
    if (room?.status === 'IN_MATCH' && room.activeMatchId && !removed)
      navigate(playPath(toGameType(room.gameType), room.activeMatchId), {
        replace: true,
      })
  }, [room, navigate, removed])

  function updateRoom(next: GameRoom) {
    lastKnownRoom.current = next
    setRoom(next)
  }

  useEffect(() => {
    alive.current = true
    if (!roomId) return
    const controller = new AbortController()
    let timer: ReturnType<typeof setTimeout> | undefined
    let userLoaded = false
    let terminal = false
    async function load(initial: boolean) {
      if (!roomId || controller.signal.aborted) return
      if (!actionLock.current) {
        const version = generation.current
        try {
          const [nextRoom, user] = await Promise.all([
            gameApi.room(roomId, controller.signal),
            initial || !userLoaded
              ? apiRequest<UserResponse>('/api/users/me', {
                  auth: true,
                  signal: controller.signal,
                })
              : Promise.resolve(null),
          ])
          if (!controller.signal.aborted && generation.current === version) {
            updateRoom(nextRoom)
            terminal = nextRoom.status === 'CLOSED'
            if (user) {
              setUserId(user.id)
              userLoaded = true
            }
            setError('')
          }
        } catch (cause) {
          if (!controller.signal.aborted && generation.current === version) {
            const known = lastKnownRoom.current
            if (
              cause instanceof HttpError &&
              cause.status === 404 &&
              known?.status === 'WAITING'
            ) {
              updateRoom({ ...known, status: 'CLOSED', canStart: false })
              const hostName = known.members.find(
                (member) => member.userId === known.hostUserId,
              )?.displayName
              setRemoved(`Chủ phòng ${hostName || 'người chơi'} đã đóng phòng.`)
              setError('')
              terminal = true
            } else if (
              cause instanceof HttpError &&
              [403, 404].includes(cause.status) &&
              known
            ) {
              setRemoved(
                'Phòng không còn khả dụng hoặc bạn đã được đưa ra khỏi phòng.',
              )
              terminal = true
            } else
              setError(
                cause instanceof Error
                  ? cause.message
                  : 'Không tải được phòng.',
              )
          }
        }
      }
      if (!controller.signal.aborted && !terminal)
        timer = setTimeout(() => {
          void load(false)
        }, 2500)
    }
    void load(true)
    return () => {
      alive.current = false
      controller.abort()
      clearTimeout(timer)
      generation.current += 1
    }
  }, [roomId, retry])

  async function act(action: () => Promise<void>) {
    if (actionLock.current) return
    actionLock.current = true
    generation.current += 1
    setPending(true)
    setError('')
    try {
      await action()
    } catch (cause) {
      if (alive.current)
        setError(
          cause instanceof Error
            ? cause.message
            : 'Không thực hiện được thao tác. Vui lòng thử lại.',
        )
    } finally {
      actionLock.current = false
      if (alive.current) setPending(false)
    }
  }

  if (removed)
    return (
      <main className="game-room-page">
        <GameNoticeDialog
          message={removed}
          onClose={() => navigate('/games', { replace: true })}
        />
      </main>
    )
  if (!room || room.id !== roomId)
    return (
      <main className="game-room-page">
        <div
          className="game-panel game-state"
          role={error ? 'alert' : 'status'}
        >
          <p>{error || 'Đang tải phòng chơi…'}</p>
          {error && (
            <Button
              variant="outline"
              onClick={() => {
                setError('')
                setRetry((v) => v + 1)
              }}
            >
              Thử lại
            </Button>
          )}
          <Button variant="link" asChild>
            <Link to="/games">Về trò chơi</Link>
          </Button>
        </div>
      </main>
    )
  if (room.playerMode === 'SOLO') return <SoloGameEntry roomId={room.id} />

  const gameType = toGameType(room.gameType)
  const host = room.hostUserId === userId
  const waiting = room.status === 'WAITING'
  const activeMembers = room.members.filter(
    (member) => member.status !== 'LEFT',
  )
  const me = activeMembers.find((member) => member.userId === userId)
  const isReady = me?.status === 'READY'
  const settings = room.settings
  const hostName = room.members
    .find((member) => member.userId === room.hostUserId)
    ?.displayName?.trim()
  const closedMessage = `Chủ phòng${hostName ? ` ${hostName}` : ''} đã đóng phòng.`
  const orderedMembers = [...activeMembers].sort(
    (a, b) => (a.slotNumber ?? 99) - (b.slotNumber ?? 99),
  )
  const slots = Array.from(
    { length: Math.max(room.maxPlayers, activeMembers.length) },
    () => null as (typeof orderedMembers)[number] | null,
  )
  for (const member of orderedMembers) {
    const preferred = member.slotNumber === null ? -1 : member.slotNumber - 1
    const index =
      preferred >= 0 && preferred < slots.length && !slots[preferred]
        ? preferred
        : slots.findIndex((slot) => slot === null)
    if (index >= 0) slots[index] = member
  }

  return (
    <main className="game-room-page">
      <GameNoticeDialog
        message={removed}
        onClose={() => navigate('/games', { replace: true })}
      />
      <p className="game-note" role="status">
        {connected
          ? 'Đã kết nối trực tiếp với phòng.'
          : 'Đang nối lại kết nối trực tiếp. Phòng vẫn được đồng bộ định kỳ.'}
      </p>
      <header className="game-lobby-heading">
        <div>
          <span className="game-eyebrow">
            {gameName[gameType].toUpperCase()} · NHIỀU NGƯỜI
          </span>
          <h1>
            {waiting
              ? 'Sẵn sàng khám phá từ mới?'
              : room.status === 'CLOSED'
                ? 'Phòng đã đóng'
                : 'Phòng đã bắt đầu'}
          </h1>
          <p>Mời bạn bè bằng mã phòng và cùng sẵn sàng.</p>
        </div>
        <Button
          variant="outline"
          onClick={() => setLeaving(true)}
          disabled={pending || !me || !waiting}
        >
          <LogOut /> Rời phòng
        </Button>
      </header>
      <section className="game-panel game-room-summary">
        <div className="game-room-code">
          <span>MÃ PHÒNG</span>
          <strong>{room.roomCode}</strong>
          <Button
            variant="ghost"
            size="icon"
            aria-label="Sao chép mã phòng"
            onClick={async () => {
              try {
                await navigator.clipboard.writeText(room.roomCode)
                toast({ title: 'Đã sao chép mã phòng.', tone: 'success' })
              } catch {
                toast({ title: `Mã phòng: ${room.roomCode}`, tone: 'info' })
              }
            }}
          >
            <Copy />
          </Button>
        </div>
        <div className="game-room-stats">
          {settings ? (
            <RoomSettingsSummary gameType={gameType} settings={settings} />
          ) : (
            <span>Cấu hình phòng chưa khả dụng.</span>
          )}
        </div>
        {host && waiting && settings && (
          <Button
            variant="outline"
            onClick={() => setEditing(true)}
            disabled={pending}
          >
            <Settings2 /> Chỉnh cấu hình
          </Button>
        )}
      </section>
      {error && (
        <div className="game-room-alert" role="alert">
          <p>{error}</p>
          <Button variant="outline" onClick={() => setRetry((v) => v + 1)}>
            Tải lại phòng
          </Button>
        </div>
      )}
      {room.status === 'CLOSED' ? (
        <section className="game-panel game-state" role="status">
          <p>{closedMessage} Bạn có thể tạo hoặc tham gia phòng khác.</p>
          <Button asChild>
            <Link to="/games">Về trò chơi</Link>
          </Button>
        </section>
      ) : (
        <>
          <section
            className="game-player-grid"
            aria-label="Người chơi trong phòng"
          >
            {slots.map((member, i) => (
              <article
                className={`game-player-card ${member ? '' : 'game-player-empty'}`}
                key={member?.userId ?? `empty-${i}`}
              >
                {member ? (
                  <>
                    <div className="game-player-avatar" aria-hidden="true">
                      {(member.displayName?.trim() || 'N')
                        .charAt(0)
                        .toUpperCase()}
                    </div>
                    <h2>
                      {member.displayName?.trim() || 'Người chơi'}
                      {member.userId === userId && <small> (Bạn)</small>}
                    </h2>
                    <p className="game-player-role">
                      {member.userId === room.hostUserId ? (
                        <>
                          <Crown size={15} /> Chủ phòng
                        </>
                      ) : (
                        'Người chơi'
                      )}
                    </p>
                    <span
                      className={`game-readiness ${member.status === 'READY' ? 'game-readiness-ready' : ''}`}
                    >
                      {member.status === 'READY' ? (
                        <>
                          <Check size={16} /> Sẵn sàng
                        </>
                      ) : (
                        'Chưa sẵn sàng'
                      )}
                    </span>
                    {host && waiting && member.userId !== userId && (
                      <Button
                        variant="outline"
                        disabled={pending}
                        onClick={() => setKicking(member)}
                      >
                        Mời rời phòng
                      </Button>
                    )}
                  </>
                ) : (
                  <>
                    <div className="game-player-avatar">
                      <Plus aria-hidden="true" />
                    </div>
                    <h2>Vị trí trống</h2>
                    <p>Chờ người chơi</p>
                  </>
                )}
              </article>
            ))}
          </section>
          <section className="game-panel game-lobby-actions">
            <div className="game-actions">
              {waiting && me && (
                <Button
                  variant={isReady ? 'outline' : 'default'}
                  disabled={pending}
                  onClick={() =>
                    void act(async () => {
                      const next = await gameApi.ready(room.id, !isReady)
                      if (alive.current) updateRoom(next)
                    })
                  }
                >
                  <Check />
                  {pending
                    ? 'Đang cập nhật…'
                    : isReady
                      ? 'Hủy sẵn sàng'
                      : 'Sẵn sàng'}
                </Button>
              )}
              {host && (
                <Button
                  disabled={pending || !waiting || !room.canStart}
                  onClick={() =>
                    void act(async () => {
                      const match = await gameApi.start(room.id)
                      if (alive.current)
                        navigate(playPath(gameType, match.matchId))
                    })
                  }
                >
                  {pending ? 'Đang xử lý…' : 'Bắt đầu chơi'}
                </Button>
              )}
            </div>
            <p>
              {!waiting
                ? 'Phòng không còn ở trạng thái chờ.'
                : host
                  ? room.canStart
                    ? 'Mọi người đã sẵn sàng. Bạn có thể bắt đầu.'
                    : 'Cần ít nhất 2 người và tất cả đều sẵn sàng.'
                  : 'Sẵn sàng rồi chờ chủ phòng bắt đầu.'}
            </p>
          </section>
          <p className="game-lobby-footnote">
            {`Tối đa ${room.maxPlayers} người. Chủ phòng rời sẽ đóng phòng với mọi người.`}{' '}
            Lưu cấu hình sẽ hủy trạng thái sẵn sàng.
          </p>
        </>
      )}
      {editing && host && waiting && (
        <RoomSettingsDialog
          room={room}
          onClose={() => setEditing(false)}
          onSaved={(next) => {
            generation.current += 1
            updateRoom(next)
            toast({ title: 'Đã lưu cấu hình. Mọi người cần sẵn sàng lại.', tone: 'success' })
          }}
        />
      )}
      <Dialog
        open={Boolean(kicking) && waiting}
        onOpenChange={(open) => {
          if (!pending && !open) setKicking(null)
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Mời người chơi rời phòng?</DialogTitle>
            <DialogDescription>
              {kicking?.displayName || 'Người chơi'} sẽ rời sảnh chờ.
            </DialogDescription>
          </DialogHeader>
          <div className="game-actions">
            <Button
              variant="outline"
              disabled={pending}
              onClick={() => setKicking(null)}
            >
              Hủy
            </Button>
            <Button
              variant="destructive"
              disabled={pending}
              onClick={() =>
                void act(async () => {
                  if (!kicking) return
                  const next = await gameApi.kick(room.id, kicking.userId)
                  if (alive.current) {
                    updateRoom(next)
                    setKicking(null)
                  }
                })
              }
            >
              Xác nhận
            </Button>
          </div>
        </DialogContent>
      </Dialog>
      <Dialog
        open={leaving && waiting}
        onOpenChange={(open) => {
          if (!pending) setLeaving(open)
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {host ? 'Đóng phòng và rời đi?' : 'Rời phòng chơi?'}
            </DialogTitle>
            <DialogDescription>
              {host
                ? 'Bạn là chủ phòng. Rời phòng sẽ đóng phòng với mọi người.'
                : 'Bạn sẽ rời sảnh chờ. Có thể tham gia lại bằng mã phòng nếu phòng còn mở.'}
            </DialogDescription>
          </DialogHeader>
          <div className="game-actions">
            <Button
              variant="outline"
              disabled={pending}
              onClick={() => setLeaving(false)}
            >
              Ở lại
            </Button>
            <Button
              variant="destructive"
              disabled={pending}
              onClick={() =>
                void act(async () => {
                  await gameApi.leaveRoom(room.id)
                  if (alive.current) navigate('/games')
                })
              }
            >
              {pending ? 'Đang rời…' : 'Rời phòng'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </main>
  )
}
