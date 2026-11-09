import { describe, expect, it } from 'vitest'
import type { LearnerReportSummary } from './api/overviewApi'
import { courseSkillMastery, dashboardBand } from './overviewDashboardModel'

const report = (overrides: Partial<LearnerReportSummary> = {}): LearnerReportSummary => ({ skills: [], estimatedBand: null, target: null, ...overrides })

describe('dashboardBand', () => {
  it('uses the mastery estimate and its own skill bands before placement and self report', () => {
    const model = dashboardBand(report({ estimatedBand: { value: 6, estimated: true }, placementBand: 5, skills: [{ skill: 'READING', band: 6.5, mastery: .9, tierCounts: {}, kpCount: 5 }] }), 4)
    expect(model).toMatchObject({ current: 6, source: 'estimate', currentIsEstimate: true, changeLabel: null, history: [] })
    expect(model.skills[1]).toMatchObject({ skill: 'READING', band: 6.5 })
    expect(model.skills[1].percent).toBeCloseTo(6.5 / 9 * 100)
  })

  it('says the learner has not moved past the placement when the estimate equals it', () => {
    expect(dashboardBand(report({ estimatedBand: { value: 1.5, estimated: true }, placementBand: 1.5 }), null))
      .toMatchObject({ current: 1.5, source: 'estimate', sourceLabel: 'Chưa tiến triển so với bài đầu vào' })
    expect(dashboardBand(report({ estimatedBand: { value: 2, estimated: true }, placementBand: 1.5 }), null).sourceLabel)
      .toBe('Ước tính từ quá trình học')
  })

  it('shows no skill bands when the band is not an estimate', () => {
    const model = dashboardBand(report({ placementBand: 5 }), 4.5)
    expect(model).toMatchObject({ current: 5, source: 'placement' })
    expect(model.skills.every((row) => row.band === null && row.percent === 0)).toBe(true)
  })

  it('falls back to placement, self report, then an explicit empty state', () => {
    expect(dashboardBand(report({ placementBand: 5 }), 4)).toMatchObject({ current: 5, source: 'placement' })
    expect(dashboardBand(null, 4)).toMatchObject({ current: 4, source: 'self-report' })
    expect(dashboardBand(null, null)).toMatchObject({ current: null, source: 'empty', history: [] })
  })
})

describe('courseSkillMastery', () => {
  const kp = (skill: string | null, band: number | null, mastery: number, evidenceCount: number, tier = 'MAINTAIN') => ({ skill, band, score: { mastery, tier, evidenceCount } })

  it('weights the mean by evidence and counts only the points of the course band', () => {
    const rows = courseSkillMastery(report({ knowledgePoints: [kp('LISTENING', 7, 1, 3), kp('listening', 7, 0.5, 1), kp('LISTENING', 6, 0, 9), kp('READING', 7, 0.4, 2)] }), 7)
    expect(rows.map((row) => row.skill)).toEqual(['LISTENING', 'READING', 'WRITING', 'SPEAKING'])
    expect(rows[0]).toEqual({ skill: 'LISTENING', mastery: 0.875, points: 2 })
    expect(rows[1]).toEqual({ skill: 'READING', mastery: 0.4, points: 1 })
    expect(rows[2]).toEqual({ skill: 'WRITING', mastery: null, points: 0 })
  })

  it('counts a point with too little evidence without letting it into the mean', () => {
    const rows = courseSkillMastery(report({ knowledgePoints: [kp('WRITING', 6, 0.2, 1, 'INSUFFICIENT'), kp('WRITING', 6, 0.8, 4)] }), 6)
    expect(rows[2]).toEqual({ skill: 'WRITING', mastery: 0.8, points: 2 })
  })

  it('is empty for a course without a band level, a missing report, or a report without points', () => {
    const empty = { LISTENING: null, READING: null, WRITING: null, SPEAKING: null }
    const nulls = courseSkillMastery(report({ knowledgePoints: [kp('LISTENING', 7, 1, 3)] }), null)
    expect(Object.fromEntries(nulls.map((row) => [row.skill, row.mastery]))).toEqual(empty)
    expect(courseSkillMastery(null, 7).every((row) => row.mastery === null && row.points === 0)).toBe(true)
    expect(courseSkillMastery(report(), 7).every((row) => row.points === 0)).toBe(true)
  })
})
