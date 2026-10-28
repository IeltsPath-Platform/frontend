import { useCallback, useState } from 'react'
import { useToast } from '@/components/toast/toastContext'

/** An error is read once and then acted on, so it stays longer than the default toast. */
const ERROR_TOAST_MS = 8000

/** Shows a form or action error as an error toast; several lines of a message stay on separate lines. */
export function useAdminErrorToast(): (message: string) => void {
  const { toast } = useToast()
  return useCallback((message: string) => { toast({ title: message, tone: 'error', duration: ERROR_TOAST_MS }) }, [toast])
}

/**
 * The error of a form or an action. It works like `useState<string | null>`, and every message set is also shown as a
 * toast, so a repeat of the same message shows again. Setting `null` clears it and shows nothing.
 */
export function useAdminError(): [string | null, (message: string | null) => void] {
  const notify = useAdminErrorToast()
  const [error, setError] = useState<string | null>(null)
  const report = useCallback((message: string | null) => {
    setError(message)
    if (message) notify(message)
  }, [notify])
  return [error, report]
}
