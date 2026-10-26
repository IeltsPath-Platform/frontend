import { useState } from 'react'
import { Minus, Plus } from 'lucide-react'

const STEP = 0.5
const MIN = 0
const MAX = 9
/** The bands most essays get, one press away. Jumping to one is the examiner's choice: nothing is filled in for them. */
const QUICK = [5, 5.5, 6, 6.5, 7, 7.5, 8] as const

const isBand = (value: number) => Number.isFinite(value) && value >= MIN && value <= MAX && Number.isInteger(value * 2)

/**
 * A band from 0 to 9 in half steps. The buttons (and the arrow keys) always move by exactly half a band, from 0 when the box
 * is empty; the number can also be typed, or picked from the row of usual bands below. An empty box means "not graded yet":
 * no score is ever suggested or filled in. The box keeps what is being typed until it loses focus, so "6." on the way to
 * "6.5" is not rewritten under the examiner's fingers.
 */
export function BandStepper({ label, value, onChange }: { label: string; value: number | null; onChange: (value: number | null) => void }) {
  const [typed, setTyped] = useState<string | null>(null)
  const shown = typed ?? (value === null ? '' : value.toFixed(1))
  const invalid = typed !== null && typed.trim() !== '' && !isBand(Number(typed.replace(',', '.')))

  function move(delta: number) {
    setTyped(null)
    onChange(Math.min(MAX, Math.max(MIN, (value ?? MIN) + delta)))
  }

  function pick(band: number) {
    setTyped(null)
    onChange(band)
  }

  function type(text: string) {
    setTyped(text)
    if (text.trim() === '') { onChange(null); return }
    const number = Number(text.replace(',', '.'))
    if (isBand(number)) onChange(number)
  }

  return (
    <div className="eg-band">
      <div className="eg-stepper">
        <button aria-label={`Giảm ${label}`} className="adm-btn eg-stepper__btn" disabled={value === null || value <= MIN} onClick={() => move(-STEP)} type="button">
          <Minus aria-hidden="true" size={18} />
        </button>
        <input
          aria-invalid={invalid || undefined}
          aria-label={label}
          className="adm-input eg-stepper__input"
          inputMode="decimal"
          onBlur={() => setTyped(null)}
          onChange={(event) => type(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'ArrowUp') { event.preventDefault(); move(STEP) }
            if (event.key === 'ArrowDown') { event.preventDefault(); move(-STEP) }
          }}
          placeholder="—"
          type="text"
          value={shown} />
        <button aria-label={`Tăng ${label}`} className="adm-btn eg-stepper__btn" disabled={value !== null && value >= MAX} onClick={() => move(STEP)} type="button">
          <Plus aria-hidden="true" size={18} />
        </button>
      </div>
      <div aria-label={`Chọn nhanh ${label}`} className="eg-band__quick" role="group">
        {QUICK.map((band) => (
          <button aria-pressed={value === band} className="eg-band__chip" key={band} onClick={() => pick(band)} type="button">{band.toFixed(1)}</button>
        ))}
      </div>
    </div>
  )
}
