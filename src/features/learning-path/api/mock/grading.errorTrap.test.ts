import { describe, expect, it } from 'vitest'
import { gap, tfng } from '@/mocks/learning-path/contentTypes'
import { gradeAnswers } from './grading'

const notGiven = tfng('q1', 1, 'The shop is the busiest in town.', 'NOT GIVEN', 'Bài không nói.')
const falseOne = tfng('q2', 2, 'The shop opened in 1985.', 'FALSE', 'Bài nói 1990.')
const typed = gap('q3', 3, 'The shop opened in ____.', ['1990'], 'Bài nói 1990.')

describe('mock grading names the mistake of a wrong answer', () => {
  it('names choosing False where the text says nothing, and choosing Not Given where it says the opposite', () => {
    const { results } = gradeAnswers([notGiven, falseOne], { q1: 'FALSE', q2: 'NOT GIVEN' })

    expect(results[0].error?.code).toBe('TFNG_NG_AS_FALSE')
    expect(results[1].error?.code).toBe('TFNG_FALSE_AS_NG')
  })

  it('names it even when the set did not pass, as the backend does', () => {
    const { passed, results } = gradeAnswers([notGiven], { q1: 'FALSE' })

    expect(passed).toBe(false)
    expect(results[0].error?.code).toBe('TFNG_NG_AS_FALSE')
    expect(results[0]).not.toHaveProperty('correctAnswer')
  })

  it('names nothing for a right answer, another wrong answer or a typed answer', () => {
    const { results } = gradeAnswers([notGiven, falseOne, typed], { q1: 'NOT GIVEN', q2: 'TRUE', q3: '1985' })

    expect(results.map((result) => 'error' in result)).toEqual([false, false, false])
  })
})
