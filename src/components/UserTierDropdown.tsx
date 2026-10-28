import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { ChevronRight, Coins, LogOut, Trophy, UserRound } from 'lucide-react'
import { Button } from '@/components/ui/button'
import styles from './UserTierDropdown.module.css'

export type UserTier = 'FREE' | 'PREMIUM'

export interface UserTierDropdownProps {
  /** Plan of the learner; Premium adds the golden halo around the avatar. */
  tier?: UserTier
  /** Current learning points. */
  points?: number
  /** Learner name used in the avatar and accessible labels. */
  userName?: string
  /** Shown under the name when known. */
  email?: string | null
  /** Public URL of the learner's avatar; the initials are shown when it is missing or fails to load. */
  avatarUrl?: string | null
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

/** Vietnamese names end with the given name, which is what people expect to be greeted by. */
function getGivenName(userName: string) {
  const words = userName.trim().split(/\s+/).filter(Boolean)
  return words[words.length - 1] ?? 'bạn'
}

function normalizePoints(points: number) {
  return Number.isFinite(points) ? Math.max(0, Math.round(points)) : 0
}

/** The photo when it loads, the initials otherwise. A new URL gets a fresh attempt. */
function Avatar({ url, initials, className }: { url?: string | null; initials: string; className: string }) {
  const [failedUrl, setFailedUrl] = useState<string | null>(null)
  const showImage = Boolean(url) && failedUrl !== url
  return (
    <span className={className} aria-hidden="true">
      {showImage ? (
        <img src={url ?? undefined} alt="" className={styles.avatarImage} onError={() => setFailedUrl(url ?? null)} />
      ) : initials}
    </span>
  )
}

export function UserTierDropdown({
  tier = 'FREE',
  points = 0,
  userName = 'Học viên',
  email,
  avatarUrl,
  onSignOut,
  signingOut = false,
  className,
}: UserTierDropdownProps) {
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

  const isPremium = tier === 'PREMIUM'
  const safeUserName = userName.trim() || 'Học viên'
  const initials = getInitials(safeUserName)
  const formattedPoints = new Intl.NumberFormat('vi-VN').format(normalizePoints(points))

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
      <summary className={styles.trigger} aria-label={`Mở menu tài khoản của ${safeUserName}, ${isPremium ? 'Premium' : `${formattedPoints} Points`}`}>
        <span className={styles.avatarTierWrap} aria-hidden="true">
          {isPremium && <>
            <span className={styles.premiumHaloRing} />
            <span className={`${styles.premiumHaloSparkle} ${styles.sparkleOrbitOne}`} />
            <span className={`${styles.premiumHaloSparkle} ${styles.sparkleOrbitTwo}`} />
            <span className={`${styles.premiumHaloSparkle} ${styles.sparkleOrbitThree}`} />
          </>}
          <Avatar url={avatarUrl} initials={initials} className={styles.avatar} />
        </span>
        <span className={styles.triggerCopy}>
          <strong>{safeUserName}</strong>
          <span className={styles.tierStatus}>{isPremium ? 'Premium' : `${formattedPoints} Points`}</span>
        </span>
        <span className={styles.chevron} aria-hidden="true" />
      </summary>

      <article className={styles.tierCard} aria-labelledby="user-tier-title">
        <header className={styles.profileHero}>
          <Avatar url={avatarUrl} initials={initials} className={styles.heroAvatar} />
          <div className={styles.heroCopy}>
            <h2 id="user-tier-title">Xin chào, {getGivenName(safeUserName)}!</h2>
            <p className={styles.heroName}>{safeUserName}</p>
            {email && <p className={styles.heroEmail}>{email}</p>}
          </div>
          <div className={styles.heroChips}>
            <span className={styles.pointsChip}><Coins aria-hidden="true" size={13} />{formattedPoints} Points</span>
            <span className={styles.tierBadge}>{isPremium ? 'PREMIUM' : 'FREE'}</span>
          </div>
        </header>

        <nav className={styles.menuList} aria-label="Tài khoản">
          <Link to="/overview?tab=profile" className={styles.menuLink} onClick={closeMenu}>
            <span className={styles.menuIcon} aria-hidden="true"><UserRound size={17} /></span>
            <span className={styles.menuCopy}>
              <strong>Hồ sơ của tôi</strong>
              <small>Thông tin cá nhân và ảnh đại diện</small>
            </span>
            <ChevronRight className={styles.menuArrow} aria-hidden="true" size={16} />
          </Link>
          <Link to="/learn/progress" className={styles.menuLink} onClick={closeMenu}>
            <span className={styles.menuIcon} aria-hidden="true"><Trophy size={17} /></span>
            <span className={styles.menuCopy}>
              <strong>Thành tích của tôi</strong>
              <small>Tiến độ, huy hiệu và chuỗi học</small>
            </span>
            <ChevronRight className={styles.menuArrow} aria-hidden="true" size={16} />
          </Link>
        </nav>

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
