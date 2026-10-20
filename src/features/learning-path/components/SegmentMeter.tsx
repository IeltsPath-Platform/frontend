import type { CSSProperties } from 'react'

/** One segment per unit (chapter or lesson), so the size of the thing is visible before it is started. */
export function SegmentMeter({ done, total, unit, partial = 0 }: { done: number; total: number; unit: string; partial?: number }) {
  const segments = Math.min(Math.max(total, 1), 12)
  const partialFill = Math.min(Math.max(partial, 0), 1)
  const value = Math.min(total, done + partialFill)
  const label = partialFill > 0
    ? `Đã xong ${done} + ${Math.round(partialFill * 100)}% của ${unit} tiếp theo trên ${total} ${unit}`
    : `Đã xong ${done} trên ${total} ${unit}`
  return (
    <span
      aria-label={label}
      aria-valuemax={total}
      aria-valuemin={0}
      aria-valuenow={Math.round(value * 1000) / 1000}
      className="lp-segs"
      role="progressbar"
      style={{ '--segs': segments } as CSSProperties}
    >
      {Array.from({ length: segments }, (_, i) => (
        <i
          className={i < done ? 'is-done' : i === done && partialFill > 0 ? 'is-partial' : undefined}
          key={i}
          style={i === done && partialFill > 0 ? { '--fill': `${Math.round(partialFill * 1000) / 10}%` } as CSSProperties : undefined}
        />
      ))}
    </span>
  )
}
