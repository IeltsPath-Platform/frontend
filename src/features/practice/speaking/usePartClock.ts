import { useEffect, useState } from 'react'

export interface PartClock {
  /** Seconds left in the part; null when the part has no time or is not timed. */
  remainingSeconds: number | null
  expired: boolean
}

/**
 * The time of one Speaking part, counted down from the moment the part opens. A part without a time, or one opened again
 * from the review to record a question once more, is not timed.
 */
export function usePartClock(limitSeconds: number | null, timed: boolean): PartClock {
  const [startedAt] = useState(() => Date.now())
  const [now, setNow] = useState(startedAt)
  const active = timed && limitSeconds !== null && limitSeconds > 0

  useEffect(() => {
    if (!active) return undefined
    const timer = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(timer)
  }, [active])

  if (!active || limitSeconds === null) return { remainingSeconds: null, expired: false }
  const remainingSeconds = Math.max(0, Math.ceil(limitSeconds - (now - startedAt) / 1000))
  return { remainingSeconds, expired: remainingSeconds === 0 }
}
