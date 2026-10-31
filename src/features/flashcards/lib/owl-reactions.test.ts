import { describe, expect, it } from 'vitest'
import {
  getAnswerReaction,
  getBrowserMarkReaction,
  getSpacedReviewReaction,
  getStudyCompleteReaction,
  getTestScoreReaction,
  pickNonRepeating,
} from './owl-reactions'

describe('pickNonRepeating', () => {
  const pool = ['Câu A', 'Câu B', 'Câu C']

  it('avoids repeating the previous text when alternatives exist', () => {
    for (let i = 0; i < 20; i++) {
      const picked = pickNonRepeating(pool, 'Câu A')
      expect(picked).not.toBe('Câu A')
      expect(pool).toContain(picked)
    }
  })

  it('falls back to the single item if only 1 option in pool', () => {
    expect(pickNonRepeating(['Duy nhất'], 'Duy nhất')).toBe('Duy nhất')
  })
})

describe('getAnswerReaction', () => {
  it('returns cheer or confident pose for normal correct answer', () => {
    const reaction = getAnswerReaction({ kind: 'correct', expected: 'apple', streak: 1 })
    expect(['cheer', 'confident']).toContain(reaction.pose)
    expect(reaction.motion).toBe('hop')
    expect(reaction.tone).toBe('success')
    expect(reaction.text.length).toBeLessThanOrEqual(90)
  })

  it('returns party pose and celebrateKey for streak = 3', () => {
    const reaction = getAnswerReaction({ kind: 'correct', expected: 'apple', streak: 3 })
    expect(reaction.pose).toBe('party')
    expect(reaction.motion).toBe('hop')
    expect(reaction.celebrateKey).toBeDefined()
    expect(reaction.text).toMatch(/3 câu/)
  })

  it('returns cool pose for streak >= 5', () => {
    const reaction = getAnswerReaction({ kind: 'correct', expected: 'apple', streak: 5 })
    expect(reaction.pose).toBe('cool')
    expect(reaction.motion).toBe('hop')
    expect(reaction.text.length).toBeLessThanOrEqual(90)
  })

  it('returns confident pose when answering correctly after previously failing', () => {
    const reaction = getAnswerReaction({
      kind: 'correct',
      expected: 'apple',
      previouslyFailed: true,
      streak: 1,
    })
    expect(reaction.pose).toBe('confident')
    expect(reaction.motion).toBe('hop')
    expect(reaction.text).toMatch(/nhớ|tiến bộ|khắc phục/i)
  })

  it('returns idea pose with calm motion for accent errors', () => {
    const reaction = getAnswerReaction({ kind: 'accent', expected: 'môi trường' })
    expect(reaction.pose).toBe('idea')
    expect(reaction.motion).toBe('calm')
    expect(reaction.tone).toBe('warning')
    expect(reaction.text).toMatch(/dấu/i)
  })

  it('returns idea pose and includes expected word for typo errors', () => {
    const reaction = getAnswerReaction({ kind: 'typo', expected: 'environment' })
    expect(reaction.pose).toBe('idea')
    expect(reaction.motion).toBe('calm')
    expect(reaction.text).toContain('environment')
    expect(reaction.tone).toBe('warning')
  })

  it('returns confused pose for mixed-up errors', () => {
    const reaction = getAnswerReaction({
      kind: 'mixed-up',
      expected: 'pollution',
      mixedUpWith: 'conservation',
      random: () => 0,
    })
    expect(reaction.pose).toBe('confused')
    expect(reaction.motion).toBe('calm')
    expect(reaction.text).toContain('conservation')
    expect(reaction.tone).toBe('warning')
  })

  it('returns wave or desk pose for blank/unknown answers', () => {
    const reaction = getAnswerReaction({ kind: 'blank', expected: 'pollution' })
    expect(['wave', 'desk']).toContain(reaction.pose)
    expect(reaction.motion).toBe('calm')
    expect(reaction.tone).toBe('info')
  })

  it('returns confused pose for first-time wrong answer', () => {
    const reaction = getAnswerReaction({ kind: 'wrong', expected: 'pollution', wrongCount: 1 })
    expect(reaction.pose).toBe('confused')
    expect(reaction.motion).toBe('calm')
    expect(reaction.tone).toBe('info')
  })

  it('returns tired pose for repeated wrong answer on the same card', () => {
    const reaction = getAnswerReaction({ kind: 'wrong', expected: 'pollution', wrongCount: 2, random: () => 0 })
    expect(reaction.pose).toBe('tired')
    expect(reaction.motion).toBe('calm')
    expect(reaction.text).toMatch(/khó nhằn|ví dụ|ghi chú|khắc sâu/i)
  })
})

describe('getStudyCompleteReaction', () => {
  it('returns party pose with celebration', () => {
    const reaction = getStudyCompleteReaction()
    expect(reaction.pose).toBe('party')
    expect(reaction.motion).toBe('hop')
    expect(reaction.celebrateKey).toBeDefined()
    expect(reaction.text.length).toBeLessThanOrEqual(90)
  })
})

describe('getTestScoreReaction', () => {
  it('returns party pose and celebration for >= 90%', () => {
    const reaction = getTestScoreReaction(10, 10)
    expect(reaction.pose).toBe('party')
    expect(reaction.motion).toBe('hop')
    expect(reaction.celebrateKey).toBeDefined()
  })

  it('returns cheer pose for 70% to 89%', () => {
    const reaction = getTestScoreReaction(8, 10)
    expect(reaction.pose).toBe('cheer')
    expect(reaction.motion).toBe('hop')
    expect(reaction.tone).toBe('success')
  })

  it('returns idea pose for 50% to 69%', () => {
    const reaction = getTestScoreReaction(6, 10)
    expect(reaction.pose).toBe('idea')
    expect(reaction.motion).toBe('calm')
    expect(reaction.tone).toBe('warning')
  })

  it('returns wave pose for < 50% without shaming', () => {
    const reaction = getTestScoreReaction(3, 10)
    expect(reaction.pose).toBe('wave')
    expect(reaction.motion).toBe('calm')
    expect(reaction.tone).toBe('info')
    expect(reaction.text).not.toMatch(/tệ|kém|sai bét/i)
  })
})

describe('getSpacedReviewReaction', () => {
  it('reacts encouragingly to remembered', () => {
    const reaction = getSpacedReviewReaction(true)
    expect(reaction.pose).toBe('cheer')
    expect(reaction.motion).toBe('hop')
  })

  it('reacts gently to forgot', () => {
    const reaction = getSpacedReviewReaction(false)
    expect(reaction.pose).toBe('confused')
    expect(reaction.motion).toBe('calm')
  })
})

describe('getBrowserMarkReaction', () => {
  it('reacts to marking learned', () => {
    const reaction = getBrowserMarkReaction(true)
    expect(reaction.pose).toBe('confident')
    expect(reaction.motion).toBe('hop')
  })

  it('reacts to marking forgotten', () => {
    const reaction = getBrowserMarkReaction(false)
    expect(reaction.pose).toBe('wave')
    expect(reaction.motion).toBe('calm')
  })
})

