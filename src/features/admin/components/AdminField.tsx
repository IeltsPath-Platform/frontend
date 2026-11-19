import { cloneElement, useId, type FocusEvent, type ReactElement, type ReactNode } from 'react'

interface ControlProps {
  id?: string
  'aria-invalid'?: boolean
  'aria-required'?: boolean
  'aria-describedby'?: string
  onBlur?: (event: FocusEvent<HTMLElement>) => void
}

/**
 * The label and the input of one field of an admin form. A required field carries a red star after its label (drawn by
 * CSS, so it is not part of the accessible name); a field with an error gets a red border and the message in red right
 * under it. The label sits outside the message, so a test or a screen reader finds the field by its label alone.
 *
 * `children` is the one input, select or textarea; it receives the id, `aria-invalid`, `aria-required` and
 * `aria-describedby` from here. Spread `form.field(name)` of `useFormErrors` onto it.
 */
export function AdminField({ label, required = false, error, onTouch, className, children }: {
  label: ReactNode
  required?: boolean
  error?: string
  onTouch?: () => void
  className?: string
  children: ReactElement<ControlProps>
}) {
  const id = useId()
  const errorId = `${id}-error`
  const control = cloneElement(children, {
    id,
    'aria-invalid': error ? true : undefined,
    'aria-required': required ? true : undefined,
    'aria-describedby': error ? errorId : children.props['aria-describedby'],
    onBlur: (event: FocusEvent<HTMLElement>) => { children.props.onBlur?.(event); onTouch?.() },
  })
  return <div className={`adm-field${error ? ' is-invalid' : ''}${className ? ` ${className}` : ''}`}>
    <label className="adm-field__label" htmlFor={id}>{label}{required ? <span aria-hidden="true" className="adm-required" /> : null}</label>
    {control}
    {error ? <p className="adm-field__error" id={errorId} role="alert">{error}</p> : null}
  </div>
}
