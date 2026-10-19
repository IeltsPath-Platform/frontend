import { useEffect, useState } from 'react'
import { Link, useLocation, useParams } from 'react-router-dom'
import { Trophy, Flame, Target, Clock } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useAuthSession } from '@/features/auth/authSession'
import { gameApi } from '../api/gameApi'
import type { GameResult } from '../types/game'
import { GameRanking } from '../components/GameRanking'
import { GameNoticeDialog } from '../components/GameNoticeDialog'
import { recalledMatchHost, rememberMatchHost } from '../lib/matchRoomContext'
import { HttpError } from '@/lib/httpClient'

export function GameResultPage() {
  const { matchId = '' } = useParams()
  const { email } = useAuthSession()
  return <ResultContent key={`${email}:${matchId}`} matchId={matchId} />
}
type ResultContentProps = {
  matchId: string
}

function ResultContent({ matchId }: ResultContentProps) {
  const location = useLocation()
  const [result, setResult] = useState<GameResult | null>(null)
  const [roomId, setRoomId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [version, reload] = useState(0)
  const [closedMessage, setClosedMessage] = useState('')
  useEffect(() => {
    const controller = new AbortController()
    gameApi.result(matchId, controller.signal).then(
      async (data) => {
        if (controller.signal.aborted) return
        setResult(data)
        setError(null)
        let recoveredHostId = recalledMatchHost(matchId)
        if (
          data.playerMode === 'MULTIPLAYER' &&
          data.endReason !== 'PLAYER_LEFT'
        ) {
          try {
            const match = await gameApi.match(matchId, controller.signal)
            const room = await gameApi.room(match.roomId, controller.signal)
            recoveredHostId = room.hostUserId
            rememberMatchHost(matchId, room.hostUserId)
            if (
              !controller.signal.aborted &&
              room.status === 'WAITING' &&
              room.members.some(
                (member) =>
                  member.userId === data.player.userId &&
                  member.status !== 'LEFT',
              )
            )
              setRoomId(match.roomId)
          } catch (reason) {
            if (
              !controller.signal.aborted &&
              data.playerMode === 'MULTIPLAYER' &&
              !recoveredHostId &&
              reason instanceof HttpError &&
              reason.status === 404
            )
              setClosedMessage(
                'Phòng không còn khả dụng với bạn. Kết quả trận đấu vẫn được giữ lại.',
              )
          }
        }
        const state = location.state as {
          hostUserId?: string
          closedMessage?: string
        } | null
        const hostId = state?.hostUserId ?? recoveredHostId
        const host = data.players?.find((player) => player.userId === hostId)
        if (host?.status === 'FORFEITED' && !controller.signal.aborted)
          setClosedMessage(
            `Chủ phòng ${host.displayName || 'người chơi'} đã đóng phòng. Kết quả trận đấu vẫn được giữ lại.`,
          )
        else if (state?.closedMessage && !controller.signal.aborted)
          setClosedMessage(state.closedMessage)
      },
      (reason: unknown) => {
        if (!controller.signal.aborted)
          setError(
            reason instanceof Error
              ? reason.message
              : 'Không tải được kết quả.',
          )
      },
    )
    return () => controller.abort()
  }, [matchId, version, location.state])
  return (
    <main className="games-page">
      <p className="games-eyebrow">TRÒ CHƠI / WORDLY</p>
      <header className="games-heading">
        <h1>
          {result?.playerMode === 'MULTIPLAYER'
            ? 'Tổng kết trận đấu'
            : !result
              ? 'Kết quả phiên chơi'
              : result.endReason === 'WORD_LIMIT_REACHED'
                ? 'Hoàn thành bộ từ!'
                : result.endReason === 'PLAYER_LEFT'
                  ? 'Đã thoát trò chơi'
                  : 'Bạn đã hết mạng'}
        </h1>
        <Trophy size={40} aria-hidden="true" />
      </header>
      {error && (
        <div className="games-alert" role="alert">
          <p>{error}</p>
          <Button onClick={() => reload((v) => v + 1)}>Thử lại</Button>
          <Link to={`/games/matches/${matchId}/play`}>Quay lại lượt chơi</Link>
        </div>
      )}
      {!result && !error && <p role="status">Đang tải kết quả…</p>}
      {result && (
        <section className="games-result-card" aria-label="Kết quả chính thức">
          <p className="games-eyebrow">
            KẾT QUẢ CÁ NHÂN · {result.player.displayName ?? 'Bạn'}
          </p>
          <div className="games-result-score">
            {result.player.totalScore}
            <span> tổng điểm</span>
          </div>
          <p>
            {result.player.baseScore} điểm cơ bản + {result.player.bonusScore}{' '}
            điểm chuỗi
          </p>
          <dl className="games-result-stats">
            <div>
              <dt>
                <Target />
                Từ đúng
              </dt>
              <dd>
                {result.player.wordsSolved}/{result.player.wordsProcessed}
              </dd>
            </div>
            <div>
              <dt>
                <Flame />
                Chuỗi tốt nhất
              </dt>
              <dd>{result.player.bestStreak}</dd>
            </div>
            <div>
              <dt>
                <Clock />
                Thời gian
              </dt>
              <dd>
                {Math.floor(result.durationMs / 60000)} phút{' '}
                {Math.floor(result.durationMs / 1000) % 60} giây
              </dd>
            </div>
          </dl>
          {result.playerMode === 'MULTIPLAYER' && result.players && (
            <GameRanking
              ranking={{
                matchId,
                status: result.status,
                playerMode: result.playerMode,
                isFinal: true,
                serverTime: result.endedAt,
                players: result.players,
              }}
              ownUserId={result.player.userId}
            />
          )}
          <div className="games-actions">
            <Button asChild>
              <Link
                to={
                  result.playerMode === 'SOLO'
                    ? '/games/wordly/setup?mode=SOLO'
                    : roomId
                      ? `/games/rooms/${roomId}`
                      : `/games/wordly/setup?mode=${result.playerMode}`
                }
              >
                {result.playerMode === 'SOLO'
                  ? 'Chơi lại'
                  : roomId
                    ? 'Về phòng chờ'
                    : 'Tạo phòng mới'}
              </Link>
            </Button>
            <Button asChild variant="outline">
              <Link to="/games">Chọn trò chơi</Link>
            </Button>
            <Button asChild variant="ghost">
              <Link to="/overview">Về trang chủ</Link>
            </Button>
          </div>
        </section>
      )}
      <GameNoticeDialog
        message={closedMessage}
        onClose={() => setClosedMessage('')}
      />
    </main>
  )
}
