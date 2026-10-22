/** Pure helpers for the Learn and Test modes; kept free of React so they are unit-tested directly. */

export interface StudyCard { id: string; front: string; back: string; imageUrl?: string | null }
export type AnswerSide = 'front' | 'back'

export function shuffle<T>(items: readonly T[], random: () => number = Math.random): T[] {
  const copy = [...items]
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1))
    ;[copy[i], copy[j]] = [copy[j], copy[i]]
  }
  return copy
}

/** Case, accents spacing and trailing punctuation do not count as mistakes in typed answers. */
export function normalizeAnswer(text: string): string {
  return text.normalize('NFC').toLowerCase().replace(/[.,!?;:"'()]/g, ' ').replace(/\s+/g, ' ').trim()
}

export function isTypedAnswerCorrect(typed: string, expected: string): boolean {
  const answer = normalizeAnswer(typed)
  return answer.length > 0 && answer === normalizeAnswer(expected)
}

/** The correct value plus up to three distinct distractors taken from other cards. */
export function buildChoices(card: StudyCard, pool: readonly StudyCard[], side: AnswerSide, random: () => number = Math.random): string[] {
  const correct = card[side]
  const seen = new Set([normalizeAnswer(correct)])
  const distractors: string[] = []
  for (const other of shuffle(pool, random)) {
    const value = other[side]
    const key = normalizeAnswer(value)
    if (other.id === card.id || seen.has(key)) continue
    seen.add(key)
    distractors.push(value)
    if (distractors.length === 3) break
  }
  return shuffle([correct, ...distractors], random)
}

export type TestQuestionType = 'choice' | 'truefalse' | 'written'

export interface TestQuestion {
  card: StudyCard
  type: TestQuestionType
  /** Text shown as the question; the learner answers with the other side. */
  prompt: string
  answer: string
  choices?: string[]
  /** For true/false: the pairing shown, which may be wrong on purpose. */
  shownPair?: string
  pairIsCorrect?: boolean
}

export interface TestOptions { count: number; types: TestQuestionType[]; answerWith: AnswerSide }

/** Picks `count` cards and spreads the chosen question types across them in rotation. */
export function generateTest(cards: readonly StudyCard[], options: TestOptions, random: () => number = Math.random): TestQuestion[] {
  const promptSide: AnswerSide = options.answerWith === 'front' ? 'back' : 'front'
  const picked = shuffle(cards, random).slice(0, Math.max(1, Math.min(options.count, cards.length)))
  const types = options.types.length ? options.types : (['choice'] as TestQuestionType[])
  return picked.map((card, index) => {
    const type = types[index % types.length]
    const base = { card, type, prompt: card[promptSide], answer: card[options.answerWith] }
    if (type === 'choice') return { ...base, choices: buildChoices(card, cards, options.answerWith, random) }
    if (type === 'truefalse') {
      const others = cards.filter((other) => other.id !== card.id)
      const pairIsCorrect = others.length === 0 || random() < 0.5
      const shownPair = pairIsCorrect ? base.answer : others[Math.floor(random() * others.length)][options.answerWith]
      return { ...base, shownPair, pairIsCorrect: pairIsCorrect || normalizeAnswer(shownPair) === normalizeAnswer(base.answer) }
    }
    return base
  })
}

export function gradeQuestion(question: TestQuestion, response: string | boolean | undefined): boolean {
  if (response === undefined) return false
  if (question.type === 'truefalse') return response === question.pairIsCorrect
  if (question.type === 'choice') return response === question.answer
  return typeof response === 'string' && isTypedAnswerCorrect(response, question.answer)
}
