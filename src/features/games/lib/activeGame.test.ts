import { describe, expect, it } from 'vitest'
import type { ActiveGame } from '../types/game'
import { activeGamePath } from './activeGame'

const base: ActiveGame = {
  roomId: 'room-1',
  roomCode: 'ABC123',
  playerMode: 'SOLO',
  roomStatus: 'IN_MATCH',
  matchId: 'match-1',
  playerStatus: 'ACTIVE',
}

describe('activeGamePath', () => {
  it('reopens the game the active room belongs to', () => {
    expect(activeGamePath({ ...base, gameType: 'ROCKET' })).toBe('/games/rocket/match-1')
    expect(activeGamePath({ ...base, gameType: 'ROCKET', matchId: null, roomStatus: 'WAITING' })).toBe('/games/rocket')
    expect(
      activeGamePath({ ...base, gameType: 'ROCKET', playerMode: 'MULTIPLAYER', matchId: null, roomStatus: 'WAITING' }),
    ).toBe('/games/rooms/room-1')
    expect(activeGamePath({ ...base, gameType: 'WORDLY' })).toBe('/games/matches/match-1/play')
    expect(activeGamePath({ ...base, matchId: null, roomStatus: 'WAITING' })).toBe('/games/rooms/room-1')
  })
})
