import { useEffect, useEffectEvent, useState } from 'react'

/** Remaining share of a round's time, ticking ~10×/s; fires `onExpire` once when it reaches zero. */
export function useCountdown(opensAt: string | null, deadlineAt: string | null, offsetMs: number, running: boolean, onExpire: () => void) {
  const [now, setNow] = useState(() => Date.now())
  const expire = useEffectEvent(onExpire)

  useEffect(() => {
    if (!running || !deadlineAt) return
    let fired = false
    const id = window.setInterval(() => {
      const at = Date.now()
      setNow(at)
      if (!fired && at + offsetMs >= Date.parse(deadlineAt)) {
        fired = true
        expire()
      }
    }, 100)
    return () => window.clearInterval(id)
  }, [deadlineAt, offsetMs, running])

  if (!opensAt || !deadlineAt) return { fraction: 1, seconds: 0 }
  const start = Date.parse(opensAt)
  const end = Date.parse(deadlineAt)
  const remaining = Math.max(0, end - (now + offsetMs))
  // While paused (launch/reveal) `now` stops updating, so the bar freezes where the player answered.
  return { fraction: Math.min(1, remaining / Math.max(1, end - start)), seconds: Math.ceil(remaining / 1000) }
}
