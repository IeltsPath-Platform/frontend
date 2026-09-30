import { useEffect, useState } from 'react'
import { Clock3 } from 'lucide-react'
import { formatDuration } from '../lib/time'

interface CountdownTimerProps {
  initialSeconds: number
  isRunning?: boolean
  label?: string
}

export function CountdownTimer({ initialSeconds, isRunning = true, label = 'Thời gian còn lại' }: CountdownTimerProps) {
  const [secondsRemaining, setSecondsRemaining] = useState(initialSeconds)

  useEffect(() => {
    if (!isRunning || secondsRemaining === 0) return
    const interval = window.setInterval(() => setSecondsRemaining((current) => Math.max(0, current - 1)), 1000)
    return () => window.clearInterval(interval)
  }, [isRunning, secondsRemaining])

  return (
    <div className="countdown-timer" role="timer" aria-label={`${label}: ${formatDuration(secondsRemaining)}`}>
      <Clock3 aria-hidden="true" size={17} />
      <div><span>{label}</span><strong>{formatDuration(secondsRemaining)}</strong></div>
    </div>
  )
}
