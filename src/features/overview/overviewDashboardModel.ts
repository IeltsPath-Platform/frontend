import type { LearnerReportSummary, OverviewTestResult } from './api/overviewApi'
import { BAND_SKILLS, type BandSummary, type SkillBandRow } from './overviewViewModel'

export interface DashboardBand extends BandSummary {
  source: 'test' | 'estimate' | 'placement' | 'self-report' | 'empty'
  sourceLabel: string
  skills: SkillBandRow[]
  changeLabel: string | null
  history: OverviewTestResult[]
}

export interface CourseSkillMastery {
  skill: (typeof BAND_SKILLS)[number]
  /** Evidence-weighted mean mastery of the skill's judged points in the course, 0-1; null when none is judged. */
  mastery: number | null
  /** Points of the skill the learner has started in the course, judged or not. */
  points: number
}

/**
 * Mastery per skill inside one course. The report tags each knowledge point with the band level of its course, so a
 * course is its points at that band. Points with too little evidence are counted but do not enter the mean.
 */
export function courseSkillMastery(report: LearnerReportSummary | null, courseBand: number | null): CourseSkillMastery[] {
  const inCourse = courseBand === null ? [] : (report?.knowledgePoints ?? []).filter((point) => point.band !== null && Number(point.band) === courseBand)
  return BAND_SKILLS.map((skill) => {
    const own = inCourse.filter((point) => point.skill?.toUpperCase() === skill)
    const judged = own.filter((point) => point.score.tier !== 'INSUFFICIENT' && point.score.evidenceCount > 0)
    const weight = judged.reduce((sum, point) => sum + point.score.evidenceCount, 0)
    const mastery = weight === 0 ? null : judged.reduce((sum, point) => sum + point.score.mastery * point.score.evidenceCount, 0) / weight
    return { skill, mastery, points: own.length }
  })
}

const validBand =(value: number | null | undefined): value is number => value != null && Number.isFinite(value) && value >= 0 && value <= 9

/**
 * The current band comes from the learner's own study, never from practice or mock test results:
 * the mastery estimate, else the placement band, else the self-reported band.
 */
export function dashboardBand(report: LearnerReportSummary | null, selfReported: number | null | undefined): DashboardBand {
  const estimate = report?.estimatedBand?.value
  const placement = report?.placementBand
  const source = validBand(estimate) ? 'estimate' : validBand(placement) ? 'placement' : validBand(selfReported) ? 'self-report' : 'empty'
  const current = source === 'estimate' ? estimate! : source === 'placement' ? placement! : source === 'self-report' ? selfReported! : null
  // An estimate equal to the placement band means no skill has moved past the placement yet; it is not a new measurement.
  const unchanged = source === 'estimate' && validBand(placement) && Number(estimate) === Number(placement)
  const labels = {
    estimate: unchanged ? 'Chưa tiến triển so với bài đầu vào' : 'Ước tính từ quá trình học',
    placement: 'Bài kiểm tra đầu vào', 'self-report': 'Tự khai trong hồ sơ', empty: 'Chưa có dữ liệu band',
  }
  const skills = BAND_SKILLS.map((skill) => {
    const value = source === 'estimate' ? report?.skills.find((row) => row.skill === skill)?.band : null
    const band = validBand(value) ? value : null
    return { skill, band, percent: band === null ? 0 : (band / 9) * 100 }
  })
  return {
    current, currentIsEstimate: source === 'estimate', target: report?.target?.targetBand ?? null, examDate: report?.target?.examDate ?? null,
    source, sourceLabel: labels[source], skills, changeLabel: null, history: [],
  }
}
