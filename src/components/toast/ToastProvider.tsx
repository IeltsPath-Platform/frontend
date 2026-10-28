import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { X } from 'lucide-react'
import { ToastContext, type ToastApi, type ToastOptions } from './toastContext'
import './toast.css'

const DEFAULT_DURATION_MS = 4000
/** Must match the fade-out duration in toast.css. */
const EXIT_MS = 200
const MAX_VISIBLE = 3
/** Gap between the bottom of the site header and the first toast. */
const HEADER_GAP_PX = 12
const MIN_TOP_PX = 16

interface ToastItemState extends Required<Omit<ToastOptions, 'description'>> {
  id: number
  description?: string
  closing: boolean
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItemState[]>([])
  const nextId = useRef(0)
  const regionRef = useRef<HTMLDivElement>(null)

  // The site header (or the admin top bar) is sticky and its height changes with the sub-navigation row, so the region is
  // placed under it at the moment a toast opens (and again on resize) instead of covering it.
  const placeBelowHeader = useCallback(() => {
    const region = regionRef.current
    const header = document.querySelector<HTMLElement>('.site-main-header, .adm-topbar')
    if (!region || !header) return
    const bottom = Math.round(header.getBoundingClientRect().bottom)
    region.style.top = `${Math.max(MIN_TOP_PX, bottom + HEADER_GAP_PX)}px`
  }, [])

  useEffect(() => {
    window.addEventListener('resize', placeBelowHeader)
    return () => window.removeEventListener('resize', placeBelowHeader)
  }, [placeBelowHeader])

  const dismiss = useCallback((id: number) => {
    setItems((current) => current.map((item) => (item.id === id ? { ...item, closing: true } : item)))
  }, [])

  const remove = useCallback((id: number) => {
    setItems((current) => current.filter((item) => item.id !== id))
  }, [])

  const toast = useCallback((options: ToastOptions) => {
    placeBelowHeader()
    const id = ++nextId.current
    const item: ToastItemState = {
      id,
      title: options.title,
      description: options.description,
      tone: options.tone ?? 'info',
      duration: options.duration ?? DEFAULT_DURATION_MS,
      closing: false,
    }
    setItems((current) => [...current, item].slice(-MAX_VISIBLE))
    return id
  }, [placeBelowHeader])

  const api = useMemo<ToastApi>(() => ({ toast, dismiss }), [toast, dismiss])

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div ref={regionRef} className="toast-region" aria-live="polite">
        {items.map((item) => (
          <ToastItem key={item.id} item={item} onDismiss={dismiss} onRemove={remove} />
        ))}
      </div>
    </ToastContext.Provider>
  )
}

function ToastItem({ item, onDismiss, onRemove }: {
  item: ToastItemState
  onDismiss: (id: number) => void
  onRemove: (id: number) => void
}) {
  // One timer per phase: auto-dismiss while open, then unmount once the fade-out has finished.
  useEffect(() => {
    const timer = item.closing
      ? window.setTimeout(() => onRemove(item.id), EXIT_MS)
      : window.setTimeout(() => onDismiss(item.id), item.duration)
    return () => window.clearTimeout(timer)
  }, [item.id, item.closing, item.duration, onDismiss, onRemove])

  return (
    <div
      className={`toast toast--${item.tone}`}
      role={item.tone === 'error' ? 'alert' : 'status'}
      data-closing={item.closing}
    >
      <div className="toast__body">
        <p className="toast__title">{item.title}</p>
        {item.description && <p className="toast__description">{item.description}</p>}
      </div>
      <button type="button" className="toast__close" aria-label="Đóng thông báo" onClick={() => onDismiss(item.id)}>
        <X size={16} aria-hidden="true" />
      </button>
    </div>
  )
}
