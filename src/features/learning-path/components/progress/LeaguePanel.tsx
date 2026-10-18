import { useState } from 'react'
import { History, Trophy } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { League } from '~types/learningPath'
import { learningApi } from '../../api'
import {
  formatUtcDate,
  leagueOutcomeLabel,
  leagueTierLabel,
  leagueZoneLabel,
} from '../../lib/progressMeta'
import { useApiResource } from '../../lib/useApiResource'

const HISTORY_WEEKS = 8

/**
 * This week's league table of the learner's group. The week runs from Sunday 00:00 to the next Sunday 00:00 UTC, and the
 * table shows display names only.
 */
export function LeaguePanel({ league }: { league: League }) {
  const [showHistory, setShowHistory] = useState(false)

  return (
    <div className="lp-league">
      <p className="lp-league__tier">
        <Trophy aria-hidden="true" size={20} />
        <b>Hạng {leagueTierLabel(league.tier)}</b>
        <span>Tuần bắt đầu {formatUtcDate(league.weekStart)}, chốt {formatUtcDate(league.closesAt)} (giờ UTC)</span>
      </p>

      {league.joined ? (
        <>
          <p className="lp-hint">
            Top {league.promoteTop} lên hạng. Nhóm có từ {league.demoteFrom} người trở lên thì thứ hạng từ {league.demoteFrom}{' '}
            trở xuống bị xuống hạng; nhóm nhỏ hơn không ai xuống hạng.
          </p>
          <table className="lp-league__table">
            <caption className="lp-sr-only">Bảng xếp hạng tuần này</caption>
            <thead>
              <tr><th scope="col">Hạng</th><th scope="col">Học viên</th><th scope="col">XP tuần</th><th scope="col">Khu vực</th></tr>
            </thead>
            <tbody>
              {league.table.map((row) => (
                <tr className={row.you ? 'is-you' : undefined} key={row.rank}>
                  <th scope="row">{row.rank}</th>
                  <td>{row.you ? 'Bạn' : (row.displayName ?? 'Học viên ẩn danh')}</td>
                  <td>{row.weeklyXp}</td>
                  <td>{leagueZoneLabel(row.zone)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      ) : (
        <p className="lp-empty">Kiếm XP trong tuần này để vào bảng xếp hạng.</p>
      )}

      <Button
        aria-expanded={showHistory}
        className="lp-btn"
        onClick={() => setShowHistory((open) => !open)}
        type="button"
        variant="outline"
      >
        <History aria-hidden="true" size={16} />
        {showHistory ? 'Ẩn lịch sử các tuần' : 'Xem lịch sử các tuần'}
      </Button>
      {showHistory ? <LeagueHistory /> : null}
    </div>
  )
}

function LeagueHistory() {
  const history = useApiResource('league-history', () => learningApi.getLeagueHistory(HISTORY_WEEKS))
  if (history.status === 'loading') return <p className="lp-hint" role="status">Đang tải lịch sử…</p>
  if (history.error) {
    return (
      <div className="lp-error" role="alert">
        <p>{history.error.message}</p>
        <Button className="lp-btn" onClick={history.reload} type="button" variant="outline">Thử lại</Button>
      </div>
    )
  }
  if (!history.data || history.data.length === 0) return <p className="lp-empty">Chưa có tuần nào đã chốt.</p>
  return (
    <ol className="lp-league__history" aria-label="Lịch sử các tuần đã chốt">
      {history.data.map((week) => (
        <li key={week.weekStart}>
          <span>Tuần {formatUtcDate(week.weekStart)}</span>
          <span>{leagueTierLabel(week.tier)} · hạng {week.finalRank} · {week.weeklyXp} XP</span>
          <b>{leagueOutcomeLabel(week.outcome)}</b>
        </li>
      ))}
    </ol>
  )
}
