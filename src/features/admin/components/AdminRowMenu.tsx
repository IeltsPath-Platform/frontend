import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { MoreHorizontal } from 'lucide-react'

export interface RowMenuItem {
  key: string
  label: string
  /** Name read by assistive tech when the visible label is too short on its own, such as "Đưa lên". */
  ariaLabel?: string
  icon?: ReactNode
  disabled?: boolean
  tone?: 'default' | 'danger'
  /** Draws a divider above the item, to set a group of related actions apart. */
  separatorBefore?: boolean
  /** A short note at the end of the item, such as "Sắp có". */
  hint?: string
  onSelect: () => void
}

const MENU_GAP = 6
const EDGE_GAP = 8

/**
 * The "..." button at the end of a table row and the menu of actions it opens. The menu is drawn on the page, outside
 * the table, so a table that scrolls or clips its cells never cuts it off.
 */
export function AdminRowMenu({ label, items, className }: { label: string; items: readonly RowMenuItem[]; className?: string }) {
  const trigger = useRef<HTMLButtonElement>(null)
  const menu = useRef<HTMLDivElement>(null)
  // `anchorTop` is the top edge of the button, where the menu opens upward from when it has no room below.
  const [spot, setSpot] = useState<{ top: number; right: number; anchorTop: number } | null>(null)

  function close(returnFocus = false) {
    setSpot(null)
    if (returnFocus) trigger.current?.focus()
  }

  useEffect(() => {
    if (!spot) return
    menu.current?.querySelector<HTMLElement>('[role="menuitem"]:not([disabled])')?.focus()
    const away = (event: PointerEvent) => {
      const target = event.target as Node
      if (!menu.current?.contains(target) && !trigger.current?.contains(target)) setSpot(null)
    }
    const shut = () => setSpot(null)
    document.addEventListener('pointerdown', away)
    window.addEventListener('resize', shut)
    window.addEventListener('scroll', shut, true)
    return () => {
      document.removeEventListener('pointerdown', away)
      window.removeEventListener('resize', shut)
      window.removeEventListener('scroll', shut, true)
    }
  }, [spot])

  // The menu opens below the button; the last rows of a page have no room there, so it moves above, or against the
  // bottom edge when it fits in neither place. A move leaves it with room, so this settles after one pass.
  useLayoutEffect(() => {
    if (!spot || !menu.current) return
    const height = menu.current.offsetHeight
    if (spot.top + height <= window.innerHeight - EDGE_GAP) return
    const above = spot.anchorTop - MENU_GAP - height
    const top = above >= EDGE_GAP ? above : Math.max(EDGE_GAP, window.innerHeight - height - EDGE_GAP)
    if (top !== spot.top) setSpot({ ...spot, top })
  }, [spot])

  function toggle() {
    if (spot) { close(); return }
    const box = trigger.current?.getBoundingClientRect()
    setSpot({ top: (box?.bottom ?? 0) + MENU_GAP, right: window.innerWidth - (box?.right ?? 0), anchorTop: box?.top ?? 0 })
  }

  function onKeyDown(event: React.KeyboardEvent) {
    if (event.key === 'Escape') { event.stopPropagation(); close(true); return }
    if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') return
    event.preventDefault()
    const enabled = [...(menu.current?.querySelectorAll<HTMLElement>('[role="menuitem"]:not([disabled])') ?? [])]
    const at = enabled.indexOf(document.activeElement as HTMLElement)
    enabled[(at + (event.key === 'ArrowDown' ? 1 : -1) + enabled.length) % enabled.length]?.focus()
  }

  return <>
    <button aria-expanded={!!spot} aria-haspopup="menu" aria-label={label} className="adm-icon-btn adm-rowmenu__trigger" onClick={toggle} ref={trigger} type="button">
      <MoreHorizontal aria-hidden="true" size={18} />
    </button>
    {spot ? createPortal(
      <div className="adm-theme">
        <div aria-label={label} className={`adm-rowmenu${className ? ` ${className}` : ''}`} onKeyDown={onKeyDown} ref={menu} role="menu" style={{ top: spot.top, right: spot.right, maxHeight: `calc(100dvh - ${EDGE_GAP * 2}px)`, overflowY: 'auto' }}>
          {items.map((item) => <button aria-label={item.ariaLabel} className={`adm-rowmenu__item${item.tone === 'danger' ? ' is-danger' : ''}${item.separatorBefore ? ' adm-rowmenu__item--divided' : ''}`} disabled={item.disabled} key={item.key}
            onClick={() => { close(); item.onSelect() }} role="menuitem" type="button">{item.icon}{item.label}{item.hint ? <span className="adm-rowmenu__hint">{item.hint}</span> : null}</button>)}
        </div>
      </div>, document.body) : null}
  </>
}
