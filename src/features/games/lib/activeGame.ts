import { HttpError } from '@/lib/httpClient'
import type { ActiveGame } from '../types/game'
import { playPath, setupPath, toGameType } from './gameRoutes'

export const ACTIVE_GAME_EXISTS = 'ACTIVE_GAME_EXISTS'

export function isActiveGameConflict(reason: unknown) {
  return reason instanceof HttpError && reason.code === ACTIVE_GAME_EXISTS
}

/** A running match reopens gameplay (or the spectator ranking); a waiting room reopens its lobby. */
export function activeGamePath(game: ActiveGame) {
  const gameType = toGameType(game.gameType)
  if (game.matchId) return playPath(gameType, game.matchId)
  if (gameType === 'ROCKET' && game.playerMode === 'SOLO') return setupPath(gameType, 'SOLO')
  return `/games/rooms/${game.roomId}`
}
