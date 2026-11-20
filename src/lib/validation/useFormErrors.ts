import { useCallback, useEffect, useMemo, useState } from 'react'
import type { z } from 'zod'
import { isRequiredField } from './fields'

export type FormSchema = z.ZodObject<z.ZodRawShape>

export interface FieldState {
  /** The message to show under the field, once the form was sent or the field was left. */
  error: string | undefined
  required: boolean
  /** Call when the field loses focus, so its error may show before the form is sent. */
  onTouch: () => void
}

/**
 * The first message of every field the schema refuses, by field name. For a form that is not held in React state (one
 * that reads its inputs from `FormData`), where `useFormErrors` does not fit.
 */
export function collectErrors(schema: FormSchema, values: Record<string, unknown>): Record<string, string> {
  const result = schema.safeParse(values)
  const found: Record<string, string> = {}
  if (!result.success) {
    for (const issue of result.error.issues) {
      const name = String(issue.path[0] ?? '')
      if (!(name in found)) found[name] = issue.message
    }
  }
  return found
}

/**
 * The validation of a form whose state lives in `useState`. Give it the schema and the current values: the errors are
 * worked out from them on every render, one message per field (the first problem the schema finds). An error shows
 * under its field after the form was sent or the field was left, and goes away as soon as the value is fixed.
 *
 * - `validate()` marks the form as sent, shows every error at once and moves focus to the first invalid field; it
 *   returns whether the form is valid. Focus goes to the first invalid field of the top-most dialog, or of the page.
 * - `field(name)` is spread onto `AdminField`: its error, its red star and the touch handler.
 */
export function useFormErrors(schema: FormSchema, values: Record<string, unknown>) {
  const [submitted, setSubmitted] = useState(false)
  const [touched, setTouched] = useState<ReadonlySet<string>>(new Set())
  const [focusRequest, setFocusRequest] = useState(0)

  const key = JSON.stringify(values)
  const errors = useMemo(() => collectErrors(schema, JSON.parse(key) as Record<string, unknown>), [schema, key])

  useEffect(() => {
    if (focusRequest === 0) return
    const dialogs = document.querySelectorAll('[role="dialog"]')
    const root: ParentNode = dialogs.length > 0 ? dialogs[dialogs.length - 1]! : document
    root.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus()
  }, [focusRequest])

  const touch = useCallback((name: string) => {
    setTouched((current) => (current.has(name) ? current : new Set(current).add(name)))
  }, [])

  const validate = useCallback((): boolean => {
    setSubmitted(true)
    const valid = Object.keys(errors).length === 0
    if (!valid) setFocusRequest((current) => current + 1)
    return valid
  }, [errors])

  const field = useCallback((name: string): FieldState => ({
    error: submitted || touched.has(name) ? errors[name] : undefined,
    required: isRequiredField(schema, name),
    onTouch: () => touch(name),
  }), [errors, schema, submitted, touched, touch])

  const reset = useCallback(() => { setSubmitted(false); setTouched(new Set()) }, [])

  return { validate, field, reset, errors }
}
