import type { PracticeSetDraft } from '../../ai-drafts/types'
import type { CoursePracticeSet } from '../types'

/** The set a finished draft holds, in the shape the course draft keeps; null when the draft has no usable question. */
export function practiceSetOf(draft: PracticeSetDraft): CoursePracticeSet | null {
  const result = draft.result
  if (!result) return null
  const questions = result.items.flatMap((item) => item.answerSpec.type === 'CHOICE' ? [{
    stem: item.stem, options: item.options.map((option) => ({ optionKey: option.optionKey, content: option.content })),
    correctKey: item.answerSpec.correct, explanation: item.explanation, difficulty: item.difficulty,
    ...(item.knowledgePointIds?.length ? { knowledgePointIds: item.knowledgePointIds } : {}),
  }] : [])
  if (questions.length === 0) return null
  return {
    title: result.title.trim() || 'Gói luyện tập', instructions: result.instructions.trim() || null, passage: result.passage,
    questionType: result.questionType, knowledgePointIds: result.knowledgePointIds, questions,
  }
}
