import type { KeyboardEvent, PointerEvent, RefObject } from 'react'
import { clampColumn } from '../lib/columnWidth'

const KEY_STEP = 24

interface ColumnResizerProps {
  /** Which edge of the container the dragged column sits on; the handle is on the inner side of it. */
  edge: 'left' | 'right'
  /** The element holding both columns. */
  containerRef: RefObject<HTMLElement | null>
  /** The new width of the dragged column in px, or null to go back to the default width. */
  onResize: (width: number | null) => void
  label: string
}

/**
 * A thin bar between the two columns of the page. Drag it (or use the arrow keys) to give one column more width and
 * the other less; double-click it to go back to the default widths.
 */
export function ColumnResizer({ edge, containerRef, onResize, label }: ColumnResizerProps) {
  const widthAt = (clientX: number, container: DOMRect) => clampColumn(edge === 'left' ? clientX - container.left : container.right - clientX, container.width)

  const start = (event: PointerEvent<HTMLDivElement>) => {
    event.currentTarget.setPointerCapture?.(event.pointerId)
    event.currentTarget.dataset.dragging = 'true'
    document.body.style.userSelect = 'none' // dragging over the page must not select text
  }
  const move = (event: PointerEvent<HTMLDivElement>) => {
    const container = containerRef.current
    if (event.currentTarget.dataset.dragging !== 'true' || !container) return
    onResize(widthAt(event.clientX, container.getBoundingClientRect()))
  }
  const end = (event: PointerEvent<HTMLDivElement>) => {
    delete event.currentTarget.dataset.dragging
    document.body.style.userSelect = ''
  }
  const key = (event: KeyboardEvent<HTMLDivElement>) => {
    const container = containerRef.current
    if (!container || (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight')) return
    event.preventDefault()
    const box = container.getBoundingClientRect()
    const handle = event.currentTarget.getBoundingClientRect()
    const toward = event.key === 'ArrowRight' ? KEY_STEP : -KEY_STEP
    onResize(widthAt(handle.left + handle.width / 2 + toward, box))
  }

  return (
    <div
      role="separator"
      aria-orientation="vertical"
      aria-label={label}
      tabIndex={0}
      className="vdp-resizer"
      data-edge={edge}
      title="Kéo để đổi độ rộng · bấm đúp để về mặc định"
      onPointerDown={start}
      onPointerMove={move}
      onPointerUp={end}
      onPointerCancel={end}
      onKeyDown={key}
      onDoubleClick={() => onResize(null)}
    />
  )
}
