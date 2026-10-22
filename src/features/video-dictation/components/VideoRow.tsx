import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'

interface VideoRowProps {
  /** What the row is, for the arrows: "A1", "B2"... */
  label: string
  /** The cards: <li> elements. */
  children: ReactNode
}

/**
 * One level's videos as a single row the learner swipes sideways: a finger on a phone, the wheel or a trackpad, or the two
 * arrows (shown where there is something to scroll to). Cards snap into place; nothing wraps onto a second line.
 */
export function VideoRow({ label, children }: VideoRowProps) {
  const track = useRef<HTMLUListElement>(null)
  const [edge, setEdge] = useState({ start: true, end: true }) // at the start / at the end: no room to scroll that way

  const measure = useCallback(() => {
    const el = track.current
    if (!el) return
    const start = el.scrollLeft <= 1
    const end = el.scrollLeft + el.clientWidth >= el.scrollWidth - 1
    setEdge((current) => (current.start === start && current.end === end ? current : { start, end }))
  }, [])

  // Measures when the row is first drawn and whenever it is resized (the observer reports once as soon as it starts).
  useEffect(() => {
    const el = track.current
    if (!el || typeof ResizeObserver === 'undefined') return undefined
    const observer = new ResizeObserver(measure)
    observer.observe(el)
    return () => observer.disconnect()
  }, [measure])

  const page = (direction: -1 | 1) => {
    const el = track.current
    if (el) el.scrollBy({ left: direction * el.clientWidth * 0.9, behavior: 'smooth' })
  }

  return (
    <div className="vd-row">
      <ul ref={track} className="vd-track" aria-label={`Video ${label}, vuốt sang ngang để xem thêm`} onScroll={measure}>
        {children}
      </ul>
      {edge.start ? null : (
        <button type="button" className="vd-row__arrow vd-row__arrow--prev" aria-label={`Cuộn ${label} sang trái`} onClick={() => page(-1)}>
          <ChevronLeft aria-hidden="true" size={22} />
        </button>
      )}
      {edge.end ? null : (
        <button type="button" className="vd-row__arrow vd-row__arrow--next" aria-label={`Cuộn ${label} sang phải`} onClick={() => page(1)}>
          <ChevronRight aria-hidden="true" size={22} />
        </button>
      )}
    </div>
  )
}
