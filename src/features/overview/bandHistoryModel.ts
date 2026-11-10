import type { BandAvailabilityOption, BandSkill, SeriesKind } from './api/overviewApi'

export const bandPeriods = [['8w', '8 tuần'], ['3m', '3 tháng'], ['6m', '6 tháng'], ['1y', '1 năm']] as const
export type BandPeriod = typeof bandPeriods[number][0]
export function bandPeriod(value: string | null): BandPeriod {
  return bandPeriods.find(([key]) => key === value)?.[0] ?? '3m'
}
function dayString(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}
export function bandRange(period: BandPeriod, now = new Date()) {
  const end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 12)
  const start = new Date(end)
  if (period === '8w') start.setDate(start.getDate() - 55)
  else if (period === '1y') start.setDate(start.getDate() - 364)
  else {
    start.setDate(1)
    start.setMonth(start.getMonth() - (period === '6m' ? 6 : 3))
    const lastDay = new Date(start.getFullYear(), start.getMonth() + 1, 0).getDate()
    start.setDate(Math.min(end.getDate(), lastDay))
  }
  return { from: dayString(start), to: dayString(end) }
}

// The placement test can only be taken once, so it is a starting reference line, never a series of its own.
const seriesKinds: SeriesKind[] = ['OFFICIAL_PRACTICE', 'MOCK']
const skills: BandSkill[] = ['LISTENING', 'READING', 'WRITING', 'SPEAKING', 'OVERALL']
export function selectBandHistory(options: BandAvailabilityOption[], requestedSeries: string | null, requestedSkill: string | null): { series: SeriesKind; skill: BandSkill } {
  const series = seriesKinds.find((value) => value === requestedSeries)
  const skill = skills.find((value) => value === requestedSkill)
  const matching = options.filter((option) => option.seriesKind !== 'PLACEMENT' && (!series || option.seriesKind === series))
    .sort((a, b) => Date.parse(b.latestSubmittedAt) - Date.parse(a.latestSubmittedAt)
      || seriesKinds.indexOf(a.seriesKind) - seriesKinds.indexOf(b.seriesKind)
      || skills.indexOf(a.skill) - skills.indexOf(b.skill))
  const usableSkill = skill && (skill !== 'OVERALL' || matching.some((option) => option.skill === 'OVERALL'))
  if (usableSkill) {
    return { series: series ?? matching.find((option) => option.skill === skill)?.seriesKind ?? 'OFFICIAL_PRACTICE', skill }
  }
  const latest = matching.find((option) => option.skill !== 'OVERALL')
  return { series: series ?? latest?.seriesKind ?? 'OFFICIAL_PRACTICE', skill: latest?.skill ?? 'LISTENING' }
}

/** The placement test grades Listening, Reading and Writing only, so only those skills have a starting reference. */
export const hasPlacementReference = (skill: BandSkill) => skill === 'LISTENING' || skill === 'READING' || skill === 'WRITING'

export function bandPracticeLink(skill: BandSkill) {
  // The practice catalog exposes separately graded skills; it does not offer a combined Overall attempt.
  const selected = skill === 'OVERALL' ? 'reading' : skill.toLowerCase()
  return { to: `/practice-tests?skill=${selected}`, label: `Làm bài luyện ${selected[0].toUpperCase()}${selected.slice(1)}` }
}

/**
 * Band axis that fits the data instead of always spanning 0-9, so a few half-band steps stay visible.
 * It is at least three bands tall; half-band gridlines are used while the span is four bands or less.
 */
export function bandAxis(values: number[]) {
  const min = Math.min(...values)
  const max = Math.max(...values)
  let lo = Math.max(0, Math.floor(min - 0.5))
  let hi = Math.min(9, Math.ceil(max + 0.5))
  if (hi - lo < 3) {
    hi = Math.min(9, lo + 3)
    lo = Math.max(0, hi - 3)
  }
  const step = hi - lo <= 4 ? 0.5 : 1
  const ticks: number[] = []
  for (let value = lo; value <= hi + 1e-9; value += step) ticks.push(value)
  return { lo, hi, ticks }
}
