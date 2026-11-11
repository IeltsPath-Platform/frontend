import type { WritingProgressPoint, WritingRecurringError } from './api/writingProgressApi'

/** Below this many essays the panel shows the scores as a list instead of a trend chart. */
export const TREND_MIN_ESSAYS = 3
/** Recurring errors shown on the panel; the API returns up to ten. */
export const SHOWN_RECURRING_ERRORS = 5

export interface ChartPoint {
  x: number
  y: number
  band: number
  /** True where the prompt version changes, so the chart can mark that the grading rules moved. */
  promptChanged: boolean
}

/** Maps bands 0–9 onto the box; oldest essay on the left. Empty input gives no points. */
export function chartPoints(points: WritingProgressPoint[], width: number, height: number): ChartPoint[] {
  if (points.length === 0) return []
  const step = points.length === 1 ? 0 : width / (points.length - 1)
  return points.map((point, index) => ({
    x: round(index * step),
    y: round(height - (clamp(point.overallBand, 0, 9) / 9) * height),
    band: point.overallBand,
    promptChanged: index > 0 && point.promptVersion !== points[index - 1].promptVersion,
  }))
}

export function linePath(chart: ChartPoint[]): string {
  return chart.map((point, index) => `${index === 0 ? 'M' : 'L'}${point.x} ${point.y}`).join(' ')
}

/** "3/5 bài": how many of the essays in the window carried the error. */
export function errorShare(error: Pick<WritingRecurringError, 'essaysWithError' | 'essaysTotal'>): string {
  return `${error.essaysWithError}/${error.essaysTotal} bài`
}

export function shownErrors(errors: WritingRecurringError[]): WritingRecurringError[] {
  return errors.slice(0, SHOWN_RECURRING_ERRORS)
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value))
}

function round(value: number) {
  return Math.round(value * 10) / 10
}
