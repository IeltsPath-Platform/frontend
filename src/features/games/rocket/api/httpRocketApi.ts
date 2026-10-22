import { apiRequest } from '@/lib/httpClient'
import type { GameMatch, GameRoom } from '../../types/game'
import type { RocketAnswerAck, RocketApi, RocketCurrent, RocketResult } from '../types/rocket'

/** Routes from backend/plans/261021-rocket-game/plan.md §4; game-service has not shipped them yet. */

const matchPath = (id: string) => `/api/games/rocket/matches/${encodeURIComponent(id)}`
const roomPath = (id: string) => `/api/games/rooms/${encodeURIComponent(id)}`

export function createHttpRocketApi(): RocketApi {
  return {
    async startSolo({ questionCount }) {
      const room = await apiRequest<GameRoom>('/api/games/rocket/rooms', {
        auth: true,
        method: 'POST',
        body: { playerMode: 'SOLO', questionCount },
      })
      await apiRequest<GameRoom>(`${roomPath(room.id)}/ready`, { auth: true, method: 'POST', body: { ready: true } })
      const match = await apiRequest<GameMatch>(`${roomPath(room.id)}/start`, { auth: true, method: 'POST' })
      return { matchId: match.matchId }
    },
    current: (matchId, signal) =>
      apiRequest<RocketCurrent>(`${matchPath(matchId)}/rounds/current`, { auth: true, signal }),
    answer: (matchId, roundId, body) =>
      apiRequest<RocketAnswerAck>(`${matchPath(matchId)}/rounds/${encodeURIComponent(roundId)}/answers`, {
        auth: true,
        method: 'POST',
        body,
      }),
    leave: async (matchId) => {
      await apiRequest(`/api/games/matches/${encodeURIComponent(matchId)}/leave`, { auth: true, method: 'POST' })
    },
    result: (matchId, signal) =>
      apiRequest<RocketResult>(`/api/games/matches/${encodeURIComponent(matchId)}/result`, { auth: true, signal }),
  }
}
