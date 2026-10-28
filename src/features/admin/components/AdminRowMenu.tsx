import { useEffect, useRef, useState, type ReactNode } from 'react'
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
  onSelect: () => void
}

/**
 * The "..." button at the end of a table row and the menu of actions it opens. The menu is drawn on the page, outside
 * the table, so a table that scrolls or clips its cells never cuts it off.
 */
export function AdminRowMenu({ label, items }: { label: string; items: readonly RowMenuItem[] }) {
  const trigger = useRef<HTMLButtonElement>(null)
  const menu = useRef<HTMLDivElement>(null)
  const [spot, setSpot] = useState<{ top: number; right: number } | null>(null)

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

  function toggle() {
    if (spot) { close(); return }
    const box = trigger.current?.getBoundingClientRect()
    setSpot({ top: (box?.bottom ?? 0) + 6, right: window.innerWidth - (box?.right ?? 0) })
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
        <div aria-label={label} className="adm-rowmenu" onKeyDown={onKeyDown} ref={menu} role="menu" style={{ top: spot.top, right: spot.right }}>
          {items.map((item) => <button aria-label={item.ariaLabel} className={`adm-rowmenu__item${item.tone === 'danger' ? ' is-danger' : ''}`} disabled={item.disabled} key={item.key}
            onClick={() => { close(); item.onSelect() }} role="menuitem" type="button">{item.icon}{item.label}</button>)}
        </div>
      </div>, document.body) : null}
  </>
}
