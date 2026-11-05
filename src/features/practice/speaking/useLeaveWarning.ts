import { useEffect } from 'react'

/** Asks the browser to confirm before the page is closed or reloaded, while there is work that would be lost. */
export function useLeaveWarning(active: boolean): void {
  useEffect(() => {
    if (!active) return
    const warn = (event: BeforeUnloadEvent) => {
      event.preventDefault()
      event.returnValue = ''
    }
    window.addEventListener('beforeunload', warn)
    return () => window.removeEventListener('beforeunload', warn)
  }, [active])
}
