import { useEffect, useRef, useState } from 'react'
import { Link, Outlet, useLocation } from 'react-router-dom'
import { ChevronDown, RotateCcw, Search, Users } from 'lucide-react'
import brandLogo from '@/assets/brand-logo-white.webp'
import { ErrorBoundary } from '@/app/ErrorBoundary'
import { AdminSearchProvider } from '@/features/admin/AdminSearchProvider'
import { AdminSidebar } from '@/features/admin/AdminSidebar'
import { useAdminSearch } from '@/features/admin/adminSearch'
import { resetPointState, usePointState } from '../data/store'
import { MANAGER_BASE, MANAGER_MENU, SALE_BASE, SALE_MENU } from './point-menu'
import '@/features/admin/admin.css'
import '../point-management.css'

export type PointArea = 'manager' | 'sale'

function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  return ((parts[0]?.[0] ?? '') + (parts.length > 1 ? (parts[parts.length - 1][0] ?? '') : '')).toUpperCase() || '?'
}

/** Same account button as the admin top bar; its menu switches between the two demo screens instead of signing out. */
function AccountMenu({ area }: { area: PointArea }) {
  const { manager, sales, currentSaleId } = usePointState()
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)
  const name = area === 'manager' ? manager.name : (sales.find((sale) => sale.id === currentSaleId)?.name ?? 'Sale')
  const role = area === 'manager' ? manager.title : 'Sale'

  useEffect(() => {
    if (!open) return undefined
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

  const other = area === 'manager'
    ? { to: `${SALE_BASE}/issue`, label: 'Xem màn Sale' }
    : { to: `${MANAGER_BASE}/overview`, label: 'Xem màn Quản lý bán hàng' }

  return (
    <div className="adm-account" ref={rootRef}>
      <button aria-expanded={open} aria-haspopup="menu" className="adm-account__button" onClick={() => setOpen((current) => !current)} type="button">
        <span aria-hidden="true" className="adm-avatar">{initialsOf(name)}</span>
        <span className="adm-account__text">
          <strong>{name}</strong>
          <small>{role}</small>
        </span>
        <ChevronDown aria-hidden="true" size={16} />
      </button>
      {open ? (
        <div className="adm-menu" role="menu">
          <Link className="adm-menu__item" onClick={() => setOpen(false)} role="menuitem" to={other.to}>
            <Users aria-hidden="true" size={16} />
            {other.label}
          </Link>
          <button className="adm-menu__item" onClick={() => { resetPointState(); setOpen(false) }} role="menuitem" type="button">
            <RotateCcw aria-hidden="true" size={16} />
            Đặt lại dữ liệu mẫu
          </button>
        </div>
      ) : null}
    </div>
  )
}

function PointTopbar({ area }: { area: PointArea }) {
  const { query, setQuery } = useAdminSearch()
  return (
    <header className="adm-topbar">
      <Link aria-label="Trang chủ" className="adm-brand" to={area === 'manager' ? `${MANAGER_BASE}/overview` : `${SALE_BASE}/issue`}>
        <img alt="The English Space" className="adm-brand__logo" height={74} src={brandLogo} width={175} />
        <span aria-hidden="true" className="adm-brand__divider" />
        <span className="adm-brand__label">{area === 'manager' ? 'SALES MANAGER' : 'SALE'}</span>
      </Link>
      <label className="adm-search">
        <Search aria-hidden="true" size={16} />
        <span className="adm-sr-only">Tìm trong trang này</span>
        <input onChange={(event) => setQuery(event.target.value)} placeholder="Tìm trong trang này" type="search" value={query} />
      </label>
      <div className="adm-topbar__tools">
        <AccountMenu area={area} />
      </div>
    </header>
  )
}

/** The demo's own frame: the admin top bar, search box and icon sidebar, with the key screens' menu. */
export function PointLayout({ area }: { area: PointArea }) {
  const { pathname } = useLocation()
  return (
    <AdminSearchProvider>
      <div className="adm-theme adm-shell">
        <a className="adm-skip" href="#point-main">Bỏ qua điều hướng</a>
        <PointTopbar area={area} />
        <AdminSidebar entries={area === 'manager' ? MANAGER_MENU : SALE_MENU} />
        <main className="adm-main" id="point-main">
          <ErrorBoundary key={pathname} title="Không thể hiển thị trang">
            <Outlet />
          </ErrorBoundary>
        </main>
      </div>
    </AdminSearchProvider>
  )
}
