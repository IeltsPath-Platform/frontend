import type { AnswerInput, AnswerMap, Question, QuestionResult } from '~types/learningPath'
import type { MockQuestion } from '@/mocks/learning-path/contentTypes'

export const PASS_PERCENT = 70

export interface GradeOutcome {
  correctCount: number
  totalCount: number
  percent: number
  passed: boolean
  results: QuestionResult[]
}

export function normalizeAnswer(value: string) {
  return value.trim().replace(/\s+/g, ' ').toLowerCase()
}

function isAnswerCorrect(question: MockQuestion, answer: string | undefined) {
  if (answer === undefined) return false
  const normalized = normalizeAnswer(answer)
  return question.accepted.some((accepted) => normalizeAnswer(accepted) === normalized)
}

export function formatAnswerValue(question: MockQuestion, value: string) {
  const option = question.options?.find((candidate) => candidate.value === value)
  if (!option) return value
  return option.label === option.value ? option.value : `${option.value}. ${option.label}`
}

export function toPublicQuestion(question: MockQuestion): Question {
  return {
    id: question.id,
    number: question.number,
    prompt: question.prompt,
    options: question.options ? question.options.map((option) => ({ ...option })) : null,
  }
}

export function answersToMap(answers: AnswerInput[]): AnswerMap {
  return Object.fromEntries(answers.map(({ questionId, answer }) => [questionId, answer]))
}

export function hasCompleteAnswers(questions: MockQuestion[], answers: AnswerMap) {
  const known = new Set(questions.map((question) => question.id))
  return Object.keys(answers).every((id) => known.has(id))
    && questions.every((question) => (answers[question.id] ?? '').trim() !== '')
}

/** Solutions are attached only when the whole set passes. */
export function gradeAnswers(questions: MockQuestion[], answers: AnswerMap): GradeOutcome {
  const marks = questions.map((question) => ({ question, correct: isAnswerCorrect(question, answers[question.id]) }))
  const correctCount = marks.filter((mark) => mark.correct).length
  const totalCount = questions.length
  const ratio = totalCount === 0 ? 1 : correctCount / totalCount
  const passed = ratio * 100 >= PASS_PERCENT
  const results = marks.map(({ question, correct }): QuestionResult => passed
    ? { questionId: question.id, correct, correctAnswer: formatAnswerValue(question, question.accepted[0]), explanation: question.explanation }
    : { questionId: question.id, correct })
  return { correctCount, totalCount, percent: Math.round(ratio * 100), passed, results }
}
