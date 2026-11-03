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

/** A chặng the way the course page numbers it, counted inside its skill: "Chặng 03". */
export function chapterLabel(position: number) {
  return `Chặng ${String(position).padStart(2, '0')}`
}

export function masteryPercent(mastery: number | null) {
  return mastery === null ? null : Math.round(mastery * 100)
}

/** What a learner reads at a glance: a point not touched yet and one without enough data are the same to them. */
export type TierGroup = 'MAINTAIN' | 'CONSOLIDATE' | 'PRIORITY' | 'PENDING'

export interface TierGroupMeta {
  key: TierGroup
  label: string
  /** Modifier of the shared `lp-chip` class, which also names the colour. */
  tone: TierMeta['chip']
  hint: string
}

/** The groups in the order the ribbon and the filter show them. */
export const TIER_GROUPS: readonly TierGroupMeta[] = [
  { key: 'MAINTAIN', label: 'Vững', tone: 'success', hint: 'Bạn đã nắm tốt, chỉ cần ôn định kỳ.' },
  { key: 'CONSOLIDATE', label: 'Đang củng cố', tone: 'primary', hint: 'Bạn đang tiến bộ, luyện thêm để chắc hơn.' },
  { key: 'PRIORITY', label: 'Cần ưu tiên', tone: 'accent', hint: 'Điểm còn yếu, nên luyện sớm.' },
  { key: 'PENDING', label: 'Chưa học', tone: 'locked', hint: 'Chưa học hoặc chưa đủ dữ liệu để đánh giá.' },
]

export function tierGroup(point: TreePoint): TierGroup {
  return point.tier === 'MAINTAIN' || point.tier === 'CONSOLIDATE' || point.tier === 'PRIORITY' ? point.tier : 'PENDING'
}

export function countByTierGroup(points: TreePoint[]): Record<TierGroup, number> {
  const counts: Record<TierGroup, number> = { MAINTAIN: 0, CONSOLIDATE: 0, PRIORITY: 0, PENDING: 0 }
  for (const point of points) counts[tierGroup(point)] += 1
  return counts
}

export interface PrerequisiteStep {
  /** Counted from 1; step 1 holds the points that build on nothing else in the skill. */
  number: number
  points: TreePoint[]
}

/** Orders numbers where an unknown one (Infinity) goes last, and two unknown ones tie rather than give NaN. */
function compareNumbers(a: number, b: number) {
  if (a === b) return 0
  return a < b ? -1 : 1
}

/** Where the course teaches a point: its chặng, then the first lesson of that chặng that covers it; unknown goes last. */
function courseOrder(point: TreePoint) {
  const chapter = point.topic?.position ?? Infinity
  const lesson = point.lessons?.find((row) => row.topicId === point.topic?.topicId)?.position ?? Infinity
  return chapter * 1000 + (lesson === Infinity ? 999 : lesson)
}

/**
 * Lays the points of one skill out in the order they are learnt. A point sits one step after the latest step among
 * the points it builds on in this skill; what it builds on in another skill does not move it. Inside a step, points
 * that build on the same earlier points stay together. A loop in the data cannot hang the page: the point that closes
 * it is simply not counted as coming after itself.
 */
export function prerequisiteSteps(points: TreePoint[]): PrerequisiteStep[] {
  const byId = new Map(points.map((point) => [point.knowledgePointId, point]))
  const depth = new Map<string, number>()
  const visiting = new Set<string>()
  const depthOf = (point: TreePoint): number => {
    const known = depth.get(point.knowledgePointId)
    if (known !== undefined) return known
    if (visiting.has(point.knowledgePointId)) return -1
    visiting.add(point.knowledgePointId)
    let result = 0
    for (const id of point.prerequisiteIds) {
      const before = byId.get(id)
      if (before) result = Math.max(result, depthOf(before) + 1)
    }
    visiting.delete(point.knowledgePointId)
    depth.set(point.knowledgePointId, result)
    return result
  }

  const levels: TreePoint[][] = []
  for (const point of points) (levels[depthOf(point)] ??= []).push(point)

  const placed = new Map<string, number>()
  return levels.filter(Boolean).map((level, index) => {
    const earliest = (point: TreePoint) => Math.min(
      ...point.prerequisiteIds.map((id) => placed.get(id) ?? Infinity), Infinity,
    )
    // Points that build on the same earlier points stay together; after that they follow the course: the chặng that
    // owns them, then the lesson that teaches them first, then the code, so a column reads in the order it is taught.
    const ordered = level.slice().sort((a, b) =>
      compareNumbers(earliest(a), earliest(b)) || compareNumbers(courseOrder(a), courseOrder(b)) || a.code.localeCompare(b.code))
    for (const point of ordered) placed.set(point.knowledgePointId, placed.size)
    return { number: index + 1, points: ordered }
  })
}
