import { useEffect, useRef } from 'react'

/** True when the key press belongs to a field the learner is typing in, so page shortcuts must stay out of it. */
export function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false
  if (target.isContentEditable) return true
  return Boolean(target.closest('input, textarea, select, [contenteditable="true"]'))
}

export interface NotebookShortcutHandlers {
  /** Called with 0, 1 or 2 for the keys 1, 2 and 3. */
  onSelectTab: (index: number) => void
  onReview: () => void
  onFocusSearch: () => void
}

/**
 * Desktop keyboard shortcuts of the notebook page: 1–3 switch tabs, R starts the review, / jumps to the search box.
 * Nothing fires while typing, with a modifier held, or when a popup is open (its own keys win).
 */
export function useNotebookShortcuts(handlers: NotebookShortcutHandlers) {
  const latest = useRef(handlers)
  useEffect(() => { latest.current = handlers })

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.defaultPrevented || event.altKey || event.ctrlKey || event.metaKey) return
      if (isTypingTarget(event.target)) return
      if (document.querySelector('[role="dialog"], [role="alertdialog"]')) return
      if (event.key === '1' || event.key === '2' || event.key === '3') {
        latest.current.onSelectTab(Number(event.key) - 1)
      } else if (event.key === 'r' || event.key === 'R') {
        latest.current.onReview()
      } else if (event.key === '/') {
        event.preventDefault()
        latest.current.onFocusSearch()
      }
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [])
}

/**
 * Keeps `--nb-sticky-top` on the document equal to the height of the sticky site header, so sticky page parts
 * sit right under it on every screen size.
 */
export function useSiteHeaderOffset() {
  useEffect(() => {
    const header = document.querySelector<HTMLElement>('.site-main-header')
    const root = document.documentElement
    if (!header) return
    const update = () => root.style.setProperty('--nb-sticky-top', `${header.getBoundingClientRect().height}px`)
    update()
    const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(update)
    observer?.observe(header)
    return () => {
      observer?.disconnect()
      root.style.removeProperty('--nb-sticky-top')
    }
  }, [])
}
