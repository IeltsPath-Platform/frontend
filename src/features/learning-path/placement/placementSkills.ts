import { BookOpenText, ChartColumnBig, Headphones, MicVocal, NotebookPen, type LucideIcon } from 'lucide-react'
import type { AnswerMap } from '~types/learningPath'
import type { TestSection } from '../lib/attemptSnapshot'

export type SectionSkill = 'LISTENING' | 'READING' | 'WRITING' | 'SPEAKING' | 'OTHER'

export const SKILL_META: Record<SectionSkill, { label: string; icon: LucideIcon }> = {
  LISTENING: { label: 'Listening', icon: Headphones },
  READING: { label: 'Reading', icon: BookOpenText },
  WRITING: { label: 'Writing', icon: NotebookPen },
  SPEAKING: { label: 'Speaking', icon: MicVocal },
  OTHER: { label: 'Phần thi', icon: BookOpenText },
}

/** Writing Task 1 comes with data to describe (a passage), so it gets a chart icon instead of the essay one. */
export function sectionIcon(section: TestSection): LucideIcon {
  const skill = skillOf(section)
  const passage = section.snapshot?.passage
  if (skill === 'WRITING' && passage && passage.paragraphs.length > 0) return ChartColumnBig
  return SKILL_META[skill].icon
}

export function skillOf(section: TestSection): SectionSkill {
  const skill = section.snapshot?.skill?.toUpperCase()
  return skill === 'LISTENING' || skill === 'READING' || skill === 'WRITING' || skill === 'SPEAKING' ? skill : 'OTHER'
}

/** When a section was first opened and when it was handed in (ISO timestamps). */
export interface SectionTiming {
  startedAt: string | null
  completedAt: string | null
}

/** Whole minutes (at least 1) between opening and handing in a section; null when either end is unknown. */
export function minutesSpent(timing: SectionTiming | undefined): number | null {
  if (!timing?.startedAt || !timing.completedAt) return null
  const ms = Date.parse(timing.completedAt) - Date.parse(timing.startedAt)
  return Number.isFinite(ms) && ms >= 0 ? Math.max(1, Math.round(ms / 60000)) : null
}

export const questionItems = (section: TestSection) => section.items.filter((item) => item.question !== null)

/** Writing keeps its paragraphs as JSON in the local answer map; only the joined essay is sent. */
export const WRITING_PARTS = ['Introduction', 'Body 1', 'Body 2', 'Conclusion'] as const
/** Task 1 (describing data) swaps the conclusion for an overview, and puts it second. */
export const TASK_1_PARTS = ['Introduction', 'Overview', 'Body 1', 'Body 2'] as const

export function readWritingParts(raw: string | undefined): string[] {
  try {
    const value = raw ? JSON.parse(raw) as { parts?: unknown } : null
    const parts = value && Array.isArray(value.parts) ? value.parts as unknown[] : null
    if (parts) return WRITING_PARTS.map((_, index) => String(parts[index] ?? ''))
  } catch {
    // A plain-text draft from an older version becomes the introduction.
    if (raw) return [raw, '', '', '']
  }
  return WRITING_PARTS.map(() => '')
}

export const joinWritingParts = (parts: string[]) => parts.map((part) => part.trim()).filter(Boolean).join('\n\n')

export const countWords = (text: string) => text.trim().split(/\s+/).filter(Boolean).length

/** Speaking keeps only the recorded length locally; the recording itself never leaves the browser. */
export function readSpokenSeconds(raw: string | undefined): number {
  try {
    const value = raw ? JSON.parse(raw) as { spokenSeconds?: unknown } : null
    return value && typeof value.spokenSeconds === 'number' ? value.spokenSeconds : 0
  } catch {
    return 0
  }
}

export const spokenAnswer = (seconds: number) => JSON.stringify({ spokenSeconds: seconds })

/** Items of a section with an answer; Writing counts its joined essay, Speaking its recordings. */
export function answeredCount(section: TestSection, answers: AnswerMap) {
  const skill = skillOf(section)
  return questionItems(section).filter((item) => {
    if (skill === 'SPEAKING') return readSpokenSeconds(answers[item.id]) > 0
    if (skill === 'WRITING') return joinWritingParts(readWritingParts(answers[item.id])) !== ''
    return (answers[item.id] ?? '').trim() !== ''
  }).length
}
