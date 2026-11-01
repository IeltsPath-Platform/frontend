import { BookOpen, Headphones, Layers, Mic, PenLine, type LucideIcon } from 'lucide-react'
import { OTHER_LANE, type LaneKey } from './courseSkills'

/** The icon of each skill, shared by the course board and the unlock dialog so a skill looks the same wherever it appears. */
export const SKILL_ICON: Record<LaneKey, LucideIcon> = {
  LISTENING: Headphones,
  READING: BookOpen,
  WRITING: PenLine,
  SPEAKING: Mic,
  [OTHER_LANE]: Layers,
}

/** CSS value of the hue a skill is drawn in; the tokens live on `.lp-root` and `.lp-tokens`. */
export function skillHue(key: LaneKey) {
  return `var(--lp-hue-${key.toLowerCase()})`
}
