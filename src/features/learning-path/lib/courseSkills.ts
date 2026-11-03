import type { CourseSummary, LearningSkill, PracticeTestMilestone, TopicSummary } from '~types/learningPath'

/** The four skills every course is made of, in the order they are shown. */
export const COURSE_SKILLS: readonly LearningSkill[] = ['LISTENING', 'READING', 'WRITING', 'SPEAKING']

/** Holds topics whose skill is missing or is not one of the four, so none of them disappears from the course. */
export const OTHER_LANE = 'OTHER'

export type LaneKey = LearningSkill | typeof OTHER_LANE

/** SOON: no topic yet. READY: open but untouched. IN_PROGRESS: studied. DONE: every topic passed. */
export type LaneState = 'SOON' | 'READY' | 'IN_PROGRESS' | 'DONE'

export interface SkillLane {
  key: LaneKey
  /** In learning order; the first is 1 in this skill, whatever its number across the course. */
  topics: TopicSummary[]
  passedTopics: number
  completedLessons: number
  totalLessons: number
  state: LaneState
  /** The open topic the learner should continue with; null when none is open. */
  nextTopicId: string | null
}

/** Why a chặng is closed, in the learner's words; the server's reason wins when it gave one. */
export function lockText(topic: TopicSummary) {
  return topic.lockedReason ?? 'Hoàn thành chặng trước để mở'
}

export function laneKeyOf(topic: TopicSummary): LaneKey {
  const skill = topic.skill?.toUpperCase()
  return COURSE_SKILLS.find((key) => key === skill) ?? OTHER_LANE
}

function buildLane(key: LaneKey, topics: TopicSummary[]): SkillLane {
  const sorted = topics.slice().sort((a, b) => a.sequenceOrder - b.sequenceOrder)
  const passedTopics = sorted.filter((topic) => topic.status === 'PASSED').length
  const completedLessons = sorted.reduce((sum, topic) => sum + topic.completedLessons, 0)
  const totalLessons = sorted.reduce((sum, topic) => sum + topic.totalLessons, 0)
  const state: LaneState = sorted.length === 0
    ? 'SOON'
    : passedTopics === sorted.length
      ? 'DONE'
      : passedTopics > 0 || completedLessons > 0
        ? 'IN_PROGRESS'
        : 'READY'
  return {
    key,
    topics: sorted,
    passedTopics,
    completedLessons,
    totalLessons,
    state,
    nextTopicId: sorted.find((topic) => topic.status === 'IN_PROGRESS')?.id ?? null,
  }
}

/** The four skill lanes, always present, plus an "other" lane only when some topic does not belong to a skill. */
export function buildLanes(topics: TopicSummary[]): SkillLane[] {
  const lanes = COURSE_SKILLS.map((skill) => buildLane(skill, topics.filter((topic) => laneKeyOf(topic) === skill)))
  const others = topics.filter((topic) => laneKeyOf(topic) === OTHER_LANE)
  return others.length > 0 ? [...lanes, buildLane(OTHER_LANE, others)] : lanes
}

/** A milestone counts chặng across the whole course, in `sequenceOrder`, not inside one skill. */
function inCourseOrder(topics: TopicSummary[]) {
  return topics.slice().sort((a, b) => a.sequenceOrder - b.sequenceOrder)
}

/**
 * Names the chặng a practice test opens after. It never shows a number that could be read as a position inside a
 * skill, because the board numbers chặng per skill while the milestone counts them across the course.
 */
export function afterTopicLabel(topics: TopicSummary[], milestone: PracticeTestMilestone) {
  const title = inCourseOrder(topics)[milestone.afterTopicSequence - 1]?.title
  return title ? `chặng “${title}”` : `chặng thứ ${milestone.afterTopicSequence} của khóa`
}

export interface PracticeTestPlacement {
  /** Tests to draw right after a chặng, by that chặng's id, in the order the server listed them. */
  afterTopic: Map<string, PracticeTestMilestone[]>
  /** Tests whose chặng is not in this course's list. They still show, at the end of the route, so none is lost. */
  unplaced: PracticeTestMilestone[]
}

/** Puts each practice test after the chặng it is configured to open after, so it sits in that chặng's own skill. */
export function placePracticeTests(topics: TopicSummary[], milestones: PracticeTestMilestone[]): PracticeTestPlacement {
  const ordered = inCourseOrder(topics)
  const afterTopic = new Map<string, PracticeTestMilestone[]>()
  const unplaced: PracticeTestMilestone[] = []
  for (const milestone of milestones) {
    const anchor = ordered[milestone.afterTopicSequence - 1]
    if (anchor) afterTopic.set(anchor.id, [...(afterTopic.get(anchor.id) ?? []), milestone])
    else unplaced.push(milestone)
  }
  return { afterTopic, unplaced }
}

/**
 * The lane to show first: the one asked for in the address (`?skill=`), the one holding the topic the learner came
 * back from (`?topic=`), the first lane being studied, and otherwise the first lane that has any topic.
 */
export function initialLaneKey(lanes: SkillLane[], requestedSkill: string | null, requestedTopicId: string | null): LaneKey {
  const asked = lanes.find((lane) => lane.key === requestedSkill?.toUpperCase())
  if (asked) return asked.key
  const holding = requestedTopicId ? lanes.find((lane) => lane.topics.some((topic) => topic.id === requestedTopicId)) : null
  if (holding) return holding.key
  return (
    lanes.find((lane) => lane.state === 'IN_PROGRESS')
    ?? lanes.find((lane) => lane.state === 'READY')
    ?? lanes.find((lane) => lane.topics.length > 0)
    ?? lanes[0]
  ).key
}

/** Whether the learner still has something to buy for this skill: a price is set and no unlock or Premium covers it. */
export function canUnlockSkill(course: CourseSummary | null, key: LaneKey): key is LearningSkill {
  if (!course || key === OTHER_LANE || course.premium || course.comboUnlocked) return false
  if (course.unlockedSkills?.includes(key)) return false
  return course.skillUnlockPoints?.[key] != null
}

export function canUnlockCombo(course: CourseSummary | null) {
  return Boolean(course && !course.premium && !course.comboUnlocked && course.comboPayablePoints != null)
}
