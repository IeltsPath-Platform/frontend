import { createContext, useContext } from 'react'

export type ToastTone = 'success' | 'error' | 'info'

export interface ToastOptions {
  title: string
  description?: string
  tone?: ToastTone
  /** Milliseconds the toast stays fully visible before it starts to fade out. */
  duration?: number
}

export interface ToastApi {
  toast: (options: ToastOptions) => number
  dismiss: (id: number) => void
}

export const ToastContext = createContext<ToastApi | null>(null)

export function useToast(): ToastApi {
  const context = useContext(ToastContext)
  if (!context) throw new Error('useToast must be used inside ToastProvider')
  return context
}
