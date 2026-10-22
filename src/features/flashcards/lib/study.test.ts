import { describe, expect, it } from 'vitest'
import { buildChoices, generateTest, gradeQuestion, isTypedAnswerCorrect, type StudyCard } from './study'

const cards: StudyCard[] = [
  { id: '1', front: 'pollution', back: 'ô nhiễm' },
  { id: '2', front: 'renewable', back: 'tái tạo' },
  { id: '3', front: 'fuel', back: 'nhiên liệu' },
  { id: '4', front: 'drought', back: 'hạn hán' },
  { id: '5', front: 'flood', back: 'lũ lụt' },
]

describe('isTypedAnswerCorrect', () => {
  it('ignores case, extra spaces and punctuation but not spelling', () => {
    expect(isTypedAnswerCorrect('  Pollution. ', 'pollution')).toBe(true)
    expect(isTypedAnswerCorrect('polution', 'pollution')).toBe(false)
    expect(isTypedAnswerCorrect('   ', 'pollution')).toBe(false)
  })
})

describe('buildChoices', () => {
  it('returns the answer plus three distinct distractors', () => {
    const choices = buildChoices(cards[0], cards, 'back')
    expect(choices).toHaveLength(4)
    expect(choices).toContain('ô nhiễm')
    expect(new Set(choices).size).toBe(4)
  })

  it('works with fewer cards than four choices', () => {
    expect(buildChoices(cards[0], cards.slice(0, 2), 'back').sort()).toEqual(['tái tạo', 'ô nhiễm'].sort())
  })
})

describe('generateTest', () => {
  it('caps the question count, rotates types and grades each kind', () => {
    const questions = generateTest(cards, { count: 9, types: ['choice', 'truefalse', 'written'], answerWith: 'back' })
    expect(questions).toHaveLength(5)
    expect(questions.map((question) => question.type)).toEqual(['choice', 'truefalse', 'written', 'choice', 'truefalse'])
    const [choice, truefalse, written] = questions
    expect(gradeQuestion(choice, choice.answer)).toBe(true)
    expect(gradeQuestion(truefalse, truefalse.pairIsCorrect)).toBe(true)
    expect(gradeQuestion(truefalse, !truefalse.pairIsCorrect)).toBe(false)
    expect(gradeQuestion(written, written.answer.toUpperCase())).toBe(true)
    expect(gradeQuestion(written, undefined)).toBe(false)
  })

  it('asks for the term when answering with the term', () => {
    const [question] = generateTest(cards, { count: 1, types: ['written'], answerWith: 'front' })
    expect(cards.find((card) => card.back === question.prompt)?.front).toBe(question.answer)
  })
})
