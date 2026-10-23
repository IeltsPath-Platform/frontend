import { useEffect } from 'react'

export function useDraftPolling(running: boolean, reload: () => void) {
  useEffect(() => {
    if (!running) return
    const timer = window.setInterval(reload, 5000)
    return () => window.clearInterval(timer)
  }, [running, reload])
}
