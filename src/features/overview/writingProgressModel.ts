import type { WritingProgressPoint, WritingProgressTask } from './api/overviewApi'

export type WritingTaskCode = WritingProgressTask['task']
export type CriterionKey = 'TA' | 'TR' | 'CC' | 'LR' | 'GRA'

export const TASK_LABEL: Record<WritingTaskCode, string> = { TASK_1: 'Task 1', TASK_2: 'Task 2' }

export const CRITERION_LABEL: Record<CriterionKey, string> = {
  TA: 'Task Achievement', TR: 'Task Response', CC: 'Coherence & Cohesion', LR: 'Lexical Resource', GRA: 'Grammar',
}

/** The four criteria a task is graded on: Task 1 on Task Achievement, Task 2 on Task Response. */
export function criteriaOf(task: WritingTaskCode): CriterionKey[] {
  return [task === 'TASK_1' ? 'TA' : 'TR', 'CC', 'LR', 'GRA']
}

/** The task with the most essays (Task 1 on a tie), so the first view is the one with something to show. */
export function defaultTask(tasks: WritingProgressTask[]): WritingTaskCode {
  const sorted = [...tasks].sort((a, b) => b.points.length - a.points.length)
  return sorted[0]?.task ?? 'TASK_1'
}

/** Positions (indexes into `points`) where the way of grading changed, so a jump in band is not read as a jump in skill. */
export function gradingChanges(points: WritingProgressPoint[]): number[] {
  const changes: number[] = []
  for (let index = 1; index < points.length; index++) {
    const before = points[index - 1].promptVersion
    const now = points[index].promptVersion
    if (before && now && before !== now) changes.push(index)
  }
  return changes
}

export const CHART = { width: 640, height: 260, left: 36, right: 16, top: 16, bottom: 28 } as const

export interface ChartSeries {
  key: 'OVERALL' | CriterionKey
  /** SVG points of the line; a criterion missing from an essay leaves a gap, so the line is cut into runs. */
  runs: string[]
  dots: Array<{ index: number; x: number; y: number; value: number }>
}

export interface ChartLayout {
  xs: number[]
  yTicks: Array<{ value: number; y: number }>
  series: ChartSeries[]
}

/** Bands 0–9 on a window that fits the data with half a band of room, so a small move is still visible. */
export function layoutChart(points: WritingProgressPoint[], keys: CriterionKey[]): ChartLayout {
  const values = points.flatMap((point) => [point.overallBand, ...keys.map((key) => point.criteria[key])]).filter((value): value is number => typeof value === 'number')
  const low = Math.max(0, Math.floor(Math.min(...values) - 0.5))
  const high = Math.min(9, Math.ceil(Math.max(...values) + 0.5))
  const plotWidth = CHART.width - CHART.left - CHART.right
  const plotHeight = CHART.height - CHART.top - CHART.bottom
  const xAt = (index: number) => CHART.left + (points.length === 1 ? plotWidth / 2 : (plotWidth * index) / (points.length - 1))
  const yAt = (value: number) => CHART.top + plotHeight * (1 - (value - low) / (high - low || 1))
  const yTicks = []
  for (let value = low; value <= high; value++) yTicks.push({ value, y: yAt(value) })

  const build = (key: ChartSeries['key']): ChartSeries => {
    const runs: string[] = []
    const dots: ChartSeries['dots'] = []
    let run: string[] = []
    points.forEach((point, index) => {
      const value = key === 'OVERALL' ? point.overallBand : point.criteria[key]
      if (typeof value !== 'number') {
        if (run.length) runs.push(run.join(' '))
        run = []
        return
      }
      const x = xAt(index)
      const y = yAt(value)
      run.push(`${x.toFixed(1)},${y.toFixed(1)}`)
      dots.push({ index, x, y, value })
    })
    if (run.length) runs.push(run.join(' '))
    return { key, runs, dots }
  }
  return { xs: points.map((_, index) => xAt(index)), yTicks, series: (['OVERALL', ...keys] as ChartSeries['key'][]).map(build) }
}
