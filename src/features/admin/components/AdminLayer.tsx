import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import { AlertDialog, Dialog } from 'radix-ui'
import { AlertTriangle, ArrowLeft, HelpCircle, X } from 'lucide-react'
import type { ConfirmOptions } from '@/lib/useConfirmRequest'

/** How long the exit animation runs; keep in step with `.adm-layer .is-closing` in admin.css. */
const EXIT_MS = 180

/** A layer's content may need to close the layer itself (a "Hủy" button, or after a save) so the exit animation still plays. */
type LayerContent = ReactNode | ((close: () => void) => ReactNode)

/**
 * Closing a layer plays its exit animation, then asks the owner to unmount it. Where nothing animates (reduced motion,
 * a browser without the stylesheet, tests) the layer closes at once.
 */
function useLayerClose(onClose: () => void) {
  const panel = useRef<HTMLDivElement>(null)
  const timer = useRef<number | undefined>(undefined)
  const [closing, setClosing] = useState(false)
  useEffect(() => () => window.clearTimeout(timer.current), [])
  const close = useCallback(() => {
    if (closing) return
    const animation = panel.current ? getComputedStyle(panel.current).animationName : 'none'
    if (!animation || animation === 'none') { onClose(); return }
    setClosing(true)
    timer.current = window.setTimeout(onClose, EXIT_MS)
  }, [closing, onClose])
  return { panel, closing, close }
}

/**
 * The portal puts a layer outside `.adm-theme`, so it carries the admin tokens itself. The wrapper has no box of its own;
 * only the fixed overlay and panel inside it are drawn.
 */
function Layer({ children }: { children: ReactNode }) {
  return <Dialog.Portal><div className="adm-theme adm-layer">{children}</div></Dialog.Portal>
}

/**
 * Side panel that slides in from the right, for creating or editing a record. A click outside it does not close it,
 * so a half-filled form is not lost by accident; Esc, the back arrow and the form's own cancel button do.
 *
 * A drawer that holds several screens (a list, then one record of it) passes `onBack`: the arrow then steps back a
 * screen instead of closing, and a separate close button appears at the end of the header. `resetScrollKey` brings the
 * body back to the top whenever the screen changes.
 */
export function AdminDrawer({ title, description, size = 'md', onClose, onBack, backLabel = 'Quay lại', resetScrollKey, children }: {
  title: string
  description?: string
  size?: 'md' | 'lg' | 'xl'
  onClose: () => void
  onBack?: () => void
  backLabel?: string
  resetScrollKey?: string
  children: LayerContent
}) {
  const { panel, closing, close } = useLayerClose(onClose)
  const body = useRef<HTMLDivElement>(null)
  useEffect(() => { if (body.current) body.current.scrollTop = 0 }, [resetScrollKey])
  return (
    <Dialog.Root open onOpenChange={(open) => { if (!open) close() }}>
      <Layer>
        <Dialog.Overlay className={`adm-layer__overlay${closing ? ' is-closing' : ''}`} />
        <Dialog.Content
          aria-describedby={undefined}
          className={`adm-drawer adm-drawer--${size}${closing ? ' is-closing' : ''}`}
          onInteractOutside={(event) => event.preventDefault()}
          onOpenAutoFocus={(event) => {
            // A form opens with the cursor in its first field rather than on the back arrow.
            const field = panel.current?.querySelector<HTMLElement>('.adm-drawer__body :is(input:not([type="radio"]), input[type="radio"]:checked, select, textarea):not([disabled], [type="hidden"])')
            if (field) { event.preventDefault(); field.focus() }
          }}
          ref={panel}
        >
          <header className="adm-drawer__header">
            <button aria-label={onBack ? backLabel : 'Đóng'} className="adm-drawer__back" onClick={onBack ?? close} type="button"><ArrowLeft aria-hidden="true" size={18} /></button>
            <div className="adm-drawer__heading">
              <Dialog.Title className="adm-layer__title">{title}</Dialog.Title>
              {description ?<p className="adm-layer__description">{description}</p> : null}
            </div>
            {onBack ? <button aria-label="Đóng" className="adm-drawer__back adm-drawer__close" onClick={close} type="button"><X aria-hidden="true" size={18} /></button> : null}
          </header>
          <div className="adm-drawer__body" ref={body}>{typeof children === 'function' ? children(close) : children}</div>
        </Dialog.Content>
      </Layer>
    </Dialog.Root>
  )
}

/** Centred panel for reading one record. A click outside it, Esc or the close button dismiss it. */
export function AdminModal({ title, description, size = 'md', stacked = false, onClose, children }: {
  title: string
  description?: string
  /** `lg` is a wide panel of a fixed height whose body lays itself out (a picker with its own scrolling list). */
  size?: 'md' | 'lg'
  /** Opened from inside a drawer or another layer: sits above it and dims it. */
  stacked?: boolean
  onClose: () => void
  children: LayerContent
}) {
  const { panel, closing, close } = useLayerClose(onClose)
  return (
    <Dialog.Root open onOpenChange={(open) => { if (!open) close() }}>
      <Layer>
        <Dialog.Overlay className={`adm-layer__overlay${stacked ? ' adm-layer__overlay--stacked' : ''}${closing ? ' is-closing' : ''}`} />
        <Dialog.Content aria-describedby={undefined} className={`adm-modal${size === 'lg' ? ' adm-modal--lg' : ''}${stacked ? ' adm-modal--stacked' : ''}${closing ? ' is-closing' : ''}`} ref={panel}>
          <header className="adm-modal__header">
            <div>
              <Dialog.Title className="adm-layer__title">{title}</Dialog.Title>
              {description ? <p className="adm-layer__description">{description}</p> : null}
            </div>
            <button aria-label="Đóng" className="adm-modal__close" onClick={close} type="button"><X aria-hidden="true" size={18} /></button>
          </header>
          <div className="adm-modal__body">{typeof children === 'function' ? children(close) : children}</div>
        </Dialog.Content>
      </Layer>
    </Dialog.Root>
  )
}

/** Label and value pairs of a record, for the body of an AdminModal. */
export function AdminDetails({ items }: { items: Array<{ label: string; value: ReactNode }> }) {
  return (
    <dl className="adm-details">
      {items.map((item) => <div className="adm-details__row" key={item.label}><dt>{item.label}</dt><dd>{item.value}</dd></div>)}
    </dl>
  )
}

/**
 * A question the author must answer before something is removed or hidden. It stands in for the browser's own box:
 * Esc and the cancel button answer no, and the cancel button has the focus when it opens, so Enter never confirms by
 * accident. It sits above any drawer or modal that asked.
 */
export function AdminConfirmDialog({ title, message, confirmLabel, cancelLabel = 'Hủy', tone = 'default', onAnswer }: ConfirmOptions & {
  onAnswer: (answer: boolean) => void
}) {
  const answer = useRef(false)
  const decided = useRef(false)
  const { panel, closing, close } = useLayerClose(() => onAnswer(answer.current))
  // A button click also makes the dialog ask to close; only the first answer counts.
  function decide(value: boolean) {
    if (decided.current) return
    decided.current = true
    answer.current = value
    close()
  }
  const danger = tone === 'danger'
  return (
    <AlertDialog.Root open onOpenChange={(open) => { if (!open) decide(false) }}>
      <AlertDialog.Portal>
        <div className="adm-theme adm-layer">
          <AlertDialog.Overlay className={`adm-layer__overlay adm-confirm__overlay${closing ? ' is-closing' : ''}`} />
          <AlertDialog.Content className={`adm-modal adm-confirm${closing ? ' is-closing' : ''}`} ref={panel}>
            <span aria-hidden="true" className={`adm-confirm__icon${danger ? ' is-danger' : ''}`}>{danger ? <AlertTriangle size={22} /> : <HelpCircle size={22} />}</span>
            <div className="adm-confirm__text">
              <AlertDialog.Title className="adm-layer__title">{title}</AlertDialog.Title>
              <AlertDialog.Description className="adm-confirm__message">{message}</AlertDialog.Description>
            </div>
            <div className="adm-confirm__actions">
              <AlertDialog.Cancel asChild><button className="adm-btn" onClick={() => decide(false)} type="button">{cancelLabel}</button></AlertDialog.Cancel>
              <AlertDialog.Action asChild><button className={`adm-btn ${danger ? 'adm-btn--destructive' : 'adm-btn--primary'}`} onClick={() => decide(true)} type="button">{confirmLabel}</button></AlertDialog.Action>
            </div>
          </AlertDialog.Content>
        </div>
      </AlertDialog.Portal>
    </AlertDialog.Root>
  )
}
