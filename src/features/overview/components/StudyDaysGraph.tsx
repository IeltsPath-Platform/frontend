import { useEffect, useRef, useState } from 'react'
import { formatDuration } from '../overviewViewModel'

export interface DayPoint {
  date: Date
  key: string
  /** Tracked seconds, or null when the day has no recording. */
  actual: number | null
  planned: number | null
  isToday: boolean
}

/** Up to this many days every bar gets its weekday, date and value; longer ranges show dates only. */
const DETAILED_MAX_DAYS = 14

// Drawing units are CSS pixels: the SVG is measured to its container, so text keeps its size instead of being scaled.
const DEFAULT_WIDTH = 640
const MIN_WIDTH = 360
const MAX_WIDTH = 1100
const HEIGHT = 232
const TOP = 24
const BASELINE = 180
const LEFT = 64
const RIGHT_PAD = 12
const STEPS_MINUTES = [15, 30, 60, 120, 180, 240, 300, 360, 480, 600, 720]

/** Top of the vertical scale in minutes: the first round step that fits the busiest day, so small amounts stay readable. */
function scaleTopMinutes(maxMinutes: number): number {
  return STEPS_MINUTES.find((step) => step >= maxMinutes) ?? Math.ceil(maxMinutes / 60) * 60
}

function axisLabel(minutes: number): string {
  if (minutes < 60) return `${Math.round(minutes)} phút`
  const hours = minutes / 60
  return `${Number.isInteger(hours) ? hours : hours.toFixed(1)}h`
}

/** Daily study time as bars joined by a trend line. A day without a recording is a gap in the line, not a zero. */
export function StudyDaysGraph({ points, ariaLabel }: { points: DayPoint[]; ariaLabel: string }) {
  const frameRef = useRef<HTMLDivElement>(null)
  const [width, setWidth] = useState(DEFAULT_WIDTH)

  useEffect(() => {
    const element = frameRef.current
    if (!element || typeof ResizeObserver === 'undefined') return undefined
    const update = () => setWidth(Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, Math.floor(element.clientWidth))))
    update()
    const observer = new ResizeObserver(update)
    observer.observe(element)
    return () => observer.disconnect()
  }, [])

  const range = points.length
  // The scale follows the busiest day, so a one-hour day gets an hour tick and a 30-minute day stops at 30 minutes.
  const busiestMinutes = Math.max(0, ...points.flatMap((point) => [point.actual ?? 0, point.planned ?? 0])) / 60
  const topMinutes = scaleTopMinutes(busiestMinutes)
  const right = width - RIGHT_PAD
  const yFor = (seconds: number) => BASELINE - (seconds / 60 / topMinutes) * (BASELINE - TOP)
  const slot = (right - LEFT) / Math.max(1, range)
  const barWidth = Math.min(26, slot * 0.6)
  const detailed = range <= DETAILED_MAX_DAYS
  const labelEvery = detailed ? 1 : 5

  // The trend joins the top of each tracked bar. An untracked day breaks the line rather than being joined across.
  const trend: { x: number; y: number }[][] = []
  points.forEach((point, index) => {
    if (point.actual === null) return
    if (index === 0 || points[index - 1].actual === null) trend.push([])
    trend[trend.length - 1].push({ x: LEFT + slot * index + slot / 2, y: yFor(point.actual) })
  })

  return (
    <div className="overview-study-frame" ref={frameRef}>
      <svg className="overview-study-graph" viewBox={`0 0 ${width} ${HEIGHT}`} role="img" aria-label={ariaLabel}>
        {[0, 0.5, 1].map((fraction) => {
          const y = BASELINE - fraction * (BASELINE - TOP)
          return (
            <g key={fraction}>
              <line x1={LEFT} x2={right} y1={y} y2={y} stroke="#ffb98a" strokeDasharray="5 4" />
              <text x={LEFT - 6} y={y + 3} textAnchor="end">{axisLabel(topMinutes * fraction)}</text>
            </g>
          )
        })}
        {points.map((point, index) => {
          const left = LEFT + slot * index
          const x = left + (slot - barWidth) / 2
          const centre = left + slot / 2
          const weekday = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'][point.date.getDay()]
          const dateLabel = `${point.date.getDate()}/${point.date.getMonth() + 1}`
          const shownDate = index % labelEvery === 0 || point.isToday
          return (
            <g key={point.key}>
              {point.actual !== null && (
                <rect
                  x={x}
                  y={yFor(point.actual)}
                  width={barWidth}
                  height={Math.max(1, BASELINE - yFor(point.actual))}
                  rx="2"
                  fill={point.planned !== null && point.actual >= point.planned ? '#16a34a' : '#1245ff'}
                >
                  <title>{`${point.date.toLocaleDateString('vi-VN')}: ${formatDuration(point.actual)}`}</title>
                </rect>
              )}
              {point.planned !== null && (
                <line className="overview-study-goal" x1={x - 3} x2={x + barWidth + 3} y1={yFor(point.planned)} y2={yFor(point.planned)} />
              )}
              {detailed && point.actual !== null && point.actual > 0 && (
                <text className="overview-study-value" x={centre} y={Math.max(TOP - 2, yFor(point.actual) - 4)} textAnchor="middle">{formatDuration(point.actual)}</text>
              )}
              {detailed && <text x={centre} y={BASELINE + 22} textAnchor="middle">{weekday}</text>}
              {shownDate && <text x={centre} y={BASELINE + 40} textAnchor="middle">{dateLabel}</text>}
            </g>
          )
        })}
        {trend.map((segment, segmentIndex) => (
          <g key={segmentIndex} className="overview-study-trend">
            {segment.length > 1 && <polyline points={segment.map((item) => `${item.x},${item.y}`).join(' ')} />}
            {segment.map((item, itemIndex) => <circle key={itemIndex} cx={item.x} cy={item.y} r="3" />)}
          </g>
        ))}
      </svg>
    </div>
  )
}
