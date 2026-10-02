import { useState } from 'react'
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom'
import { GraduationCap, Menu, X } from 'lucide-react'
import { UserTierDropdown } from './UserTierDropdown'
import { logoutSession, setDemoTier, useAuthSession } from '@/features/auth/authSession'

const navigation = [
  { to: '/home', label: 'Trang chủ', public: true },
  { to: '/overview', label: 'Overview', public: false },
  { to: '/classroom', label: 'Lớp học', public: false },
  { to: '/learn', label: 'Lộ trình', public: false },
  { to: '/practice', label: 'Thực hành', public: false },
  { to: '/practice-tests', label: 'Luyện đề', public: false },
  { to: '/vocabulary', label: 'Từ điển', public: true },
  { to: '/materials', label: 'Học liệu', public: false },
] as const

export interface SiteNavbarProps {
  /** Optional visual override for embeds and component previews. App routes use the transient auth UI state. */
  isLoggedIn?: boolean
  userName?: string
}

export function SiteNavbar({ isLoggedIn, userName }: SiteNavbarProps) {
  const [menuOpen, setMenuOpen] = useState(false)
  const [loggingOut, setLoggingOut] = useState(false)
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const session = useAuthSession()
  const activeIsLoggedIn = isLoggedIn ?? session.isLoggedIn
  const activeUserName = userName ?? session.userName
  const visibleNavigation = activeIsLoggedIn ? navigation : navigation.filter((item) => item.public)

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
    <header className="site-main-header">
      <div className="site-header-shell">
        <nav className="site-main-nav" aria-label="Điều hướng chính"
          onKeyDown={(event) => { if (event.key === 'Escape') setMenuOpen(false) }}>
          <Link className="site-brand" to="/home" onClick={() => setMenuOpen(false)}>
            <span className="site-brand-mark"><GraduationCap aria-hidden="true" size={24} /></span>
            <span>IELTS Space<small>by The English Space</small></span>
          </Link>
          <div id="site-navigation" className={`site-nav-links ${menuOpen ? 'is-open' : ''}`}>
            {visibleNavigation.map(({ to, label }) => (
              <NavLink key={to} end to={to} onClick={() => setMenuOpen(false)}
                className={({ isActive }) => isActive || (to === '/practice-tests' && pathname.startsWith('/practice/test')) ? 'active' : undefined}>
                {label}
              </NavLink>
            ))}
          </div>
          <div className="site-nav-actions">
            {activeIsLoggedIn ? (
              <>
                <UserTierDropdown
                  className="site-user-tier-dropdown"
                  onToggleTier={setDemoTier}
                  points={session.points}
                  tier={session.tier}
                  userName={activeUserName}
                />
                <button type="button" className="site-login-btn" disabled={loggingOut} onClick={handleLogout}>
                  {loggingOut ? 'Đang thoát…' : 'Đăng xuất'}
                </button>
              </>
            ) : (
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
    </header>
  )
}
