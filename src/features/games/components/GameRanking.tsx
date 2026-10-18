import { Heart, Trophy } from 'lucide-react'
import type { GameRanking as Ranking } from '../types/game'

import { playerStatusLabel } from '../lib/playerStatusLabel'

type GameRankingProps = {
  ranking: Ranking
  ownUserId?: string
}

export function GameRanking({ ranking, ownUserId }: GameRankingProps) {
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
                    <small>
                      {playerStatusLabel[player.status] ?? player.status}
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
