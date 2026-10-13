import type { AnswerMap } from '~types/learningPath'
import type { TestSection } from '../lib/attemptSnapshot'
import { answeredCount, questionItems, skillOf, type SectionSkill } from './placementSkills'

/**
 * One exam skill as the learner sees it: the consecutive sections of the attempt that share a skill
 * (Reading passages, Listening parts, Writing tasks…). Questions are numbered continuously across the sections.
 */
export interface TestGroup {
  /** Id of the first section; stable for the lifetime of the attempt. */
  id: string
  skill: SectionSkill
  sections: TestSection[]
}

/** Gathers consecutive sections of one skill; sections of an unknown skill each stay on their own. */
export function groupSections(sections: TestSection[]): TestGroup[] {
  const buckets: { skill: SectionSkill; sections: TestSection[] }[] = []
  for (const section of [...sections].sort((a, b) => a.sortOrder - b.sortOrder)) {
    const skill = skillOf(section)
    const last = buckets.at(-1)
    if (last && skill !== 'OTHER' && last.skill === skill) last.sections.push(section)
    else buckets.push({ skill, sections: [section] })
  }
  return buckets.map(({ skill, sections: members }) => ({ id: members[0].id, skill, sections: numberContinuously(members) }))
}

/** Question numbers run on from one section to the next: Reading 1–40, Listening 1–40. */
function numberContinuously(sections: TestSection[]): TestSection[] {
  let number = 0
  return sections.map((section) => ({
    ...section,
    items: section.items.map((item) => {
      if (!item.question) return item
      number += 1
      return { ...item, question: { ...item.question, number } }
    }),
  }))
}

export const isGroupDone = (group: TestGroup, completedIds: ReadonlySet<string>) =>
  group.sections.every((section) => completedIds.has(section.id))

export const groupQuestionCount = (group: TestGroup) =>
  group.sections.reduce((total, section) => total + questionItems(section).length, 0)

export const groupAnsweredCount = (group: TestGroup, answers: AnswerMap) =>
  group.sections.reduce((total, section) => total + answeredCount(section, answers), 0)

/** "Part 1", "Passage 2" or "Task 1" from a section title; falls back to the position within its skill. */
export function titleLabel(title: string | null, index: number): string {
  const match = /\b(Part|Passage|Task)\s*(\d+)/i.exec(title ?? '')
  return match ? `${match[1].charAt(0).toUpperCase()}${match[1].slice(1).toLowerCase()} ${match[2]}` : `Part ${index + 1}`
}

/** What follows the colon in a title ("joining a swimming course"), or an empty string. */
export function titleTopic(title: string | null): string {
  const text = title ?? ''
  const topic = text.includes(':') ? text.slice(text.indexOf(':') + 1).trim() : ''
  return topic.charAt(0).toUpperCase() + topic.slice(1)
}

export const partLabel = (section: TestSection, index: number) => titleLabel(section.snapshot?.title ?? null, index)
export const partTopic = (section: TestSection) => titleTopic(section.snapshot?.title ?? null)
