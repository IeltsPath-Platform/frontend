import { HttpError } from '@/lib/httpClient'
import type { ActiveGame } from '../types/game'

export const ACTIVE_GAME_EXISTS = 'ACTIVE_GAME_EXISTS'

export function isActiveGameConflict(reason: unknown) {
  return reason instanceof HttpError && reason.code === ACTIVE_GAME_EXISTS
}

/** A running match reopens gameplay (or the spectator ranking); a waiting room reopens its lobby. */
export function activeGamePath(game: ActiveGame) {
  if (game.gameType === 'ROCKET')
    return game.matchId ? `/games/rocket/${game.matchId}` : '/games/rocket'
  return game.matchId
    ? `/games/matches/${game.matchId}/play`
    : `/games/rooms/${game.roomId}`
}
