import type { EssayJudgment, EssayStudyPoint } from '~types/learningPath'

export const CRITERION_NAME: Record<string, string> = {
  TA: 'Task Achievement',
  TR: 'Task Response',
  CC: 'Coherence & Cohesion',
  LR: 'Lexical Resource',
  GRA: 'Grammar Range & Accuracy',
}

export const JUDGMENT_LABEL: Record<EssayJudgment, string> = {
  PASS: 'Đạt',
  FAIL: 'Cần luyện',
  NOT_ASSESSED: 'Chưa đủ bằng chứng',
}

/** Which rubric criteria an AI focus title is about, by the words the grader's model tends to use. */
const FOCUS_TOPICS: Array<[RegExp, string[]]> = [
  [/task\s*(achievement|response)/i, ['TA', 'TR']],
  [/coheren|cohesi/i, ['CC']],
  [/lexical|vocabular/i, ['LR']],
  [/grammat/i, ['GRA']],
]

/** A title that only names the criterion says nothing the criterion's own entry does not. */
const GENERIC_FOCUS_TITLE =
  /^(task\s*(achievement|response)|coherence(\s*(and|&)\s*cohesion)?|lexical\s*resource|vocabulary|grammatical?\s*range(\s*(and|&)\s*accuracy)?|grammar)$/i

export interface StudyPointGroup {
  point: EssayStudyPoint
  /** AI suggestions about the same criterion, shown with the point they belong to. */
  notes: EssayStudyPoint[]
}

/**
 * Puts each AI suggestion under the weak criterion it is about, so the learner sees the advice and the practice button
 * together. A suggestion that matches no listed criterion stays an entry of its own.
 */
export function groupStudyPoints(points: EssayStudyPoint[]): StudyPointGroup[] {
  const groups: StudyPointGroup[] = points.map((point) => ({ point, notes: [] }))
  const criteria = groups.filter((group) => group.point.kind === 'CRITERION')
  return groups.filter((group) => {
    if (group.point.kind !== 'AI') return true
    const title = group.point.title ?? ''
    const codes = FOCUS_TOPICS.find(([pattern]) => pattern.test(title))?.[1]
    const target = codes && criteria.find((candidate) => codes.includes(candidate.point.criterionCode ?? ''))
    if (!target) return true
    target.notes.push(group.point)
    return false
  })
}

/** The text of an AI note: its reason, led by its title when the title says something specific. */
export function focusNoteText(note: EssayStudyPoint): string {
  const title = (note.title ?? '').trim()
  const reason = (note.reason ?? '').trim()
  if (!reason) return title
  return !title || GENERIC_FOCUS_TITLE.test(title) ? reason : `${title}: ${reason}`
}
