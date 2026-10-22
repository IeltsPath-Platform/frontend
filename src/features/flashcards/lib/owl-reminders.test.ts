import { describe, expect, it } from 'vitest'
import {
  getAnswerReaction, getBreakReminder, getGreetingReaction, getIdleReminder, getMilestoneReaction, getWrongStreakReminder,
} from './owl-reactions'

describe('owl effects per answer kind', () => {
  it('pairs each kind of answer with its own effect', () => {
    expect(getAnswerReaction({ kind: 'correct', expected: 'x', streak: 1 }).effect).toBe('stars')
    expect(getAnswerReaction({ kind: 'correct', expected: 'x', streak: 3 }).effect).toBe('confetti')
    expect(getAnswerReaction({ kind: 'correct', expected: 'x', streak: 6 }).effect).toBe('fire')
    expect(getAnswerReaction({ kind: 'correct', expected: 'x', previouslyFailed: true }).effect).toBe('hearts')
    expect(getAnswerReaction({ kind: 'typo', expected: 'x' }).effect).toBe('idea')
    expect(getAnswerReaction({ kind: 'mixed-up', expected: 'x' }).effect).toBe('question')
    expect(getAnswerReaction({ kind: 'wrong', expected: 'x', wrongCount: 1 }).effect).toBe('shake')
    expect(getAnswerReaction({ kind: 'wrong', expected: 'x', wrongCount: 2 }).effect).toBe('sweat')
  })

  it('celebrates long streaks again every fifth answer', () => {
    expect(getAnswerReaction({ kind: 'correct', expected: 'x', streak: 10 }).celebrateKey).toBeTruthy()
    expect(getAnswerReaction({ kind: 'correct', expected: 'x', streak: 7 }).celebrateKey).toBeNull()
  })
})

describe('owl reminders', () => {
  it('greets with the number of cards', () => {
    expect(getGreetingReaction(12).text).toContain('12')
  })

  it('announces each milestone once, when it is crossed', () => {
    expect(getMilestoneReaction(4, 5, 10)?.text).toMatch(/Nửa|một nửa/)
    expect(getMilestoneReaction(5, 6, 10)).toBeNull()
    expect(getMilestoneReaction(7, 8, 10)?.text).toMatch(/2 thẻ/)
    expect(getMilestoneReaction(9, 10, 10)).toBeNull()
    expect(getMilestoneReaction(0, 1, 3)).toBeNull()
  })

  it('gives a first-letter hint only on the second nudge of a typed question', () => {
    expect(getIdleReminder('typed', 'sustainable', 1).text).not.toMatch(/bắt đầu bằng/)
    expect(getIdleReminder('typed', 'sustainable', 2).text).toMatch(/“s”.*11 ký tự/)
    expect(getIdleReminder('choice', 'sustainable', 2).text).not.toMatch(/bắt đầu bằng/)
  })

  it('suggests a break after three misses in a row and every 20 answers', () => {
    expect(getWrongStreakReminder(2)).toBeNull()
    expect(getWrongStreakReminder(3)?.effect).toBe('zzz')
    expect(getBreakReminder(19)).toBeNull()
    expect(getBreakReminder(20)?.text).toContain('20')
  })

  it('never uses discouraging words', () => {
    const texts = [
      ...[1, 3, 5].map((streak) => getAnswerReaction({ kind: 'correct', expected: 'x', streak }).text),
      ...(['accent', 'typo', 'mixed-up', 'blank', 'wrong'] as const).map((kind) => getAnswerReaction({ kind, expected: 'x', wrongCount: 2 }).text),
      getWrongStreakReminder(3)!.text,
    ]
    for (const text of texts) expect(text).not.toMatch(/tệ|kém|sai bét|dở/i)
  })
})
