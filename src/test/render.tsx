import type { ReactElement, ReactNode } from 'react'
import { render as renderUi, type RenderOptions } from '@testing-library/react'
import { ToastProvider } from '@/components/toast/ToastProvider'

// A test helper, never hot reloaded, so the rule about files that mix components and other exports does not apply.
// eslint-disable-next-line react-refresh/only-export-components
export * from '@testing-library/react'

/**
 * Testing Library's `render` inside a `ToastProvider`, for screens that report errors as toasts. A `wrapper` given in the
 * options still applies, inside the provider.
 */
export function render(ui: ReactElement, options: RenderOptions = {}) {
  const Inner = options.wrapper
  const wrapper = ({ children }: { children: ReactNode }) => (
    <ToastProvider>{Inner ? <Inner>{children}</Inner> : children}</ToastProvider>
  )
  return renderUi(ui, { ...options, wrapper })
}
