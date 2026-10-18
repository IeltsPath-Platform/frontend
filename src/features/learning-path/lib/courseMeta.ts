/** Band a learner should already be at to start a course (one band below it, never under 3.5). */
export function entryBand(bandLevel: number) {
  return Math.max(bandLevel - 1, 3.5).toFixed(1)
}

/** Whether the course illustration has a dark sky, so text drawn over it should be light. */
export function isDarkArt(bandLevel: number) {
  return bandLevel >= 7
}

const SKILL_LABEL: Record<string, string> = {
  READING: 'Reading',
  LISTENING: 'Listening',
  WRITING: 'Writing',
  SPEAKING: 'Speaking',
  GRAMMAR: 'Grammar',
  VOCABULARY: 'Vocabulary',
  OTHER: 'Khác',
}

/** Display name of a topic skill (READING → Reading); unknown codes are shown as they are. */
export function skillLabel(skill: string | null | undefined) {
  if (!skill) return null
  return SKILL_LABEL[skill.toUpperCase()] ?? skill
}
