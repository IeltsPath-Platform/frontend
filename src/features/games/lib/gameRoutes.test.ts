import { describe, expect, it } from 'vitest'
import { playPath, resultPath, setupPath, toGameType } from './gameRoutes'

describe('gameRoutes', () => {
  it('keeps the Wordly URLs', () => {
    expect(setupPath('WORDLY', 'SOLO')).toBe('/games/wordly/setup?mode=SOLO')
    expect(setupPath('WORDLY', 'MULTIPLAYER')).toBe('/games/wordly/setup?mode=MULTIPLAYER')
    expect(playPath('WORDLY', 'm1')).toBe('/games/matches/m1/play')
    expect(resultPath('WORDLY', 'm1')).toBe('/games/matches/m1/result')
  })

  it('sends Rocket to its own screens', () => {
    expect(setupPath('ROCKET', 'SOLO')).toBe('/games/rocket')
    expect(setupPath('ROCKET', 'MULTIPLAYER')).toBe('/games/rocket/setup?mode=MULTIPLAYER')
    expect(playPath('ROCKET', 'm1')).toBe('/games/rocket/m1')
    expect(resultPath('ROCKET', 'm1')).toBe('/games/rocket/m1')
  })

  it('reads unknown game types as Wordly', () => {
    expect(toGameType('ROCKET')).toBe('ROCKET')
    expect(toGameType(undefined)).toBe('WORDLY')
  })
})
