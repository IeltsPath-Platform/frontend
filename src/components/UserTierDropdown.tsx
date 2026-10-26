import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowUpRight, Crown, LogOut, Trophy } from 'lucide-react'
import { Button } from '@/components/ui/button'
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
  /** Ends the current session when supplied by the consuming application. */
  onSignOut?: () => void
  /** Prevents repeated requests while backend logout is pending. */
  signingOut?: boolean
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
  onSignOut,
  signingOut = false,
  className,
}: UserTierDropdownProps) {
  const [demoTier, setDemoTier] = useState<UserTier>(defaultTier)
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef<HTMLDetailsElement>(null)

  useEffect(() => {
    if (!isOpen) return
    function dismiss(event: PointerEvent) {
      const dropdown = dropdownRef.current
      if (dropdown && event.target instanceof Node && !dropdown.contains(event.target)) dropdown.open = false
    }
    document.addEventListener('pointerdown', dismiss)
    return () => document.removeEventListener('pointerdown', dismiss)
  }, [isOpen])
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

  function closeMenu() {
    if (dropdownRef.current) dropdownRef.current.open = false
  }

  return (
    <details
      ref={dropdownRef}
      className={[styles.root, isPremium ? styles.isPremium : undefined, className].filter(Boolean).join(' ')}
      onToggle={(event) => setIsOpen(event.currentTarget.open)}
      onKeyDown={(event) => {
        if (event.key === 'Escape' && dropdownRef.current?.open) {
          event.stopPropagation()
          dropdownRef.current.open = false
          dropdownRef.current.querySelector('summary')?.focus()
        }
      }}
    >
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
        <div className={styles.cardIntro}>
          <h2 id="user-tier-title">Góc học tập</h2>
          <span className={styles.introCaption}>Của {safeUserName}</span>
        </div>
        <Link to="/learn/progress" className={styles.menuLink} onClick={closeMenu}>
          <Trophy aria-hidden="true" size={17} />Thành tích của tôi
        </Link>

        <section className={styles.planSection} aria-label="Gói học của bạn">
          <div className={styles.planHeading}>
            <span className={styles.planIcon} aria-hidden="true"><Crown size={17} /></span>
            <div className={styles.planCopy}>
              <h3>Gói {isPremium ? 'Premium' : 'Free'}</h3>
              <p>{isPremium ? 'Trải nghiệm học nâng cao' : 'Trải nghiệm học cơ bản'}</p>
            </div>
            <span className={styles.tierBadge}>{isPremium ? 'PREMIUM' : 'FREE'}</span>
          </div>
          <Button type="button" className={styles.toggleButton} onClick={toggleTier}>
            {toggleLabel}<ArrowUpRight aria-hidden="true" size={16} />
          </Button>
          <p className={styles.demoHint} role="status" aria-live="polite">Chỉ mô phỏng, không đổi gói thực tế.</p>
        </section>
        {onSignOut && (
          <div className={styles.accountActions}>
            <Button type="button" variant="ghost" className={styles.accountAction} disabled={signingOut} onClick={onSignOut}>
              <LogOut aria-hidden="true" /> {signingOut ? 'Đang thoát…' : 'Đăng xuất'}
            </Button>
          </div>
        )}
      </article>
    </details>
  )
}
