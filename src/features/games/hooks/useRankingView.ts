import { useEffect, useState } from 'react'
import type { GameRanking, RankingPlayer } from '../types/game'
import { playerStatusLabel } from '../lib/playerStatusLabel'

/** Shared by the Wordly ranking table and the Rocket ranking panel. */
export function graceDeadline(player: RankingPlayer, ranking: GameRanking) {
  return !ranking.isFinal &&
    player.status === 'DISCONNECTED' &&
    player.reconnectDeadlineAt
    ? Date.parse(player.reconnectDeadlineAt)
    : null
}

export function rankedPlayers(ranking: GameRanking) {
  return [...ranking.players].sort((a, b) => a.rank - b.rank)
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

/** Status text per player, counting down the reconnect grace of DISCONNECTED players. */
export function useRankingStatus(ranking: GameRanking) {
  const now = useGraceClock(
    ranking.players.some((player) => graceDeadline(player, ranking) !== null),
  )
  return (player: RankingPlayer) => {
    const label = playerStatusLabel[player.status] ?? player.status
    const deadline = graceDeadline(player, ranking)
    if (deadline === null || now === null) return label
    const seconds = Math.max(0, Math.ceil((deadline - now) / 1000))
    return seconds > 0
      ? `${label} · tự rời trận sau ${seconds} giây`
      : `${label} · đang xử lý rời trận…`
  }
}
