import { useCallback, useEffect, useRef, useState } from 'react'

export interface ConfirmOptions {
  title: string
  message: string
  confirmLabel: string
  cancelLabel?: string
  /** `danger` draws the confirm button as a destructive one: for removing something or taking it away from learners. */
  tone?: 'danger' | 'default'
}

/**
 * What every confirmation popup shares, whatever it looks like. `ask` opens one and resolves with the answer, so a call
 * site reads `if (!(await confirm(...))) return` where it used to call the browser's own box. `settle` is what the popup
 * calls with that answer. A question asked while another is open, or left open as the owner unmounts, answers `false`.
 */
export function useConfirmRequest() {
  const [request, setRequest] = useState<ConfirmOptions | null>(null)
  const resolver = useRef<((answer: boolean) => void) | null>(null)

  const settle = useCallback((answer: boolean) => {
    resolver.current?.(answer)
    resolver.current = null
    setRequest(null)
  }, [])

  const ask = useCallback((options: ConfirmOptions) => new Promise<boolean>((resolve) => {
    resolver.current?.(false)
    resolver.current = resolve
    setRequest(options)
  }), [])

  useEffect(() => () => {
    resolver.current?.(false)
    resolver.current = null
  }, [])

  return { request, ask, settle }
}
