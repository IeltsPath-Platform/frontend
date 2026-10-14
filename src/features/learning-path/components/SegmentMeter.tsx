import type { CSSProperties } from 'react'

/** One segment per unit (chapter or lesson), so the size of the thing is visible before it is started. */
export function SegmentMeter({ done, total, unit }: { done: number; total: number; unit: string }) {
  const segments = Math.min(Math.max(total, 1), 12)
  return (
    <span
      aria-label={`Đã xong ${done} trên ${total} ${unit}`}
      aria-valuemax={total}
      aria-valuemin={0}
      aria-valuenow={done}
      className="lp-segs"
      role="progressbar"
      style={{ '--segs': segments } as CSSProperties}
    >
      {Array.from({ length: segments }, (_, i) => (
        <i className={i < done ? 'is-done' : undefined} key={i} />
      ))}
    </span>
  )
}
