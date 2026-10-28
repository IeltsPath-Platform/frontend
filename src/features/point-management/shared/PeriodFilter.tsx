import { useId } from 'react'
import type { RangeOption } from '../data/selectors'

/**
 * The time filter. It sits in one row above everything it scopes, never inside a chart card, so the chart, the
 * tables and the lists below always describe the same batches.
 */
export function PeriodFilter({ options, value, onChange }: {
  options: readonly RangeOption[]
  value: string
  onChange: (value: string) => void
}) {
  const id = useId()
  return (
    <div className="pm-filterbar">
      <label htmlFor={id}>Thời gian</label>
      <select className="adm-select" id={id} onChange={(event) => onChange(event.target.value)} value={value}>
        {options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
      </select>
    </div>
  )
}
