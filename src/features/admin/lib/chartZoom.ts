import { useState } from 'react'

/** The sizes a chart can be drawn at; a wide chart is made smaller to see it whole, a small one larger to read it. */
export const ZOOM_STEPS = [0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1, 1.15, 1.3, 1.5, 2] as const
export const ZOOM_HOME = ZOOM_STEPS.indexOf(1)

/** The largest zoom step at which a chart of `chartWidth` still fits in `viewportWidth`; the smallest step when none does. */
export function stepToFit(chartWidth: number, viewportWidth: number): number {
  let best = 0
  ZOOM_STEPS.forEach((zoom, step) => { if (chartWidth * zoom <= viewportWidth) best = step })
  return best
}

/** The zoom of a chart, as a step in `ZOOM_STEPS`. */
export function useChartZoom() {
  const [step, setStep] = useState(ZOOM_HOME)
  return { step, setStep, zoom: ZOOM_STEPS[step]! }
}
export type ChartZoom = ReturnType<typeof useChartZoom>
