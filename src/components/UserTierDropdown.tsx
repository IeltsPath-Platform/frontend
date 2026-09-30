import { useState } from 'react'
import styles from './UserTierDropdown.module.css'

export type UserTier = 'FREE' | 'PREMIUM'

export interface UserTierDropdownProps {
  /** Controls the displayed tier when supplied. Omit it to use the built-in demo state. */
  tier?: UserTier
  /** Initial tier for the built-in demo state. */
  defaultTier?: UserTier
  /** Current learning points shown for a Free-tier learner. */
  points?: number
  /** Learner name used in the avatar and accessible labels. */
  userName?: string
  /** Runs after a tier switch. The next tier is provided, but callbacks may ignore it. */
  onToggleTier?: (nextTier: UserTier) => void
  /** Lets a consuming top bar adjust placement without reaching into this component. */
  className?: string
}

function getInitials(userName: string) {
  const initials = userName
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word.charAt(0))
    .join('')
    .toLocaleUpperCase('vi-VN')

  return initials || 'HV'
}

function normalizePoints(points: number) {
  return Number.isFinite(points) ? Math.max(0, Math.round(points)) : 0
}

export function UserTierDropdown({
  tier,
  defaultTier = 'FREE',
  points = 0,
  userName = 'Học viên',
  onToggleTier,
  className,
}: UserTierDropdownProps) {
  const [demoTier, setDemoTier] = useState<UserTier>(defaultTier)
  const activeTier = tier ?? demoTier
  const nextTier: UserTier = activeTier === 'PREMIUM' ? 'FREE' : 'PREMIUM'
  const isPremium = activeTier === 'PREMIUM'
  const safeUserName = userName.trim() || 'Học viên'
  const safePoints = normalizePoints(points)
  const formattedPoints = new Intl.NumberFormat('vi-VN').format(safePoints)
  const toggleLabel = `Chuyển sang ${nextTier === 'PREMIUM' ? 'Premium' : 'Free'} (demo)`

  function toggleTier() {
    if (tier === undefined) setDemoTier(nextTier)
    onToggleTier?.(nextTier)
  }

  return (
    <details className={[styles.root, isPremium ? styles.isPremium : styles.isFree, className].filter(Boolean).join(' ')}>
      <summary className={styles.trigger} aria-label={`Mở thông tin gói học của ${safeUserName}, ${isPremium ? 'Premium' : `${formattedPoints} Points`}`}>
        <span className={styles.avatarTierWrap} aria-hidden="true">
          {isPremium && <>
            <span className={styles.premiumHaloRing} />
            <span className={`${styles.premiumHaloSparkle} ${styles.sparkleOrbitOne}`} />
            <span className={`${styles.premiumHaloSparkle} ${styles.sparkleOrbitTwo}`} />
            <span className={`${styles.premiumHaloSparkle} ${styles.sparkleOrbitThree}`} />
          </>}
          <span className={styles.avatar}>{getInitials(safeUserName)}</span>
        </span>
        <span className={styles.triggerCopy}>
          <strong>{safeUserName}</strong>
          <span className={styles.tierStatus}>{isPremium ? 'Premium' : `${formattedPoints} Points`}</span>
        </span>
        <span className={styles.chevron} aria-hidden="true" />
      </summary>

      <article className={styles.tierCard} aria-labelledby="user-tier-title">
        <p className={styles.eyebrow}>GÓI HỌC MÔ PHỎNG</p>
        <div className={styles.cardHeading}>
          <div>
            <h2 id="user-tier-title">{isPremium ? 'Premium learner' : 'Free learner'}</h2>
            <p>{isPremium ? 'Bạn đang mở khóa không gian học nâng cao.' : 'Bạn đang trải nghiệm không gian học cơ bản.'}</p>
          </div>
          <span className={styles.tierBadge}>{isPremium ? 'PREMIUM' : 'FREE'}</span>
        </div>

        {isPremium ? (
          <p className={styles.premiumNote}>Đã bật mô phỏng quyền lợi Premium cho phiên này.</p>
        ) : (
          <p className={styles.pointsNote}><strong className={styles.freePoints}>{formattedPoints}</strong> Points sẵn sàng cho hành trình hôm nay.</p>
        )}

        <ul className={styles.benefits}>
          <li>{isPremium ? 'Kho tài liệu và đề luyện mở rộng' : 'Luyện tập nền tảng và theo dõi tiến độ'}</li>
          <li>{isPremium ? 'Công cụ học nâng cao trong mô phỏng' : 'Nâng cấp để mở thêm trải nghiệm học tập'}</li>
        </ul>

        <button type="button" className={styles.toggleButton} onClick={toggleTier}>{toggleLabel}</button>
        <p className={styles.demoHint} role="status" aria-live="polite">Chế độ demo — không thay đổi gói học thực tế.</p>
      </article>
    </details>
  )
}
