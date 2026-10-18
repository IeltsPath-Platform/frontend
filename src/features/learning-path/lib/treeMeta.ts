import type { MasteryTier, TreePoint } from '~types/learningPath'

export interface TierMeta {
  label: string
  /** Modifier of the shared `lp-chip` class. */
  chip: 'accent' | 'primary' | 'success' | 'locked'
  hint: string
}

const TIER_META: Record<MasteryTier, TierMeta> = {
  PRIORITY: { label: 'Cần ưu tiên', chip: 'accent', hint: 'Điểm này còn yếu, nên luyện sớm.' },
  CONSOLIDATE: { label: 'Đang củng cố', chip: 'primary', hint: 'Bạn đang tiến bộ, luyện thêm để chắc hơn.' },
  MAINTAIN: { label: 'Vững', chip: 'success', hint: 'Bạn đã nắm tốt, chỉ cần ôn định kỳ.' },
  INSUFFICIENT: { label: 'Chưa đủ dữ liệu', chip: 'locked', hint: 'Cần thêm bài làm, ở các ngày khác nhau, để đánh giá.' },
}

const UNTOUCHED: TierMeta = { label: 'Chưa học', chip: 'locked', hint: 'Bạn chưa làm bài nào ở điểm này.' }

/** How a point is labelled; a point the learner has not touched has no tier. */
export function tierMeta(tier: MasteryTier | null): TierMeta {
  return tier ? TIER_META[tier] : UNTOUCHED
}

const SKILL_ORDER = ['LISTENING', 'READING', 'WRITING', 'SPEAKING', 'GRAMMAR', 'VOCABULARY']

export function pointSkill(point: TreePoint) {
  return point.skill?.toUpperCase() || 'OTHER'
}

/** Skills present in the tree: the four exam skills first, then grammar and vocabulary, then anything else. */
export function orderedTreeSkills(points: TreePoint[]) {
  const present = new Set(points.map(pointSkill))
  return [
    ...SKILL_ORDER.filter((key) => present.has(key)),
    ...[...present].filter((key) => !SKILL_ORDER.includes(key)).sort(),
  ]
}

/** Points of one skill (or all), easier course bands first: the code starts with the band, such as `R55_`. */
export function visiblePoints(points: TreePoint[], skill: string) {
  return (skill === 'ALL' ? points : points.filter((point) => pointSkill(point) === skill))
    .slice()
    .sort((a, b) => a.code.localeCompare(b.code))
}

/** Names of the points a point builds on, among those in the same tree. */
export function prerequisiteNames(point: TreePoint, byId: ReadonlyMap<string, TreePoint>) {
  return point.prerequisiteIds
    .map((id) => byId.get(id)?.name)
    .filter((name): name is string => Boolean(name))
}

export function masteryPercent(mastery: number | null) {
  return mastery === null ? null : Math.round(mastery * 100)
}
