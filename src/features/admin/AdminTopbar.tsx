import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ChevronDown, GraduationCap, LogOut, Search } from 'lucide-react'
import { BRAND_LOGO_URL } from '@/components/brandLogo'
import { logoutSession, useAuthSession } from '@/features/auth/authSession'
import { useAdminSearch } from './adminSearch'

function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  return ((parts[0]?.[0] ?? '') + (parts.length > 1 ? (parts[parts.length - 1][0] ?? '') : '')).toUpperCase() || '?'
}

function AccountMenu() {
  const { userName, email } = useAuthSession()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const closeOnOutside = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false)
    }
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', closeOnOutside)
    document.addEventListener('keydown', closeOnEscape)
    return () => {
      document.removeEventListener('mousedown', closeOnOutside)
      document.removeEventListener('keydown', closeOnEscape)
    }
  }, [open])

  async function signOut() {
    setOpen(false)
    await logoutSession()
    navigate('/home', { replace: true })
  }

  return (
    <div className="adm-account" ref={rootRef}>
      <button
        aria-expanded={open}
        aria-haspopup="menu"
        className="adm-account__button"
        onClick={() => setOpen((current) => !current)}
        type="button"
      >
        <span aria-hidden="true" className="adm-avatar">{initialsOf(userName)}</span>
        <span className="adm-account__text">
          <strong>{userName}</strong>
          {email ? <small>{email}</small> : null}
        </span>
        <ChevronDown aria-hidden="true" size={16} />
      </button>
      {open ? (
        <div className="adm-menu" role="menu">
          <Link className="adm-menu__item" onClick={() => setOpen(false)} role="menuitem" to="/overview">
            <GraduationCap aria-hidden="true" size={16} />
            Về trang học
          </Link>
          <button className="adm-menu__item" onClick={() => void signOut()} role="menuitem" type="button">
            <LogOut aria-hidden="true" size={16} />
            Đăng xuất
          </button>
        </div>
      ) : null}
    </div>
  )
}

export function AdminTopbar() {
  const { query, setQuery } = useAdminSearch()
  return (
    <header className="adm-topbar">
      <Link aria-label="Trang chủ quản trị" className="adm-brand" to="/admin">
        <img alt="The English Space" className="adm-brand__logo" height={74} src={BRAND_LOGO_URL} width={175} />
        <span aria-hidden="true" className="adm-brand__divider" />
        <span className="adm-brand__label">QUẢN TRỊ</span>
      </Link>
      <label className="adm-search">
        <Search aria-hidden="true" size={16} />
        <span className="adm-sr-only">Tìm trong trang này</span>
        <input
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Tìm trong trang này"
          type="search"
          value={query}
        />
      </label>
      <AccountMenu />
    </header>
  )
}
