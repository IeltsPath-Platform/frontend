export interface CueCard {
  topic: string
  points: string[]
}

const LEAD = /\s*You should say:?\s*/i

/**
 * A Part 2 prompt is stored as one sentence: "Describe a teacher who influenced you. You should say: who the teacher was,
 * what subject they taught, and explain why they influenced you." Split it into the topic and the points to cover.
 * A prompt without that lead (Part 1 and Part 3 questions) is returned as it is.
 */
export function parseCueCard(prompt: string): CueCard {
  const [topic, rest] = prompt.split(LEAD, 2)
  if (!rest) return { topic: prompt.trim(), points: [] }
  const points = rest.replace(/\.\s*$/, '').split(/,\s*/).map((point) => point.trim()).filter(Boolean)
  return { topic: topic.trim(), points }
}

/** "120" becomes "2 minutes", "30" becomes "30 seconds". */
export function speakingLimit(seconds: number): string {
  if (seconds >= 60 && seconds % 60 === 0) {
    const minutes = seconds / 60
    return `${minutes} minute${minutes === 1 ? '' : 's'}`
  }
  return `${seconds} seconds`
}
