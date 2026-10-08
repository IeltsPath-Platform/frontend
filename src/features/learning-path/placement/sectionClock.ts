import { useEffect, useState } from 'react'

/** Seconds since the section screen opened. */
export function useSectionSeconds() {
  const [seconds, setSeconds] = useState(0)
  useEffect(() => {
    const started = Date.now()
    const timer = window.setInterval(() => setSeconds(Math.floor((Date.now() - started) / 1000)), 1000)
    return () => window.clearInterval(timer)
  }, [])
  return seconds
}

const pad = (value: number) => String(value).padStart(2, '0')
export const formatMinutesSeconds = (seconds: number) => `${pad(Math.floor(seconds / 60))}:${pad(seconds % 60)}`
export const formatHoursMinutesSeconds = (seconds: number) => `${pad(Math.floor(seconds / 3600))}:${formatMinutesSeconds(seconds % 3600)}`
