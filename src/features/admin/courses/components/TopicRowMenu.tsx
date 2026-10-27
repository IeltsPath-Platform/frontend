import { useEffect, useId, useRef, useState, type FocusEvent, type KeyboardEvent, type ReactNode } from 'react'
import { MoreHorizontal } from 'lucide-react'

export interface RowMenuItem {
  key: string
  label: string
  icon?: ReactNode
  disabled?: boolean
  /** A rule above the item, to set a group of actions apart. */
  separated?: boolean
  /** Shown in the danger colour, for an action that takes something away from learners. */
  danger?: boolean
  onSelect: () => void
}

/**
 * The secondary actions of one row behind a single button. It is a disclosure rather than an ARIA menu: the panel is
 * plain buttons in tab order right after the trigger, which is what a keyboard or screen reader user expects here.
 * Esc, a click outside or tabbing away closes it.
 */
export function TopicRowMenu({ label, disabled, items }: { label: string; disabled: boolean; items: readonly RowMenuItem[] }) {
  const [open, setOpen] = useState(false)
  const root = useRef<HTMLDivElement>(null)
  const trigger = useRef<HTMLButtonElement>(null)
  const panelId = useId()

  useEffect(() => {
    if (!open) return
    function away(event: PointerEvent) {
      if (!root.current?.contains(event.target as Node)) setOpen(false)
    }
    document.addEventListener('pointerdown', away)
    return () => document.removeEventListener('pointerdown', away)
  }, [open])
  // Locking the row (a save, a reload) closes a panel left open, so it does not come back when the row unlocks.
  if (disabled && open) setOpen(false)
  const visible = open

  function escape(event: KeyboardEvent) {
    if (event.key !== 'Escape' || !visible) return
    event.stopPropagation()
    setOpen(false)
    trigger.current?.focus()
  }

  function leave(event: FocusEvent) {
    if (!root.current?.contains(event.relatedTarget as Node | null)) setOpen(false)
  }

  return (
    <div className="adm-row-menu" onBlur={leave} onKeyDown={escape} ref={root}>
      <button
        aria-controls={visible ? panelId : undefined}
        aria-expanded={visible}
        aria-label={`Thao tác với ${label}`}
        className="adm-btn adm-row-menu__trigger"
        disabled={disabled}
        onClick={() => setOpen((value) => !value)}
        ref={trigger}
        type="button"
      >
        <MoreHorizontal aria-hidden="true" size={18} />
      </button>
      {visible ? (
        <div aria-label={`Thao tác với ${label}`} className="adm-row-menu__panel" id={panelId} role="group">
          {items.map((item) => (
            <button
              className={`adm-row-menu__item${item.separated ? ' has-rule' : ''}${item.danger ? ' is-danger' : ''}`}
              disabled={item.disabled}
              key={item.key}
              onClick={() => { setOpen(false); item.onSelect() }}
              type="button"
            >
              {item.icon}
              {item.label}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  )
}
