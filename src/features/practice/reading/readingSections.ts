import type { AttemptStructure as LearningAttemptStructure } from '~types/learningPath'
import { parseAttemptStructure, type TestSection } from '@/features/learning-path/lib/attemptSnapshot'
import type { AttemptStructure } from './readingPracticeApi'

/** Turns the structure the API returns into the passages and questions the Reading screens draw. */
export function parseSections(structure: AttemptStructure): TestSection[] {
  const normalized: LearningAttemptStructure = {
    sections: structure.sections.map((section) => ({
      ...section,
      snapshot: JSON.stringify(section.snapshot),
      startedAt: section.startedAt ?? null,
      completedAt: section.completedAt ?? null,
      items: section.items.map((item) => ({
        ...item,
        answerSnapshot: null,
        knowledgeSnapshot: null,
      })),
    })),
  }
  return parseAttemptStructure(normalized)
}
