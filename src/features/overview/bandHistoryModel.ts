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

const seriesKinds: SeriesKind[] = ['OFFICIAL_PRACTICE', 'MOCK', 'PLACEMENT']
const skills: BandSkill[] = ['LISTENING', 'READING', 'WRITING', 'SPEAKING', 'OVERALL']
export function selectBandHistory(options: BandAvailabilityOption[], requestedSeries: string | null, requestedSkill: string | null): { series: SeriesKind; skill: BandSkill } {
  const series = seriesKinds.find((value) => value === requestedSeries)
  const skill = skills.find((value) => value === requestedSkill)
  const matching = options.filter((option) => !series || option.seriesKind === series)
    .sort((a, b) => Date.parse(b.latestSubmittedAt) - Date.parse(a.latestSubmittedAt)
      || seriesKinds.indexOf(a.seriesKind) - seriesKinds.indexOf(b.seriesKind)
      || skills.indexOf(a.skill) - skills.indexOf(b.skill))
  const usableSkill = skill && !(series === 'PLACEMENT' && (skill === 'SPEAKING' || skill === 'OVERALL'))
    && (skill !== 'OVERALL' || matching.some((option) => option.skill === 'OVERALL'))
  if (usableSkill) {
    return { series: series ?? matching.find((option) => option.skill === skill)?.seriesKind ?? 'OFFICIAL_PRACTICE', skill }
  }
  const latest = matching.find((option) => option.skill !== 'OVERALL')
  return { series: series ?? latest?.seriesKind ?? 'OFFICIAL_PRACTICE', skill: latest?.skill ?? 'LISTENING' }
}

export function bandPracticeLink(series: SeriesKind, skill: BandSkill) {
  if (series === 'PLACEMENT') return { to: '/learn/placement', label: 'Làm bài kiểm tra đầu vào' }
  // The practice catalog exposes separately graded skills; it does not offer a combined Overall attempt.
  const selected = skill === 'OVERALL' ? 'reading' : skill.toLowerCase()
  return { to: `/practice-tests?skill=${selected}`, label: `Làm bài luyện ${selected[0].toUpperCase()}${selected.slice(1)}` }
}
