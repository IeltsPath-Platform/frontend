import { Flame, Heart, RotateCcw, Zap } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { learningApi } from '../api'
import { useApiResource } from '../lib/useApiResource'
import styles from './LearnerQuickStats.module.css'

const numberFormat = new Intl.NumberFormat('vi-VN')

/** Loads the learner's current hearts, earned XP and streak when the account dropdown opens. */
export function LearnerQuickStats() {
  const hearts = useApiResource('account-hearts', () => learningApi.getHearts())
  const progress = useApiResource('account-progress', () => learningApi.getProgress())
  const streak = useApiResource('account-streak', () => learningApi.getStreak())

  return (
    <section className={styles.stats} aria-label="Tim, XP và streak của bạn">
      <section className={`${styles.stat} ${styles.hearts}`} aria-labelledby="account-hearts-label" aria-busy={hearts.status === 'loading'}>
        <div className={styles.label}><Heart aria-hidden="true" size={17} /><h3 id="account-hearts-label">Tim</h3></div>
        {hearts.data ? (
          <>
            <p className={styles.value}>{numberFormat.format(hearts.data.hearts)}<span> / {numberFormat.format(hearts.data.maxHearts)}</span></p>
            <p className={styles.caption}>{hearts.data.hearts === 0 ? 'Đang hồi phục' : hearts.data.hearts >= hearts.data.maxHearts ? 'Đã hồi đầy tim' : 'Sẵn sàng luyện tập'}</p>
          </>
        ) : hearts.status === 'error' ? (
          <div className={styles.unavailable}>
            <p>Chưa tải được tim</p>
            <Button type="button" variant="ghost" className={styles.retry} onClick={hearts.reload}><RotateCcw aria-hidden="true" size={13} />Thử lại tim</Button>
          </div>
        ) : <p className={styles.loading} role="status">Đang tải tim…</p>}
      </section>
      <section className={`${styles.stat} ${styles.xp}`} aria-labelledby="account-xp-label" aria-busy={progress.status === 'loading'}>
        <div className={styles.label}><Zap aria-hidden="true" size={17} /><h3 id="account-xp-label">XP tích lũy</h3></div>
        {progress.data ? (
          <>
            <p className={styles.value}>{numberFormat.format(progress.data.totalXp)}<span> XP</span></p>
            <p className={styles.caption}>Cấp {numberFormat.format(progress.data.level)} · +{numberFormat.format(progress.data.xpToday)} XP hôm nay</p>
          </>
        ) : progress.status === 'error' ? (
          <div className={styles.unavailable}>
            <p>Chưa tải được XP</p>
            <Button type="button" variant="ghost" className={styles.retry} onClick={progress.reload}><RotateCcw aria-hidden="true" size={13} />Thử lại XP</Button>
          </div>
        ) : <p className={styles.loading} role="status">Đang tải XP…</p>}
      </section>
      <section className={`${styles.stat} ${styles.streak}`} aria-labelledby="account-streak-label" aria-busy={streak.status === 'loading'}>
        <div className={styles.streakCopy}>
          <div className={styles.label}><Flame aria-hidden="true" size={17} /><h3 id="account-streak-label">Streak</h3></div>
          {streak.data && (
            <p className={styles.caption}>
              {streak.data.currentDays === 0
                ? streak.data.lostStreakDays > 0 ? 'Bắt đầu lại hôm nay' : 'Học để bắt đầu chuỗi'
                : streak.data.activeToday ? 'Đã học hôm nay' : 'Học hôm nay để giữ chuỗi'}
            </p>
          )}
        </div>
        {streak.data ? (
          <div className={styles.streakCount}>
            <p className={styles.value}>{numberFormat.format(streak.data.currentDays)}<span> ngày</span></p>
            <p className={styles.caption}>Kỷ lục {numberFormat.format(streak.data.longestDays)} ngày</p>
          </div>
        ) : streak.status === 'error' ? (
          <div className={styles.unavailable}>
            <p>Chưa tải được streak</p>
            <Button type="button" variant="ghost" className={styles.retry} onClick={streak.reload}><RotateCcw aria-hidden="true" size={13} />Thử lại streak</Button>
          </div>
        ) : <p className={styles.loading} role="status">Đang tải streak…</p>}
      </section>
    </section>
  )
}
