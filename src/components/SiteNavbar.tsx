import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, NavLink, useLocation, useMatch, useNavigate } from 'react-router-dom'
import { ChevronDown, Menu, X } from 'lucide-react'
import { SiteLogo } from './SiteLogo'
import { NavOwl } from './NavOwl'
import type { NavOwlHandle } from './NavOwl'
import { UserTierDropdown } from './UserTierDropdown'
import { logoutSession, setDemoTier, useAuthSession } from '@/features/auth/authSession'
import { NotificationBell } from '@/features/community/components/NotificationBell'

interface NavChild { to: string; label: string }
interface NavItem { to: string; label: string; children?: readonly NavChild[]; disclosure?: boolean }

/** The primary item owning the current route: its own path first, then a child's path. */
function findActiveItem(items: readonly NavItem[], pathname: string) {
  return items.find((item) => pathname === item.to || pathname.startsWith(`${item.to}/`))
    ?? items.find((item) => item.children?.some((child) => {
      const path = child.to.split('?')[0]
      return path === pathname || pathname.startsWith(`${path}/`)
    }))
}

/** Nested routes belong to their closest matching section; query-specific sections must match too. */
function findActiveChild(children: readonly NavChild[], pathname: string, search: string) {
  const current = new URLSearchParams(search)
  return children.filter((child) => {
    const [path, query = ''] = child.to.split('?')
    if (path !== pathname && !pathname.startsWith(`${path}/`)) return false
    return [...new URLSearchParams(query)].every(([key, value]) => current.get(key) === value)
  }).sort((a, b) => b.to.split('?')[0].length - a.to.split('?')[0].length)[0]
}

/** How far in from the right end of the selected item the mini owl stands (px), inside the item's padding. */
const NAV_OWL_INSET = 2

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
const discovery: NavItem = {
  to: '/community',
  label: 'Khám phá',
  disclosure: true,
  children: [
    { to: '/community', label: 'Cộng đồng' },
    { to: '/games', label: 'Trò chơi' },
    { to: '/video-dictation', label: 'Nghe chép' },
    { to: '/vocabulary', label: 'Kho từ vựng' },
    { to: '/flashcards', label: 'Flashcard của tôi' },
  ],
}

const guestNavigation: readonly NavItem[] = [
  { to: '/home', label: 'Trang chủ' },
  coursesNav,
  practice,
  discovery,
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
  discovery,
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
  const visibleNavigation = useMemo(
    () => activeIsLoggedIn ? memberNavigation : guestNavigation,
    [activeIsLoggedIn],
  )
  const activeItem = findActiveItem(visibleNavigation, pathname)
  // Hovering a primary item previews its sections in the second row; leaving the navbar restores the active ones.
  const [previewItem, setPreviewItem] = useState<NavItem | null>(null)
  const [sectionsCollapsed, setSectionsCollapsed] = useState(false)
  const discoveryRef = useRef<HTMLButtonElement>(null)
  const menuButtonRef = useRef<HTMLButtonElement>(null)
  const headerRef = useRef<HTMLElement>(null)
  const previewResetTimer = useRef<number | undefined>(undefined)
  const subnavItem = sectionsCollapsed ? undefined : previewItem?.children ? previewItem : activeItem
  const activeChild = subnavItem?.children ? findActiveChild(subnavItem.children, pathname, search) : undefined
  // Without a baseline row (e.g. Trang chủ for guests) a previewed row floats over the page instead of pushing it down.
  const subnavFloats = !activeItem?.children
  const linksRef = useRef<HTMLDivElement>(null)
  const indicatorRef = useRef<HTMLSpanElement>(null)
  const indicatorPlaced = useRef(false)
  const owlRef = useRef<NavOwlHandle>(null)

  useEffect(() => () => window.clearTimeout(previewResetTimer.current), [])

  useEffect(() => {
    const dismissOutside = (event: PointerEvent) => {
      if (headerRef.current?.contains(event.target as Node)) return
      setPreviewItem(null)
      setSectionsCollapsed(false)
      setMenuOpen(false)
    }
    document.addEventListener('pointerdown', dismissOutside)
    return () => document.removeEventListener('pointerdown', dismissOutside)
  }, [])

  // Slide the highlight tab under the current (or hovered) primary item, and walk the mini owl on top of it.
  // Both are moved through the DOM because they mirror layout measurements rather than React state.
  useEffect(() => {
    const links = linksRef.current
    const indicator = indicatorRef.current
    if (!links || !indicator) return
    const place = () => {
      const current = links.querySelector<HTMLElement>('.site-nav-link.active')
      indicator.style.opacity = current ? '1' : '0'
      if (!current) {
        owlRef.current?.hide()
        return
      }
      indicator.style.width = `${current.offsetWidth}px`
      indicator.style.transform = `translateX(${current.offsetLeft}px)`
      indicator.classList.toggle('has-sections', Boolean(subnavItem?.children))
      owlRef.current?.moveTo(current.offsetLeft + current.offsetWidth - NAV_OWL_INSET)
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
    links.querySelectorAll('.site-nav-link').forEach((link) => observer.observe(link))
    return () => observer.disconnect()
  }, [subnavItem, visibleNavigation])

  function previewSections(item: NavItem) {
    window.clearTimeout(previewResetTimer.current)
    setSectionsCollapsed(false)
    if (item.children) setPreviewItem(item)
  }

  function keepPreview() {
    window.clearTimeout(previewResetTimer.current)
  }

  function schedulePreviewReset() {
    window.clearTimeout(previewResetTimer.current)
    previewResetTimer.current = window.setTimeout(() => {
      if (menuOpen || document.activeElement?.closest('.site-main-header')) return
      setPreviewItem(null)
      setSectionsCollapsed(false)
    }, 200)
  }

  function closeMenu() {
    setMenuOpen(false)
    setPreviewItem(null)
    setSectionsCollapsed(false)
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
    <header ref={headerRef} className={`site-main-header${menuOpen ? ' site-main-header--menu-open' : ''}`}
      onMouseEnter={keepPreview} onMouseLeave={schedulePreviewReset}
      onBlur={(event) => {
        if (event.currentTarget.contains(event.relatedTarget)) return
        closeMenu()
      }}
      onKeyDown={(event) => {
        if (event.key !== 'Escape') return
        setMenuOpen(false)
        setPreviewItem(null)
        setSectionsCollapsed(true)
        if (menuOpen) menuButtonRef.current?.focus()
        else if (subnavItem?.disclosure) discoveryRef.current?.focus()
      }}>
      <div className="site-header-shell">
        <nav className="site-main-nav" aria-label="Điều hướng chính">
          <Link className="site-brand" to="/home" aria-label="The English Space - Trang chủ" onClick={closeMenu}>
            <SiteLogo className="site-brand-logo" />
          </Link>
          <div id="site-navigation" ref={linksRef} className={`site-nav-links ${menuOpen ? 'is-open' : ''}`}>
            <span ref={indicatorRef} className="site-nav-indicator" aria-hidden="true" />
            <NavOwl ref={owlRef} />
            {visibleNavigation.map((item) => (
              <div className="site-nav-group" key={item.to}>
                {item.disclosure ? (
                  <button type="button" ref={discoveryRef}
                    className={`site-nav-link${item === (subnavItem ?? activeItem) ? ' active' : ''}`}
                    aria-expanded={item === subnavItem}
                    aria-controls={menuOpen ? 'site-mobile-discovery-sections' : 'site-discovery-sections'}
                    onMouseEnter={() => { if (!menuOpen) previewSections(item) }}
                    onClick={(event) => {
                      keepPreview()
                      setPreviewItem(item)
                      setSectionsCollapsed((menuOpen || event.detail === 0) && item === subnavItem)
                    }}>
                    {item.label}<ChevronDown aria-hidden="true" size={14} />
                  </button>
                ) : (
                  <NavLink to={item.to} onClick={closeMenu}
                    onMouseEnter={() => previewSections(item)} onFocus={() => previewSections(item)}
                    className={() => `site-nav-link${item === subnavItem ? ' active' : ''}`}>
                    {item.label}
                  </NavLink>
                )}
                {menuOpen && item === subnavItem && item.children ? (
                  <div id={item.disclosure ? 'site-mobile-discovery-sections' : undefined}
                    className="site-mobile-sections" aria-label={item.label}>
                    {item.children.map((child) => (
                      <Link key={child.to} to={child.to} onClick={closeMenu}
                        aria-current={child === activeChild ? 'page' : undefined}>
                        {child.label}
                      </Link>
                    ))}
                  </div>
                ) : null}
              </div>
            ))}
          </div>
          <div className="site-nav-actions">
            {activeIsLoggedIn ? (
              <NotificationBell enabled={activeIsLoggedIn} />
            ) : null}
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
            <button type="button" ref={menuButtonRef} className="site-menu-btn" aria-label={menuOpen ? 'Đóng điều hướng' : 'Mở điều hướng'}
              aria-expanded={menuOpen} aria-controls="site-navigation" onClick={() => {
                setMenuOpen(!menuOpen)
                setSectionsCollapsed(false)
              }}>
              {menuOpen ? <X aria-hidden="true" size={22} /> : <Menu aria-hidden="true" size={22} />}
            </button>
          </div>
        </nav>
      </div>
      {subnavItem?.children ? (
        <nav id={subnavItem.disclosure ? 'site-discovery-sections' : undefined}
          className={`site-subnav${subnavFloats ? ' site-subnav--floating' : ''}`} aria-label={subnavItem.label}>
          <div key={subnavItem.to} className="site-subnav-inner">
            {subnavItem.children.map((child) => {
              const active = child === activeChild
              return (
                <Link key={child.to} to={child.to} className={active ? 'active' : undefined}
                  aria-current={active ? 'page' : undefined} onClick={closeMenu}>
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
