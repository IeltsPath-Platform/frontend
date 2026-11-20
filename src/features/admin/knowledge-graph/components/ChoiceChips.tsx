import { useId } from 'react'

/**
 * A short list of choices as one tap each, in the way the band scale is: arrow keys move along it like any radio group.
 * An optional one (`clearable`) is emptied by tapping the chosen chip again.
 */
export function ChoiceChips({ label, required = false, clearable = false, error, value, options, onChange }: {
  label: string
  required?: boolean
  clearable?: boolean
  /** The message to show in red under the chips when nothing valid is chosen. */
  error?: string
  value: string
  options: readonly { value: string; label: string }[]
  onChange: (value: string) => void
}) {
  const name = useId()
  return <fieldset className="kg-choice">
    <legend>{label}{required ? <span aria-hidden="true" className="adm-required" /> : null}</legend>
    <div className="kg-choice__chips">
      {options.map((option) => <label className="kg-choice__chip" key={option.value}>
        <input
          checked={option.value === value}
          name={name}
          onChange={() => onChange(option.value)}
          onClick={() => { if (clearable && option.value === value) onChange('') }}
          type="radio"
          value={option.value}
        />
        <span>{option.label}</span>
      </label>)}
    </div>
    {error ? <p className="adm-field__error" role="alert">{error}</p> : null}
  </fieldset>
}
