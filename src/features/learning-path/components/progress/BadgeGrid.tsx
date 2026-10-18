import { Award, Lock } from 'lucide-react'
import type { Badge } from '~types/learningPath'

/** Badges the learner holds and the ones still to earn. A badge is awarded once and never taken back. */
export function BadgeGrid({ badges }: { badges: Badge[] }) {
  if (badges.length === 0) return <p className="lp-empty">Chưa có huy hiệu nào.</p>
  const held = badges.filter((badge) => badge.awarded).length
  return (
    <>
      <p className="lp-hint" role="status">Bạn đã nhận {held}/{badges.length} huy hiệu.</p>
      <ul className="lp-badges">
        {badges.map((badge) => (
          <li className={`lp-badge${badge.awarded ? ' is-awarded' : ''}`} key={badge.code}>
            <span aria-hidden="true" className="lp-badge__icon">
              {badge.awarded ? <Award size={22} /> : <Lock size={20} />}
            </span>
            <div className="lp-badge__body">
              <h3 className="lp-badge__name">{badge.name}</h3>
              <p className="lp-badge__desc">{badge.description}</p>
              {badge.awarded && badge.awardedAt ? (
                <p className="lp-badge__state">Đã nhận ngày {new Date(badge.awardedAt).toLocaleDateString('vi-VN')}</p>
              ) : badge.progress ? (
                <label className="lp-badge__meter">
                  <span>{Math.min(badge.progress.current, badge.progress.target)}/{badge.progress.target}</span>
                  <progress max={badge.progress.target} value={Math.min(badge.progress.current, badge.progress.target)} />
                </label>
              ) : (
                <p className="lp-badge__state">Chưa đạt</p>
              )}
            </div>
            {badge.rewardPoints > 0 ? <span className="lp-badge__reward">+{badge.rewardPoints} điểm</span> : null}
          </li>
        ))}
      </ul>
    </>
  )
}
