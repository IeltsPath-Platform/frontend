import { act, render, screen } from '@testing-library/react'
import { useState } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { SandTransition } from './SandTransition'

function TransitionHarness({ onComplete }: { onComplete: () => void }) {
  const [active, setActive] = useState(true)
  return active ? <SandTransition onComplete={() => { onComplete(); setActive(false) }} /> : null
}

describe('SandTransition', () => {
  afterEach(() => {
    vi.useRealTimers()
    vi.restoreAllMocks()
  })

  it('draws a non-interactive canvas and removes it after the transition', () => {
    vi.useFakeTimers()
    const onComplete = vi.fn()
    const context = {
      arc: vi.fn(),
      beginPath: vi.fn(),
      clearRect: vi.fn(),
      fill: vi.fn(),
      scale: vi.fn(),
    }
    Object.defineProperty(HTMLCanvasElement.prototype, 'getContext', {
      configurable: true,
      value: vi.fn(() => context),
    })
    vi.spyOn(window, 'requestAnimationFrame').mockReturnValue(1)
    vi.spyOn(window, 'cancelAnimationFrame').mockImplementation(() => undefined)
    Object.defineProperty(window, 'matchMedia', { configurable: true, value: vi.fn(() => ({ matches: false })) })

    const { unmount } = render(<TransitionHarness onComplete={onComplete} />)
    const canvas = screen.getByTestId('community-sand-transition')

    expect(canvas).toHaveClass('community-sand-transition')
    expect(canvas).toHaveStyle({ pointerEvents: 'none' })
    act(() => vi.advanceTimersByTime(1900))
    expect(onComplete).toHaveBeenCalledOnce()
    expect(screen.queryByTestId('community-sand-transition')).toBeNull()

    unmount()
    expect(window.cancelAnimationFrame).toHaveBeenCalledWith(1)
  })
})
