import type { PlayerMode } from '../types/game'

/** Game types served by the shared rooms; anything else is treated as Wordly, the first game. */
export type GameType = 'WORDLY' | 'ROCKET'

export function toGameType(value: string | null | undefined): GameType {
  return value === 'ROCKET' ? 'ROCKET' : 'WORDLY'
}

export const gameName: Record<GameType, string> = {
  WORDLY: 'Wordly',
  ROCKET: 'Tên lửa',
}

/** Rocket solo starts from its own full-screen setup card; multiplayer sets up a room like Wordly. */
export function setupPath(gameType: GameType, mode: PlayerMode) {
  if (gameType === 'ROCKET')
    return mode === 'SOLO' ? '/games/rocket' : '/games/rocket/setup?mode=MULTIPLAYER'
  return `/games/wordly/setup?mode=${mode}`
}

export function playPath(gameType: GameType, matchId: string) {
  return gameType === 'ROCKET'
    ? `/games/rocket/${encodeURIComponent(matchId)}`
    : `/games/matches/${matchId}/play`
}

/** Rocket shows its result on the play screen once the match has ended. */
export function resultPath(gameType: GameType, matchId: string) {
  return gameType === 'ROCKET'
    ? `/games/rocket/${encodeURIComponent(matchId)}`
    : `/games/matches/${matchId}/result`
}
