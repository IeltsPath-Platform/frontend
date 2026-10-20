import { Award, CheckCircle2, Circle, Heart, X } from 'lucide-react'
import { Link } from 'react-router-dom'
import { levelFraction, questReward, questTitle } from '@/features/learning-path/lib/progressMeta'
import { badgesToEarn, type OwlSnapshot, type OwlTab } from './owl-messages'
import styles from './OwlPanel.module.css'

interface OwlPanelProps {
  snapshot: OwlSnapshot
  tab: OwlTab
  onTab: (tab: OwlTab) => void
  onClose: () => void
}

/** Level, XP and hearts at a glance. */
function Summary({ snapshot }: { snapshot: OwlSnapshot }) {
  const { progress, hearts } = snapshot
  return (
    <div className={styles.summary}>
      {progress ? (
        <div className={styles.level}>
          <div className={styles.levelHead}>
            <strong>Cấp {progress.level}</strong>
            <span>{progress.xpToNextLevel} XP nữa lên cấp {progress.level + 1}</span>
          </div>
          <progress aria-label="Tiến độ lên cấp" className={styles.meter} max={1} value={levelFraction(progress)} />
        </div>
      ) : null}
      {hearts ? (
        <span aria-label={`${hearts.hearts} trên ${hearts.maxHearts} tim`} className={styles.hearts}>
          <Heart aria-hidden="true" fill="currentColor" size={16} />
          {hearts.hearts}/{hearts.maxHearts}
        </span>
      ) : null}
    </div>
  )
}

function Quests({ snapshot }: { snapshot: OwlSnapshot }) {
  const daily = snapshot.quests
  if (!daily) return <p className={styles.empty}>Đang tải nhiệm vụ…</p>
  if (daily.quests.length === 0) return <p className={styles.empty}>Hôm nay chưa có nhiệm vụ nào.</p>
  return (
    <>
      <p className={styles.hint}>Hoàn thành {daily.completed}/{daily.quests.length} nhiệm vụ hôm nay.</p>
      <ul className={styles.list}>
        {daily.quests.map((quest) => {
          const progress = Math.min(quest.progress, quest.required)
          return (
            <li className={`${styles.item}${quest.completed ? ` ${styles.done}` : ''}`} key={quest.type}>
              <span aria-hidden="true" className={styles.icon}>
                {quest.completed ? <CheckCircle2 size={18} /> : <Circle size={18} />}
              </span>
              <div className={styles.body}>
                <p className={styles.title}>{questTitle(quest)}</p>
                <label className={styles.row}>
                  <span>{quest.completed ? 'Đã xong' : `${progress}/${quest.required}`}</span>
                  <progress className={styles.meter} max={quest.required} value={progress} />
                </label>
              </div>
              <span className={styles.reward}>{questReward(quest)}</span>
            </li>
          )
        })}
      </ul>
    </>
  )
}

function Badges({ snapshot }: { snapshot: OwlSnapshot }) {
  const { badges } = snapshot
  if (!badges) return <p className={styles.empty}>Đang tải huy hiệu…</p>
  const held = badges.filter((badge) => badge.awarded).length
  const next = badgesToEarn(badges)
  return (
    <>
      <p className={styles.hint}>Bạn đã nhận {held}/{badges.length} huy hiệu.</p>
      {next.length === 0 ? (
        <p className={styles.empty}>Không còn huy hiệu nào đang đếm tiến độ.</p>
      ) : (
        <ul className={styles.list}>
          {next.map(({ badge, current, target, ratio }) => (
            <li className={styles.item} key={badge.code}>
              <span aria-hidden="true" className={styles.icon}><Award size={18} /></span>
              <div className={styles.body}>
                <p className={styles.title}>{badge.name}</p>
                <p className={styles.desc}>{badge.description}</p>
                <label className={styles.row}>
                  <span>{current}/{target}</span>
                  <progress className={styles.meter} data-near={ratio >= 0.5 || undefined} max={target} value={current} />
                </label>
              </div>
              {badge.rewardPoints > 0 ? <span className={styles.reward}>+{badge.rewardPoints} điểm</span> : null}
            </li>
          ))}
        </ul>
      )}
    </>
  )
}

/** Detail panel of the owl: today's quests and the badges still to earn. It floats; it never blocks the page. */
export function OwlPanel({ snapshot, tab, onTab, onClose }: OwlPanelProps) {
  return (
    <section aria-label="Nhiệm vụ và huy hiệu" className={styles.panel}>
      <header className={styles.head}>
        <div className={styles.tabs} role="tablist">
          <button aria-selected={tab === 'quests'} onClick={() => onTab('quests')} role="tab" type="button">Nhiệm vụ</button>
          <button aria-selected={tab === 'badges'} onClick={() => onTab('badges')} role="tab" type="button">Huy hiệu</button>
        </div>
        <button aria-label="Đóng" className={styles.close} onClick={onClose} type="button">
          <X aria-hidden="true" size={16} />
        </button>
      </header>
      <Summary snapshot={snapshot} />
      <div className={styles.content} role="tabpanel">
        {tab === 'quests' ? <Quests snapshot={snapshot} /> : <Badges snapshot={snapshot} />}
      </div>
      <Link className={styles.more} onClick={onClose} to="/learn/progress">Xem trang thành tích</Link>
    </section>
  )
}
