import { useState } from 'react'
import { Skull, Trophy } from 'lucide-react'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { graceDeadline, rankedPlayers, useRankingStatus } from '../../hooks/useRankingView'
import type { GameRanking, RankingPlayer } from '../../types/game'

type RocketRankingPanelProps = {
  ranking: GameRanking
  ownUserId: string | null
  /** Players who answered the open round; the choice itself is never shown. */
  answeredUserIds?: string[]
  /** End screen: the final list only, without the mobile strip. */
  final?: boolean
}

const OUT = new Set(['ELIMINATED', 'FORFEITED'])

function playerName(player: RankingPlayer, ownUserId: string | null) {
  return player.userId === ownUserId ? 'Bạn' : player.displayName?.trim() || 'Người chơi'
}

/** Slot colours match the lobby seats (1–4). */
function slotClass(player: RankingPlayer) {
  return `is-slot-${((player.slotNumber ?? player.rank) - 1) % 4 + 1}`
}

function RankingList({ ranking, ownUserId, answeredUserIds = [] }: RocketRankingPanelProps) {
  const statusText = useRankingStatus(ranking)
  return (
    <ol className="rocket-ranking-list">
      {rankedPlayers(ranking).map((player) => {
        const out = OUT.has(player.status)
        const grace = graceDeadline(player, ranking) !== null
        const answered = !ranking.isFinal && !out && answeredUserIds.includes(player.userId)
        const className = [
          'rocket-ranking-row',
          player.userId === ownUserId ? 'is-me' : '',
          out ? 'is-out' : '',
        ].join(' ')
        return (
          <li key={player.userId} className={className}>
            <span className="rocket-ranking-rank">{player.rank}</span>
            <span className={`rocket-ranking-dot ${slotClass(player)}`} aria-hidden="true" />
            <span className="rocket-ranking-name">
              {playerName(player, ownUserId)}
              {(out || grace || ranking.isFinal) && (
                <small className={grace ? 'is-grace' : undefined}>{statusText(player)}</small>
              )}
            </span>
            {answered && (
              <span className="rocket-ranking-answered" role="img" aria-label="đã trả lời" title="Đã trả lời" />
            )}
            {out && !ranking.isFinal ? (
              <Skull size={16} aria-hidden="true" className="rocket-ranking-out" />
            ) : null}
            <strong className="rocket-ranking-score">{player.totalScore}</strong>
          </li>
        )
      })}
    </ol>
  )
}

/** Multiplayer ranking: a column on the right on wide screens, an avatar strip with a full sheet on phones. */
export function RocketRankingPanel(props: RocketRankingPanelProps) {
  const { ranking, ownUserId, answeredUserIds = [], final = false } = props
  const [sheetOpen, setSheetOpen] = useState(false)
  const title = ranking.isFinal ? 'Xếp hạng cuối trận' : 'Xếp hạng trực tiếp'

  if (final)
    return (
      <section className="rocket-ranking is-final" aria-label={title}>
        <h3>
          <Trophy size={18} aria-hidden="true" /> {title}
        </h3>
        <RankingList {...props} />
      </section>
    )

  return (
    <>
      <aside className="rocket-ranking is-live" aria-label={title}>
        <RankingList {...props} />
      </aside>
      <button
        type="button"
        className="rocket-ranking-strip"
        aria-label={`${title}. Mở bảng đầy đủ`}
        onClick={() => setSheetOpen(true)}
      >
        {rankedPlayers(ranking).map((player) => (
          <span
            key={player.userId}
            className={[
              'rocket-ranking-avatar',
              slotClass(player),
              player.userId === ownUserId ? 'is-me' : '',
              OUT.has(player.status) ? 'is-out' : '',
            ].join(' ')}
          >
            <span aria-hidden="true">{playerName(player, ownUserId).charAt(0).toUpperCase()}</span>
            <small>{player.totalScore}</small>
            {answeredUserIds.includes(player.userId) && <span className="rocket-ranking-answered" aria-hidden="true" />}
          </span>
        ))}
      </button>
      <Dialog open={sheetOpen} onOpenChange={setSheetOpen}>
        <DialogContent className="rocket-ranking-sheet">
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
            <DialogDescription>Tổng điểm giảm dần. Lựa chọn của người khác không được hiển thị.</DialogDescription>
          </DialogHeader>
          <RankingList {...props} />
        </DialogContent>
      </Dialog>
    </>
  )
}
