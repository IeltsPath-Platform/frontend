import { useState } from 'react'
import { X } from 'lucide-react'
import './matching-board.css'

export interface MatchingRow {
  id: string
  number: number
  prompt: string
  /** The key of the chosen option ("A"), or empty. */
  value: string
}

export interface MatchingOption {
  value: string
  label: string
}

/**
 * Matching as the test paper draws it: the statements stacked in a column on the left, each with a slot, and one shared
 * "List of options" on the right. An option goes into a slot by dragging it there, or by choosing it and then the slot (in
 * either order). A slot can be emptied. An option stays in the list after it is used, since an answer may be used twice.
 */
export function MatchingBoard({ rows, options, disabled, rowIdPrefix, onChange, onFocusRow }: {
  rows: readonly MatchingRow[]
  options: readonly MatchingOption[]
  disabled: boolean
  /** Prefix of the DOM id of a row, so the question numbers below can scroll to it. */
  rowIdPrefix: string
  onChange: (rowId: string, value: string) => void
  onFocusRow: (number: number) => void
}) {
  const [pickedOption, setPickedOption] = useState<string | null>(null)
  const [activeRow, setActiveRow] = useState<string | null>(null)
  const [dragOver, setDragOver] = useState<string | null>(null)
  const labelOf = new Map(options.map((option) => [option.value, option.label]))
  const usedValues = new Set(rows.map((row) => row.value).filter(Boolean))

  function assign(row: MatchingRow, value: string) {
    if (disabled) return
    onChange(row.id, value)
    onFocusRow(row.number)
    setPickedOption(null)
    setActiveRow(null)
  }

  function clickSlot(row: MatchingRow) {
    if (disabled) return
    onFocusRow(row.number)
    if (pickedOption) assign(row, pickedOption)
    else setActiveRow((current) => (current === row.id ? null : row.id))
  }

  function clickOption(value: string) {
    if (disabled) return
    const target = rows.find((row) => row.id === activeRow)
    if (target) assign(target, value)
    else setPickedOption((current) => (current === value ? null : value))
  }

  return (
    <div className="mb-board">
      <ol className="mb-rows">
        {rows.map((row) => {
          const chosen = row.value ? labelOf.get(row.value) : undefined
          return (
            <li key={row.id} id={`${rowIdPrefix}${row.id}`} className="mb-row">
              <span className="mb-prompt">{row.prompt}</span>
              <div
                className={`mb-slot${row.value ? ' is-filled' : ''}${activeRow === row.id ? ' is-active' : ''}${dragOver === row.id ? ' is-over' : ''}${pickedOption ? ' is-waiting' : ''}`}
                onDragOver={(event) => { if (!disabled) { event.preventDefault(); setDragOver(row.id) } }}
                onDragLeave={() => setDragOver((current) => (current === row.id ? null : current))}
                onDrop={(event) => {
                  event.preventDefault()
                  setDragOver(null)
                  const value = event.dataTransfer.getData('text/plain')
                  if (labelOf.has(value)) assign(row, value)
                }}
              >
                <button
                  type="button"
                  className="mb-slot-button"
                  disabled={disabled}
                  aria-label={row.value ? `Câu ${row.number}: đã chọn ${row.value}` : `Câu ${row.number}: chưa chọn`}
                  onClick={() => clickSlot(row)}
                >
                  <span className="mb-slot-number">{row.number}</span>
                  {row.value && <><b className="mb-slot-key">{row.value}</b><span className="mb-slot-text">{chosen}</span></>}
                </button>
                {row.value && !disabled && (
                  <button type="button" className="mb-slot-clear" aria-label={`Bỏ đáp án câu ${row.number}`} onClick={() => assign(row, '')}>
                    <X size={13} aria-hidden="true" />
                  </button>
                )}
              </div>
            </li>
          )
        })}
      </ol>

      <div className="mb-options">
        <p className="mb-options-title">List of options</p>
        <p className="mb-options-hint">Kéo đáp án thả vào ô trống, hoặc bấm chọn đáp án rồi bấm vào ô trống để điền.</p>
        <ul>
          {options.map((option) => (
            <li key={option.value}>
              <button
                type="button"
                draggable={!disabled}
                disabled={disabled}
                className={`mb-option${pickedOption === option.value ? ' is-picked' : ''}${usedValues.has(option.value) ? ' is-used' : ''}`}
                aria-pressed={pickedOption === option.value}
                onDragStart={(event) => { event.dataTransfer.setData('text/plain', option.value); event.dataTransfer.effectAllowed = 'move'; setPickedOption(null) }}
                onClick={() => clickOption(option.value)}
              >
                <b>{option.value}</b>
                <span>{option.label}</span>
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
