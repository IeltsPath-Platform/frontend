export const SKILL_ORDER = ['LISTENING', 'READING', 'WRITING', 'SPEAKING', 'ALL', 'OTHER'] as const
export type SkillKey = (typeof SKILL_ORDER)[number]

export const SKILL_LABEL: Record<SkillKey, string> = {
  LISTENING: 'Listening',
  READING: 'Reading',
  WRITING: 'Writing',
  SPEAKING: 'Speaking',
  ALL: 'Grammar / Vocabulary',
  OTHER: 'Khác',
}

/** The skill group a point belongs to; a point with no skill, or one that is not listed, goes under "Khác". */
export function skillOf(skill: string | null | undefined): SkillKey {
  return skill && skill !== 'OTHER' && (SKILL_ORDER as readonly string[]).includes(skill) ? (skill as SkillKey) : 'OTHER'
}
