import type { QuestionDraft, QuestionDraftItem } from './types'

export const draftId = '10000000-0000-4000-8000-000000000001'
export const knowledgePointId = '10000000-0000-4000-8000-000000000002'
export function makeItem(index: number): QuestionDraftItem {
  return {
    stem: `Question stem ${index + 1}`, explanation: `Explanation ${index + 1}`, difficulty: 'MEDIUM',
    options: [{ optionKey: 'A', content: 'Right answer', sortOrder: 0 }, { optionKey: 'B', content: 'Wrong answer', sortOrder: 1 }],
    answerSpec: { type: 'CHOICE', correct: 'A', distractors: { B: 'WRONG_MEANING' } },
  }
}
export function makeDraft(overrides: Partial<QuestionDraft> = {}): QuestionDraft {
  return {
    id: draftId, kind: 'QUESTIONS', status: 'READY',
    request: { knowledgePointId, questionType: 'MULTIPLE_CHOICE', count: 5, difficulty: 'MEDIUM' },
    result: { items: [makeItem(0), makeItem(1), makeItem(2)], rejected: [{ index: 1, reason: 'BAD_STEM' }, { index: 4, reason: 'UNKNOWN_ERROR_CODE' }] },
    errorCode: null, model: 'test-model', promptVersion: 'question-v1', createdAt: '2026-10-23T00:00:00Z',
    finishedAt: '2026-10-23T00:01:00Z', reviewedAt: null, reviewNote: null,
    ...overrides,
  }
}
