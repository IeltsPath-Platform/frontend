import { useEffect, useState, type ReactNode } from 'react'
import { AudioLines, Check, RefreshCw } from 'lucide-react'
import owlWait from '@/assets/owl/nav-owl-wait.webp'
import './ai-wait.css'

export interface AiWaitStep {
  label: string
}

function clock(seconds: number) {
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`
}

/** Seconds since the panel appeared, so the learner can see the page is alive and how long it has taken. */
function useElapsedSeconds() {
  const [seconds, setSeconds] = useState(0)
  useEffect(() => {
    const timer = window.setInterval(() => setSeconds((value) => value + 1), 1000)
    return () => window.clearInterval(timer)
  }, [])
  return seconds
}

/**
 * The waiting screen for an AI grade, the one place the app does not use the grey blocks: the owl waits with the learner,
 * a waveform moves while the work goes on, and the time already waited counts up. When the grader reports its stages pass
 * `steps` and `stage` for a tracker; without them the bar slides, since a made-up progress would be a lie. No fixed time is
 * promised: `note` changes with the seconds waited instead.
 */
export function AiWaitPanel({ title, hint, steps, stage = 0, retrying = false, note, ariaLabel = 'Tiến trình chấm bài', compact = false, children }: {
  title: string
  hint: string
  steps?: readonly AiWaitStep[]
  stage?: number
  /** The grader could not be reached and the system tries again: the panel turns orange and keeps the stage. */
  retrying?: boolean
  note?: (seconds: number) => string
  ariaLabel?: string
  compact?: boolean
  /** Extra controls under the panel, such as a button to check again. */
  children?: ReactNode
}) {
  const seconds = useElapsedSeconds()
  return (
    <section
      aria-label={ariaLabel}
      aria-live="polite"
      className={`sw${retrying ? ' sw--retry' : ''}${compact ? ' sw--compact' : ''}`}
      role="status"
      style={steps ? { ['--sw-cols' as string]: steps.length } : undefined}
    >
      <img alt="" className="sw__owl" draggable={false} src={owlWait} />
      <div aria-hidden="true" className="sw__wave">{[0, 1, 2, 3, 4, 5, 6].map((bar) => <i key={bar} style={{ animationDelay: `${bar * 0.12}s` }} />)}</div>
      <h2>{title}</h2>
      <p className="sw__hint">{hint}</p>

      {steps ? (
        <>
          <ol aria-label="Các bước chấm bài" className="sw__steps">
            {steps.map((step, index) => {
              const state = index < stage ? 'done' : index === stage ? 'now' : 'todo'
              return (
                <li aria-current={state === 'now' ? 'step' : undefined} className={`sw__step sw__step--${state}`} key={step.label}>
                  <span aria-hidden="true" className="sw__dot">
                    {state === 'done' ? <Check size={16} /> : state === 'now' ? (retrying ? <RefreshCw size={15} /> : <AudioLines size={16} />) : index + 1}
                  </span>
                  <span className="sw__label">{step.label}</span>
                </li>
              )
            })}
          </ol>
          <div aria-hidden="true" className="sw__meter"><u style={{ width: `${((stage + 0.5) / steps.length) * 100}%` }} /></div>
        </>
      ) : (
        <div aria-hidden="true" className="sw__meter sw__meter--sliding"><u /></div>
      )}
      <p className="sw__foot"><span>Đã chờ {clock(seconds)}</span>{note ? <span>{note(seconds)}</span> : null}</p>
      {children}
    </section>
  )
}