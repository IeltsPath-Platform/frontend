import { describe, expect, it } from 'vitest'
import type { WritingProgressPoint, WritingProgressTask } from './api/overviewApi'
import { criteriaOf, defaultTask, gradingChanges, layoutChart } from './writingProgressModel'

function point(overallBand: number, extra: Partial<WritingProgressPoint> = {}): WritingProgressPoint {
  return { submissionId: `s-${overallBand}-${Math.random()}`, source: 'FREE', gradedAt: '2026-11-01T10:00:00Z', overallBand, criteria: { TR: overallBand, CC: overallBand, LR: overallBand, GRA: overallBand }, ...extra }
}
const task = (code: WritingProgressTask['task'], count: number): WritingProgressTask => ({
  task: code, insufficient: count < 3, points: Array.from({ length: count }, () => point(6)), recurringErrors: [], fixedErrors: [],
})

describe('criteriaOf', () => {
  it('grades Task 1 on Task Achievement and Task 2 on Task Response', () => {
    expect(criteriaOf('TASK_1')).toEqual(['TA', 'CC', 'LR', 'GRA'])
    expect(criteriaOf('TASK_2')).toEqual(['TR', 'CC', 'LR', 'GRA'])
  })
})

describe('defaultTask', () => {
  it('opens the task with more essays, Task 1 on a tie, and Task 1 when there is nothing', () => {
    expect(defaultTask([task('TASK_1', 1), task('TASK_2', 4)])).toBe('TASK_2')
    expect(defaultTask([task('TASK_1', 2), task('TASK_2', 2)])).toBe('TASK_1')
    expect(defaultTask([])).toBe('TASK_1')
  })
})

describe('gradingChanges', () => {
  it('marks where the prompt version changed and ignores essays without one', () => {
    const points = [point(5, { promptVersion: 'v1' }), point(5, { promptVersion: 'v1' }), point(6, { promptVersion: 'v2' }), point(6), point(6, { promptVersion: 'v2' })]

    expect(gradingChanges(points)).toEqual([2])
  })
})

describe('layoutChart', () => {
  it('fits the band window to the data with half a band of room, inside 0 to 9', () => {
    const low = layoutChart([point(5), point(6)], criteriaOf('TASK_2')).yTicks.map((tick) => tick.value)
    expect(low).toEqual([4, 5, 6, 7])
    const top = layoutChart([point(8.5), point(9)], criteriaOf('TASK_2')).yTicks.map((tick) => tick.value)
    expect(top.at(-1)).toBe(9)
  })

  it('draws one run per series and puts a higher band higher on the chart', () => {
    const layout = layoutChart([point(5), point(7)], criteriaOf('TASK_2'))
    const overall = layout.series[0]

    expect(layout.series.map((series) => series.key)).toEqual(['OVERALL', 'TR', 'CC', 'LR', 'GRA'])
    expect(overall.runs).toHaveLength(1)
    expect(overall.dots[1].y).toBeLessThan(overall.dots[0].y)
    expect(overall.dots[1].x).toBeGreaterThan(overall.dots[0].x)
  })

  it('cuts a line where a criterion has no band instead of joining across the gap', () => {
    const missing = point(6)
    delete missing.criteria.CC
    const layout = layoutChart([point(6), missing, point(6), point(6)], criteriaOf('TASK_2'))
    const cc = layout.series.find((series) => series.key === 'CC')!

    expect(cc.dots.map((dot) => dot.index)).toEqual([0, 2, 3])
    expect(cc.runs).toHaveLength(2)
  })

  it('puts a single essay in the middle instead of dividing by zero', () => {
    const layout = layoutChart([point(6)], criteriaOf('TASK_1'))

    expect(Number.isFinite(layout.xs[0])).toBe(true)
    expect(layout.series[0].dots[0].y).toSatisfy(Number.isFinite)
  })
})
