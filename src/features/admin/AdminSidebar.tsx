import { useEffect, useRef, useState, type CSSProperties } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import type { AdminMenuItem, MenuEntry, MenuGroupEntry } from './adminMenu'

/** Lets the pointer travel from the icon to the flyout without the flyout closing on the way. */
const CLOSE_DELAY_MS = 150
const FLYOUT_HEIGHT_ESTIMATE = 240
const FLYOUT_WIDTH_ESTIMATE = 248

function isWithin(pathname: string, path: string) {
  return pathname === path || pathname.startsWith(`${path}/`)
}

/**
 * The flyout is fixed-positioned from the icon's rectangle so the sidebar's own scrolling never clips it:
 * beside the icon on wide screens, above the bottom bar on narrow ones.
 */
function flyoutPosition(trigger: HTMLElement): CSSProperties {
  const rect = trigger.getBoundingClientRect()
  const wide = typeof window.matchMedia === 'function' && window.matchMedia('(min-width: 768px)').matches
  if (wide) return { top: Math.max(72, Math.min(rect.top, window.innerHeight - FLYOUT_HEIGHT_ESTIMATE)), left: rect.right }
  return { bottom: window.innerHeight - rect.top, left: Math.max(8, Math.min(rect.left, window.innerWidth - FLYOUT_WIDTH_ESTIMATE)) }
}

function SidebarLink({ item }: { item: AdminMenuItem }) {
  const { path, label, icon: Icon } = item
  return (
    <NavLink className={({ isActive }) => `adm-nav${isActive ? ' is-active' : ''}`} to={path}>
      <Icon aria-hidden="true" size={20} />
      <span>{label}</span>
    </NavLink>
  )
}

function SidebarGroup({ group }: { group: MenuGroupEntry }) {
  const { pathname } = useLocation()
  // The menu records the route it was opened on, so navigating anywhere closes it without an effect.
  const [openedOn, setOpenedOn] = useState<string | null>(null)
  const open = openedOn === pathname
  const [position, setPosition] = useState<CSSProperties>({})
  const root = useRef<HTMLLIElement>(null)
  const trigger = useRef<HTMLButtonElement>(null)
  const closeTimer = useRef<number | undefined>(undefined)
  const lastPointer = useRef('mouse')
  const Icon = group.icon
  const active = group.items.some((item) => isWithin(pathname, item.path))

  function cancelClose() {
    window.clearTimeout(closeTimer.current)
  }

  function show() {
    cancelClose()
    if (trigger.current) setPosition(flyoutPosition(trigger.current))
    setOpenedOn(pathname)
  }

  function hide() {
    cancelClose()
    setOpenedOn(null)
  }

  function hideSoon() {
    cancelClose()
    closeTimer.current = window.setTimeout(() => setOpenedOn(null), CLOSE_DELAY_MS)
  }

  useEffect(() => () => window.clearTimeout(closeTimer.current), [])

  useEffect(() => {
    if (!open) return undefined
    const closeOutside = (event: PointerEvent) => {
      if (!root.current?.contains(event.target as Node)) setOpenedOn(null)
    }
    document.addEventListener('pointerdown', closeOutside)
    return () => document.removeEventListener('pointerdown', closeOutside)
  }, [open])

  // Touch and pen have no hover: a tap toggles. A mouse opens on hover, so its click must not close what hover opened.
  function toggle() {
    if (!open) show()
    else if (lastPointer.current !== 'mouse') hide()
  }

  return (
    <li
      className="adm-group"
      onBlur={(event) => { if (!root.current?.contains(event.relatedTarget as Node | null)) hide() }}
      onKeyDown={(event) => {
        if (event.key !== 'Escape' || !open) return
        hide()
        trigger.current?.focus()
      }}
      onPointerEnter={(event) => {
        lastPointer.current = event.pointerType || 'mouse'
        if (lastPointer.current === 'mouse') show()
      }}
      onPointerLeave={(event) => { if (event.pointerType !== 'touch' && event.pointerType !== 'pen') hideSoon() }}
      ref={root}>
      <button
        aria-expanded={open}
        aria-haspopup="true"
        className={`adm-nav adm-group__trigger${active ? ' is-active' : ''}`}
        onClick={toggle}
        onKeyDown={() => { lastPointer.current = 'keyboard' }}
        onPointerDown={(event) => { lastPointer.current = event.pointerType || 'mouse' }}
        ref={trigger}
        type="button">
        <Icon aria-hidden="true" size={20} />
        <span>{group.label}</span>
      </button>
      {/* Always in the document so the links stay findable; the stylesheet hides it until opened. */}
      <ul aria-label={group.label} className={`adm-flyout${open ? ' is-open' : ''}`} style={position}>
        {group.items.map((item) => (
          <li key={item.path}>
            <NavLink className={({ isActive }) => `adm-flyout__link${isActive ? ' is-active' : ''}`} to={item.path}>
              <item.icon aria-hidden="true" size={18} />
              <span>{item.label}</span>
            </NavLink>
          </li>
        ))}
      </ul>
    </li>
  )
}

export function AdminSidebar({ entries }: { entries: readonly MenuEntry[] }) {
  return (
    <nav aria-label="Menu quản trị" className="adm-sidebar">
      <ul>
        {entries.map((entry) => entry.kind === 'group'
          ? <SidebarGroup group={entry} key={entry.id} />
          : <li key={entry.item.path}><SidebarLink item={entry.item} /></li>)}
      </ul>
    </nav>
  )
}
