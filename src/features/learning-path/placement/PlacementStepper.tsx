import { Check } from 'lucide-react'
import type { CSSProperties } from 'react'

const STEPS = ['Khảo sát', 'Bài test', 'Kết quả'] as const

interface PlacementStepperProps {
  /** Zero-based index of the current step. */
  current: number
  /** How far the current step is done, 0..1; fills the connector towards the next step. */
  progress?: number
  /** Spans the wider report content on the result step. */
  wide?: boolean
}

/** Survey → test → result progress across the top of the placement flow. */
export function PlacementStepper({ current, progress = 0, wide = false }: PlacementStepperProps) {
  const partial = Math.max(0, Math.min(1, progress))
  return (
    <nav className={`pl-stepper${wide ? ' pl-stepper--wide' : ''}`} aria-label="Các bước bài kiểm tra đầu vào">
      <ol>
        {STEPS.map((label, index) => {
          const state = index < current ? 'done' : index === current ? 'current' : 'todo'
          // The connector after a step fills as that step is completed.
          const fill = index < current ? 1 : index === current ? partial : 0
          return (
            <li className={`pl-stepper__step pl-stepper__step--${state}`} key={label} aria-current={state === 'current' ? 'step' : undefined}>
              <span className="pl-stepper__dot">
                {state === 'done' ? <Check aria-hidden="true" size={18} strokeWidth={3} /> : index + 1}
              </span>
              <span className="pl-stepper__label">{label}</span>
              {index < STEPS.length - 1 ? (
                <span className="pl-stepper__seg" aria-hidden="true">
                  <span style={{ '--pl-seg': fill } as CSSProperties} />
                </span>
              ) : null}
            </li>
          )
        })}
      </ol>
    </nav>
  )
}
