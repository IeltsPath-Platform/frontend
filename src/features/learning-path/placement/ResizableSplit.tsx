import { useRef, useState, type CSSProperties, type KeyboardEvent, type PointerEvent, type ReactNode } from 'react'
import { MoveHorizontal } from 'lucide-react'

const MIN = 25
const MAX = 75
const clamp = (value: number) => Math.min(MAX, Math.max(MIN, value))

/** Passage on the left, questions on the right, with a divider the learner drags (or moves with arrow keys). */
export function ResizableSplit({ left, right }: { left: ReactNode; right: ReactNode }) {
  const [ratio, setRatio] = useState(50)
  const containerRef = useRef<HTMLDivElement>(null)

  function startDrag(event: PointerEvent<HTMLDivElement>) {
    event.preventDefault()
    event.currentTarget.setPointerCapture(event.pointerId)
  }

  function drag(event: PointerEvent<HTMLDivElement>) {
    if (!event.currentTarget.hasPointerCapture(event.pointerId)) return
    const box = containerRef.current?.getBoundingClientRect()
    if (box) setRatio(clamp(((event.clientX - box.left) / box.width) * 100))
  }

  function nudge(event: KeyboardEvent<HTMLDivElement>) {
    const step = event.key === 'ArrowLeft' ? -5 : event.key === 'ArrowRight' ? 5 : 0
    if (!step) return
    event.preventDefault()
    setRatio((value) => clamp(value + step))
  }

  return (
    <div className="pl-split" ref={containerRef} style={{ '--pl-split': `${ratio}%` } as CSSProperties}>
      <div className="pl-split__pane pl-split__pane--passage">{left}</div>
      <div
        aria-label="Kéo để đổi độ rộng bài đọc"
        aria-orientation="vertical"
        aria-valuemax={MAX}
        aria-valuemin={MIN}
        aria-valuenow={Math.round(ratio)}
        className="pl-split__divider"
        onKeyDown={nudge}
        onPointerDown={startDrag}
        onPointerMove={drag}
        role="separator"
        tabIndex={0}
      >
        <span className="pl-split__handle"><MoveHorizontal aria-hidden="true" size={16} /></span>
      </div>
      <div className="pl-split__pane pl-split__pane--questions">{right}</div>
    </div>
  )
}
