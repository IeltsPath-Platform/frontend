import { useEffect, useRef, useState } from 'react'
import { Link, NavLink, useLocation, useMatch, useNavigate } from 'react-router-dom'
import { Menu, X } from 'lucide-react'
import { BRAND_LOGO_URL } from './brandLogo'
import { UserTierDropdown } from './UserTierDropdown'
import { logoutSession, setDemoTier, useAuthSession } from '@/features/auth/authSession'

interface NavChild { to: string; label: string }
interface NavItem { to: string; label: string; children?: readonly NavChild[] }

/** The primary item owning the current route: its own path first, then a child's path. */
function findActiveItem(items: readonly NavItem[], pathname: string) {
  return items.find((item) => pathname === item.to || pathname.startsWith(`${item.to}/`))
    ?? items.find((item) => item.children?.some((child) => child.to.split('?')[0] === pathname))
}

/** A child is current when its path matches and every query pair it carries is present in the URL. */
function isChildActive(child: NavChild, pathname: string, search: string) {
  const [path, query = ''] = child.to.split('?')
  if (path !== pathname) return false
  const current = new URLSearchParams(search)
  return [...new URLSearchParams(query)].every(([key, value]) => current.get(key) === value)
}

const practiceSkills: readonly NavChild[] = [
  { to: '/practice-tests?skill=listening', label: 'Listening' },
  { to: '/practice-tests?skill=reading', label: 'Reading' },
  { to: '/practice-tests?skill=writing', label: 'Writing' },
  { to: '/practice-tests?skill=speaking', label: 'Speaking' },
]

const coursesNav: NavItem = {
  to: '/learn',
  label: 'Khóa học',
  children: [
    { to: '/learn/placement', label: 'Test đầu vào 4 kỹ năng FREE' },
    { to: '/learn', label: 'Khóa học' },
  ],
}
const practice: NavItem = { to: '/practice-tests', label: 'Luyện tập 4 kỹ năng', children: practiceSkills }
const studentResults: NavItem = { to: '/student-results', label: 'Kết quả học viên' }

const guestNavigation: readonly NavItem[] = [
  { to: '/home', label: 'Trang chủ' },
  coursesNav,
  practice,
  { to: '/writing-samples', label: 'Bài mẫu Writing 8.0+' },
  studentResults,
]

const memberNavigation: readonly NavItem[] = [
  {
    to: '/home',
    label: 'Trang chủ',
    children: [
      { to: '/overview', label: 'Dashboard' },
      { to: '/submission-history', label: 'Lịch sử nộp bài' },
      { to: '/learn', label: 'Khóa học của tôi' },
    ],
  },
  coursesNav,
  practice,
  {
    to: '/vocabulary',
    label: 'Sổ từ vựng',
    children: [
      { to: '/flashcards', label: 'Flashcard của tôi' },
      { to: '/vocabulary', label: 'Kho từ vựng' },
      { to: '/writing-samples', label: 'Bài mẫu 8đ' },
    ],
  },
  studentResults,
]

export interface SiteNavbarProps {
  /** Optional visual override for embeds and component previews. App routes use the backend auth session. */
  isLoggedIn?: boolean
  userName?: string
}

export function SiteNavbar({ isLoggedIn, userName }: SiteNavbarProps) {
  const [menuOpen, setMenuOpen] = useState(false)
  const [loggingOut, setLoggingOut] = useState(false)
  const { pathname, search } = useLocation()
  const loginMatch = useMatch('/login')
  const registerMatch = useMatch('/register')
  const navigate = useNavigate()
  const session = useAuthSession()
  const activeIsLoggedIn = isLoggedIn ?? session.isLoggedIn
  const activeUserName = userName ?? session.userName
  const visibleNavigation = activeIsLoggedIn ? memberNavigation : guestNavigation
  const activeItem = findActiveItem(visibleNavigation, pathname)
  // Hovering a primary item previews its sections in the second row; leaving the navbar restores the active ones.
  const [previewItem, setPreviewItem] = useState<NavItem | null>(null)
  const previewResetTimer = useRef<number | undefined>(undefined)
  const subnavItem = previewItem?.children ? previewItem : activeItem
  // Without a baseline row (e.g. Trang chủ for guests) a previewed row floats over the page instead of pushing it down.
  const subnavFloats = !activeItem?.children
  const linksRef = useRef<HTMLDivElement>(null)
  const indicatorRef = useRef<HTMLSpanElement>(null)
  const indicatorPlaced = useRef(false)

  useEffect(() => () => window.clearTimeout(previewResetTimer.current), [])

  // Slide the highlight tab under the current (or hovered) primary item. It is moved through the DOM
  // because it mirrors layout measurements rather than React state.
  useEffect(() => {
    const links = linksRef.current
    const indicator = indicatorRef.current
    if (!links || !indicator) return
    const place = () => {
      const current = links.querySelector<HTMLElement>('a.active')
      indicator.style.opacity = current ? '1' : '0'
      if (!current) return
      indicator.style.width = `${current.offsetWidth}px`
      indicator.style.transform = `translateX(${current.offsetLeft}px)`
      indicator.classList.toggle('has-sections', Boolean(subnavItem?.children))
    }
    if (indicatorPlaced.current) {
      place()
    } else {
      // First placement jumps into position instead of animating in from the left edge.
      indicator.style.transition = 'none'
      place()
      void indicator.offsetWidth
      indicator.style.transition = ''
      indicatorPlaced.current = true
    }
    const observer = new ResizeObserver(place)
    observer.observe(links)
    links.querySelectorAll('a').forEach((link) => observer.observe(link))
    return () => observer.disconnect()
  }, [subnavItem, visibleNavigation])

  function previewSections(item: NavItem) {
    window.clearTimeout(previewResetTimer.current)
    if (item.children) setPreviewItem(item)
  }

  function keepPreview() {
    window.clearTimeout(previewResetTimer.current)
  }

  function schedulePreviewReset() {
    window.clearTimeout(previewResetTimer.current)
    previewResetTimer.current = window.setTimeout(() => setPreviewItem(null), 200)
  }

  async function handleLogout() {
    if (loggingOut) return
    setLoggingOut(true)
    try {
      await logoutSession()
      navigate('/login', { replace: true })
    } finally {
      setLoggingOut(false)
      setMenuOpen(false)
    }
  }

  return (
    <header className="site-main-header" onMouseEnter={keepPreview} onMouseLeave={schedulePreviewReset}>
      <div className="site-header-shell">
        <nav className="site-main-nav" aria-label="Điều hướng chính"
          onKeyDown={(event) => { if (event.key === 'Escape') setMenuOpen(false) }}>
          <Link className="site-brand" to="/home" aria-label="The English Space - Trang chủ" onClick={() => setMenuOpen(false)}>
            <img
              className="site-brand-logo"
              src={BRAND_LOGO_URL}
              alt="The English Space"
              width={175}
              height={74}
            />
          </Link>
          <div id="site-navigation" ref={linksRef} className={`site-nav-links ${menuOpen ? 'is-open' : ''}`}>
            <span ref={indicatorRef} className="site-nav-indicator" aria-hidden="true" />
            {visibleNavigation.map((item) => (
              <NavLink key={item.to} to={item.to} onClick={() => setMenuOpen(false)}
                onMouseEnter={() => previewSections(item)} onFocus={() => previewSections(item)}
                className={() => item === subnavItem ? 'active' : ''}>
                {item.label}
              </NavLink>
            ))}
          </div>
          <div className="site-nav-actions">
            {activeIsLoggedIn ? (
              <UserTierDropdown
                className="site-user-tier-dropdown"
                onToggleTier={setDemoTier}
                onSignOut={handleLogout}
                signingOut={loggingOut}
                points={session.points}
                tier={session.tier}
                userName={activeUserName}
              />
            ) : !loginMatch && !registerMatch && (
              <>
                <Link to="/login" className="site-login-btn">Đăng nhập</Link>
                <Link to="/register" className="site-register-btn">Đăng ký</Link>
              </>
            )}
            <button type="button" className="site-menu-btn" aria-label={menuOpen ? 'Đóng điều hướng' : 'Mở điều hướng'}
              aria-expanded={menuOpen} aria-controls="site-navigation" onClick={() => setMenuOpen(!menuOpen)}>
              {menuOpen ? <X aria-hidden="true" size={22} /> : <Menu aria-hidden="true" size={22} />}
            </button>
          </div>
        </nav>
      </div>
      {subnavItem?.children ? (
        <nav className={`site-subnav${subnavFloats ? ' site-subnav--floating' : ''}`} aria-label={subnavItem.label}>
          <div key={subnavItem.to} className="site-subnav-inner">
            {subnavItem.children.map((child) => {
              const active = isChildActive(child, pathname, search)
              return (
                <Link key={child.to} to={child.to} className={active ? 'active' : undefined}
                  aria-current={active ? 'page' : undefined} onClick={() => setPreviewItem(null)}>
                  {child.label}
                </Link>
              )
            })}
          </div>
        </nav>
      ) : null}
    </header>
  )
}
