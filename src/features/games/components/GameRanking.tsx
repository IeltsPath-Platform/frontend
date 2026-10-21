import { useEffect, useState } from 'react'
import { Heart, Trophy } from 'lucide-react'
import type { GameRanking as Ranking, RankingPlayer } from '../types/game'

import { playerStatusLabel } from '../lib/playerStatusLabel'

type GameRankingProps = {
  ranking: Ranking
  ownUserId?: string
}

function graceDeadline(player: RankingPlayer, ranking: Ranking) {
  return !ranking.isFinal &&
    player.status === 'DISCONNECTED' &&
    player.reconnectDeadlineAt
    ? Date.parse(player.reconnectDeadlineAt)
    : null
}

/** Ticks only while someone is inside the reconnect grace; null until the first fresh reading. */
function useGraceClock(active: boolean) {
  const [now, setNow] = useState<number | null>(null)
  useEffect(() => {
    if (!active) return
    const tick = () => setNow(Date.now())
    const first = window.setTimeout(tick, 0)
    const timer = window.setInterval(tick, 500)
    return () => {
      window.clearTimeout(first)
      window.clearInterval(timer)
      // A later countdown must not start from this stale reading.
      setNow(null)
    }
  }, [active])
  return now
}

export function GameRanking({ ranking, ownUserId }: GameRankingProps) {
  const now = useGraceClock(
    ranking.players.some((player) => graceDeadline(player, ranking) !== null),
  )
  function statusText(player: RankingPlayer) {
    const label = playerStatusLabel[player.status] ?? player.status
    const deadline = graceDeadline(player, ranking)
    if (deadline === null || now === null) return label
    const seconds = Math.max(0, Math.ceil((deadline - now) / 1000))
    return seconds > 0
      ? `${label} · tự rời trận sau ${seconds} giây`
      : `${label} · đang xử lý rời trận…`
  }
  return (
    <section
      className={`game-ranking${ranking.isFinal ? ' game-ranking-final' : ''}`}
      aria-label={ranking.isFinal ? 'Xếp hạng cuối trận' : 'Xếp hạng trực tiếp'}
    >
      <h2>
        <Trophy aria-hidden="true" />
        {ranking.isFinal ? 'Xếp hạng cuối trận' : 'Xếp hạng trực tiếp'}
      </h2>
      <p className="games-muted">
        Tổng điểm giảm dần · Bằng điểm xét thời gian giải đúng và thời điểm đạt
        điểm.
      </p>
      <div className="game-ranking-scroll">
        <table>
          <thead>
            <tr>
              <th scope="col">Hạng</th>
              <th scope="col">Người chơi</th>
              <th scope="col">Điểm</th>
              <th scope="col">Từ đúng</th>
              {!ranking.isFinal && <th scope="col">Mạng</th>}
              <th scope="col">Thời gian giải đúng</th>
            </tr>
          </thead>
          <tbody>
            {[...ranking.players]
              .sort((a, b) => a.rank - b.rank)
              .map((player) => (
                <tr
                  key={player.userId}
                  className={
                    player.status === 'FORFEITED'
                      ? 'game-ranking-left'
                      : player.userId === ownUserId
                        ? 'game-ranking-me'
                        : ''
                  }
                >
                  <td className="game-ranking-position">
                    <strong>#{player.rank}</strong>
                  </td>
                  <th scope="row">
                    {player.displayName || 'Người chơi'}
                    {player.userId === ownUserId && ' (Bạn)'}
                    <small
                      className={
                        graceDeadline(player, ranking) !== null
                          ? 'game-ranking-grace'
                          : undefined
                      }
                    >
                      {statusText(player)}
                    </small>
                  </th>
                  <td data-label="Điểm">
                    <strong>{player.totalScore}</strong>
                  </td>
                  <td data-label="Từ đúng">
                    {player.wordsSolved}/{player.wordsProcessed}
                  </td>
                  {!ranking.isFinal && (
                    <td data-label="Mạng">
                      <Heart size={14} aria-hidden="true" />{' '}
                      {player.livesRemaining}
                    </td>
                  )}
                  <td data-label="Thời gian giải đúng">
                    {(player.totalSolveTimeMs / 1000).toFixed(1)} giây
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>
    </section>
  )
}
