import { fireEvent, render, screen } from '@testing-library/react'
import { beforeAll, describe, expect, it, vi } from 'vitest'
import { clampColumn } from '../lib/columnWidth'
import { ColumnResizer } from './ColumnResizer'

// jsdom has no PointerEvent; a mouse event carries the coordinates the resizer reads.
beforeAll(() => {
  if (!('PointerEvent' in window)) {
    Object.defineProperty(window, 'PointerEvent', { value: class extends MouseEvent {}, configurable: true })
  }
})

const container = { getBoundingClientRect: () => ({ left: 100, right: 1100, width: 1000 }) } as HTMLElement

function renderResizer(edge: 'left' | 'right') {
  const onResize = vi.fn()
  render(<ColumnResizer edge={edge} containerRef={{ current: container }} onResize={onResize} label="Độ rộng" />)
  return { onResize, handle: screen.getByRole('separator', { name: 'Độ rộng' }) }
}

describe('ColumnResizer', () => {
  it('sizes a left column from the left edge while the handle is dragged, and stops when it is let go', () => {
    const { onResize, handle } = renderResizer('left')

    fireEvent.pointerMove(handle, { clientX: 400 }) // not dragging yet
    expect(onResize).not.toHaveBeenCalled()

    fireEvent.pointerDown(handle, { clientX: 300 })
    fireEvent.pointerMove(handle, { clientX: 500 })
    expect(onResize).toHaveBeenLastCalledWith(400)

    fireEvent.pointerUp(handle)
    fireEvent.pointerMove(handle, { clientX: 600 })
    expect(onResize).toHaveBeenCalledTimes(1)
  })

  it('sizes a right column from the right edge', () => {
    const { onResize, handle } = renderResizer('right')
    fireEvent.pointerDown(handle, { clientX: 900 })
    fireEvent.pointerMove(handle, { clientX: 800 })
    expect(onResize).toHaveBeenLastCalledWith(300)
  })

  it('never lets either column get too narrow', () => {
    const { onResize, handle } = renderResizer('left')
    fireEvent.pointerDown(handle, { clientX: 300 })
    fireEvent.pointerMove(handle, { clientX: 110 })
    expect(onResize).toHaveBeenLastCalledWith(clampColumn(10, 1000))
    fireEvent.pointerMove(handle, { clientX: 1090 })
    expect(onResize).toHaveBeenLastCalledWith(clampColumn(990, 1000))
    expect(clampColumn(990, 1000)).toBe(580)
    expect(clampColumn(10, 1000)).toBe(260)
  })

  it('goes back to the default width on a double click', () => {
    const { onResize, handle } = renderResizer('left')
    fireEvent.doubleClick(handle)
    expect(onResize).toHaveBeenCalledWith(null)
  })

  it('moves with the arrow keys', () => {
    const { onResize, handle } = renderResizer('left')
    handle.getBoundingClientRect = () => ({ left: 500, width: 10 }) as DOMRect // the handle is 400px from the left edge
    fireEvent.keyDown(handle, { key: 'ArrowRight' })
    expect(onResize).toHaveBeenLastCalledWith(429) // 405 + 24
    fireEvent.keyDown(handle, { key: 'ArrowLeft' })
    expect(onResize).toHaveBeenLastCalledWith(381)
  })
})
