import { describe, expect, it } from 'vitest'
import type { CourseSummary, PracticeTestMilestone, TopicSummary } from '~types/learningPath'
import { afterTopicLabel, buildLanes, canUnlockCombo, canUnlockSkill, initialLaneKey, placePracticeTests } from './courseSkills'

function topic(id: string, skill: string | null, sequenceOrder: number, over: Partial<TopicSummary> = {}): TopicSummary {
  return {
    id, course: null, code: id, title: id, description: '', sequenceOrder, status: 'LOCKED',
    completedLessons: 0, totalLessons: 4, lockedReason: null, skill, ...over,
  }
}

function course(over: Partial<CourseSummary> = {}): CourseSummary {
  return {
    id: 'c1', code: 'C1', title: 'IELTS 5.5', bandLevel: 5.5, topicCount: 4, passedTopicCount: 0,
    completedLessons: 0, totalLessons: 16, lastStudiedAt: null, recommended: false, testStatus: 'LOCKED', ...over,
  }
}

describe('buildLanes', () => {
  it('always returns the four skills, in order, and orders topics by sequence inside each', () => {
    const lanes = buildLanes([topic('r2', 'READING', 5), topic('l1', 'LISTENING', 2), topic('r1', 'READING', 1)])
    expect(lanes.map((lane) => lane.key)).toEqual(['LISTENING', 'READING', 'WRITING', 'SPEAKING'])
    expect(lanes[1].topics.map((row) => row.id)).toEqual(['r1', 'r2'])
    expect(lanes[3].state).toBe('SOON')
  })

  it('keeps topics without a known skill in an extra lane instead of dropping them', () => {
    const lanes = buildLanes([topic('a', null, 1), topic('b', 'GRAMMAR', 2), topic('c', 'writing', 3)])
    expect(lanes.map((lane) => lane.key)).toEqual(['LISTENING', 'READING', 'WRITING', 'SPEAKING', 'OTHER'])
    expect(lanes[4].topics.map((row) => row.id)).toEqual(['a', 'b'])
    expect(lanes[2].topics.map((row) => row.id)).toEqual(['c'])
  })

  it('derives progress and state per skill', () => {
    const [listening, reading, writing] = buildLanes([
      topic('l1', 'LISTENING', 1, { status: 'PASSED', completedLessons: 4 }),
      topic('l2', 'LISTENING', 2, { status: 'PASSED', completedLessons: 4 }),
      topic('r1', 'READING', 3, { status: 'PASSED', completedLessons: 4 }),
      topic('r2', 'READING', 4, { status: 'IN_PROGRESS', completedLessons: 1 }),
      topic('w1', 'WRITING', 5, { status: 'IN_PROGRESS' }),
    ])
    expect(listening).toMatchObject({ state: 'DONE', passedTopics: 2, completedLessons: 8, totalLessons: 8, nextTopicId: null })
    expect(reading).toMatchObject({ state: 'IN_PROGRESS', passedTopics: 1, completedLessons: 5, nextTopicId: 'r2' })
    expect(writing).toMatchObject({ state: 'READY', completedLessons: 0, nextTopicId: 'w1' })
  })
})

describe('initialLaneKey', () => {
  const lanes = buildLanes([
    topic('l1', 'LISTENING', 1, { status: 'IN_PROGRESS' }),
    topic('r1', 'READING', 2, { status: 'PASSED', completedLessons: 4 }),
    topic('r2', 'READING', 3, { status: 'IN_PROGRESS' }),
  ])

  it('prefers the skill in the address, then the skill holding the requested topic', () => {
    expect(initialLaneKey(lanes, 'writing', 'r2')).toBe('WRITING')
    expect(initialLaneKey(lanes, null, 'r2')).toBe('READING')
    expect(initialLaneKey(lanes, 'bogus', 'missing')).toBe('READING')
  })

  it('falls back to the first skill being studied, then the first with a topic', () => {
    expect(initialLaneKey(lanes, null, null)).toBe('READING')
    expect(initialLaneKey(buildLanes([topic('w1', 'WRITING', 1)]), null, null)).toBe('WRITING')
    expect(initialLaneKey(buildLanes([]), null, null)).toBe('LISTENING')
  })
})

describe('unlock options', () => {
  const priced = course({ skillUnlockPoints: { READING: 120, LISTENING: 100 }, comboPayablePoints: 300 })

  it('offers a skill only when it has a price and nothing already covers it', () => {
    expect(canUnlockSkill(priced, 'READING')).toBe(true)
    expect(canUnlockSkill(priced, 'WRITING')).toBe(false)
    expect(canUnlockSkill({ ...priced, unlockedSkills: ['READING'] }, 'READING')).toBe(false)
    expect(canUnlockSkill({ ...priced, comboUnlocked: true }, 'READING')).toBe(false)
    expect(canUnlockSkill({ ...priced, premium: true }, 'READING')).toBe(false)
    expect(canUnlockSkill(priced, 'OTHER')).toBe(false)
    expect(canUnlockSkill(null, 'READING')).toBe(false)
  })

  it('offers the combo only while it is payable and not owned', () => {
    expect(canUnlockCombo(priced)).toBe(true)
    expect(canUnlockCombo({ ...priced, comboUnlocked: true })).toBe(false)
    expect(canUnlockCombo({ ...priced, premium: true })).toBe(false)
    expect(canUnlockCombo(course())).toBe(false)
  })
})

describe('practice test placement', () => {
  const milestone = (packageId: string, afterTopicSequence: number): PracticeTestMilestone => ({
    packageId, packageVersionId: `${packageId}-v`, code: packageId, title: packageId, afterTopicSequence,
    status: 'LOCKED', percent: null,
  })
  // Counted across the course by sequence order: l1, r1, l2, w1.
  const topics = [topic('w1', 'WRITING', 4), topic('l1', 'LISTENING', 1), topic('l2', 'LISTENING', 3), topic('r1', 'READING', 2)]

  it('puts a test after the chặng it opens after, whichever skill that chặng belongs to', () => {
    const { afterTopic, unplaced } = placePracticeTests(topics, [milestone('a', 3), milestone('b', 2)])
    expect(afterTopic.get('l2')?.map((row) => row.packageId)).toEqual(['a'])
    expect(afterTopic.get('r1')?.map((row) => row.packageId)).toEqual(['b'])
    expect(unplaced).toEqual([])
  })

  it('keeps the server order when several tests open after the same chặng', () => {
    const { afterTopic } = placePracticeTests(topics, [milestone('a', 1), milestone('b', 1)])
    expect(afterTopic.get('l1')?.map((row) => row.packageId)).toEqual(['a', 'b'])
  })

  it('keeps a test whose chặng is not in the course instead of dropping it', () => {
    const { afterTopic, unplaced } = placePracticeTests(topics, [milestone('a', 9), milestone('b', 0)])
    expect(afterTopic.size).toBe(0)
    expect(unplaced.map((row) => row.packageId)).toEqual(['a', 'b'])
  })

  it('names the chặng in course order, never as a position inside a skill', () => {
    expect(afterTopicLabel(topics, milestone('a', 3))).toBe('chặng “l2”')
    expect(afterTopicLabel(topics, milestone('a', 9))).toBe('chặng thứ 9 của khóa')
  })
})
