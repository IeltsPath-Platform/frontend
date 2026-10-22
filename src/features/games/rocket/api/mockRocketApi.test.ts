import { describe, expect, it } from 'vitest'
import { createMockRocketApi, MOCK_WORD_BANK, speedPoints } from './mockRocketApi'

function setup() {
  let clock = Date.parse('2026-10-21T00:00:00Z')
  let seed = 7
  const api = createMockRocketApi({
    now: () => clock,
    random: () => {
      seed = (seed * 16807) % 2147483647
      return (seed - 1) / 2147483646
    },
    latencyMs: 0,
    storage: null,
  })
  return { api, advance: (ms: number) => (clock += ms) }
}

const answerOf = (meaning: string) => MOCK_WORD_BANK.find((entry) => entry.meaning === meaning)!.word

describe('mock rocket api', () => {
  it('builds rounds with one correct option and two distinct distractors', async () => {
    const { api } = setup()
    const { matchId } = await api.startSolo({ questionCount: 5 })
    const current = await api.current(matchId)
    expect(current.settings).toEqual({ questionCount: 5, initialLives: 4, secondsPerQuestion: 15 })
    const round = current.round!
    expect(round.total).toBe(5)
    expect(round.options).toHaveLength(3)
    expect(new Set(round.options.map((option) => option.word)).size).toBe(3)
    expect(round.options.filter((option) => option.word === answerOf(round.meaning))).toHaveLength(1)
  })

  it('scores 100 plus a speed bonus and only reveals the answer after closing the round', async () => {
    const { api, advance } = setup()
    const { matchId } = await api.startSolo({ questionCount: 3 })
    const round = (await api.current(matchId)).round!
    expect(round).not.toHaveProperty('correctOptionId')
    advance(3000)
    const correct = round.options.find((option) => option.word === answerOf(round.meaning))!
    const ack = await api.answer(matchId, round.roundId, { requestId: 'r1', optionId: correct.optionId })
    expect(ack.roundResult).toMatchObject({ correct: true, points: speedPoints(12000, 15000), livesRemaining: 4 })
    expect(ack.roundResult?.points).toBe(180)
    const replay = await api.answer(matchId, round.roundId, { requestId: 'r1', optionId: correct.optionId })
    expect(replay.roundResult).toEqual(ack.roundResult)
  })

  it('opens the next round after the reveal pause and times out unanswered rounds', async () => {
    const { api, advance } = setup()
    const { matchId } = await api.startSolo({ questionCount: 3 })
    const first = (await api.current(matchId)).round!
    const wrong = first.options.find((option) => option.word !== answerOf(first.meaning))!
    const ack = await api.answer(matchId, first.roundId, { requestId: 'w1', optionId: wrong.optionId })
    expect(ack.roundResult).toMatchObject({ correct: false, points: 0, livesRemaining: 3 })

    const waiting = await api.current(matchId)
    expect(Date.parse(waiting.round!.opensAt!)).toBeGreaterThan(Date.parse(waiting.serverTime))
    expect(waiting.round!.deadlineAt).toBeNull()
    advance(2500)
    const second = (await api.current(matchId)).round!
    expect(second.number).toBe(2)
    expect(second.deadlineAt).not.toBeNull()

    advance(15_000)
    const afterTimeout = await api.current(matchId)
    expect(afterTimeout.lastRoundResult).toMatchObject({ roundId: second.roundId, chosenOptionId: null, livesRemaining: 2 })
    await expect(api.answer(matchId, second.roundId, { requestId: 'late', optionId: second.options[0].optionId })).rejects.toMatchObject({
      code: 'ROUND_CLOSED',
    })
  })

  it('ends with NO_LIVES_LEFT after four misses and reports the result', async () => {
    const { api, advance } = setup()
    const { matchId } = await api.startSolo({ questionCount: 6 })
    for (let i = 0; i < 4; i += 1) {
      const round = (await api.current(matchId)).round!
      const wrong = round.options.find((option) => option.word !== answerOf(round.meaning))!
      await api.answer(matchId, round.roundId, { requestId: `w${i}`, optionId: wrong.optionId })
      advance(2500)
    }
    const current = await api.current(matchId)
    expect(current.matchFinished).toBe(true)
    const result = await api.result(matchId)
    expect(result).toMatchObject({ endReason: 'NO_LIVES_LEFT', answered: 4, correctCount: 0, totalRounds: 6, livesRemaining: 0 })
  })

  it('completes all rounds and rejects word counts outside the bank', async () => {
    const { api, advance } = setup()
    await expect(api.startSolo({ questionCount: MOCK_WORD_BANK.length + 1 })).rejects.toMatchObject({ code: 'INVALID_SETTINGS' })
    const { matchId } = await api.startSolo({ questionCount: 2 })
    for (let i = 0; i < 2; i += 1) {
      const round = (await api.current(matchId)).round!
      const right = round.options.find((option) => option.word === answerOf(round.meaning))!
      await api.answer(matchId, round.roundId, { requestId: `c${i}`, optionId: right.optionId })
      advance(2500)
    }
    const result = await api.result(matchId)
    expect(result).toMatchObject({ endReason: 'ALL_ROUNDS_COMPLETED', correctCount: 2, livesRemaining: 4, totalScore: 400 })
  })
})
