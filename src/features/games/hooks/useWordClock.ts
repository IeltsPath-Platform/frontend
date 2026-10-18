import { useEffect, useState } from 'react'
export function useWordClock(deadlineAt: string | null) {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    if (!deadlineAt) return
    const timer = window.setInterval(() => setNow(Date.now()), 250)
    return () => window.clearInterval(timer)
  }, [deadlineAt])
  return deadlineAt === null
    ? null
    : Math.min(
        180,
        Math.max(0, Math.ceil((Date.parse(deadlineAt) - now) / 1000)),
      )
}
