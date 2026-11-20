import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { collectErrors, type FormSchema } from './useFormErrors'

/**
 * The validation of a form that keeps its values in the inputs and reads them from `FormData` when it is sent (the
 * sign-in forms). Same behaviour as `useFormErrors`: nothing shows until the form was sent; then each field shows one
 * message under it and judges it again as it is edited. Spread `onInput` on the `<form>`.
 *
 * - `validate(form)` shows every error at once, moves focus to the first invalid input, and returns whether the form is valid.
 * - `errors` is the message of each field by its `name`.
 */
export function useFormDataErrors(schema: FormSchema) {
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [sent, setSent] = useState(false)
  const [focusRequest, setFocusRequest] = useState<HTMLFormElement | null>(null)

  const read = useCallback((form: HTMLFormElement) => collectErrors(schema, Object.fromEntries(new FormData(form))), [schema])

  useEffect(() => {
    focusRequest?.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus()
  }, [focusRequest])

  const validate = useCallback((form: HTMLFormElement): boolean => {
    const found = read(form)
    setSent(true)
    setErrors(found)
    const valid = Object.keys(found).length === 0
    if (!valid) setFocusRequest(form)
    return valid
  }, [read])

  const onInput = useCallback((event: FormEvent<HTMLFormElement>) => {
    if (sent) setErrors(read(event.currentTarget))
  }, [read, sent])

  const reset = useCallback(() => { setSent(false); setErrors({}); setFocusRequest(null) }, [])

  return { errors, validate, onInput, reset }
}
