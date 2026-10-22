import { apiRequest } from '@/lib/httpClient'
import type {
  ActiveGame,
  CreateRoomInput,
  CurrentWord,
  GameCatalog,
  GameMatch,
  GameResult,
  GameRoom,
  GameTicket,
  GameRanking,
  GuessInput,
  GuessResponse,
  HintResponse,
  LeaveMatchResponse,
  PendingGuessResponse,
  RocketRoomInput,
  UpdateRocketRoomSettingsInput,
  UpdateRoomSettingsInput,
} from '../types/game'

const roomPath = (id: string) => `/api/games/rooms/${encodeURIComponent(id)}`
const matchPath = (id: string) => `/api/games/matches/${encodeURIComponent(id)}`

export const gameApi = {
  catalog: (signal?: AbortSignal) =>
    apiRequest<GameCatalog>('/api/games/catalog', { auth: true, signal }),
  createRoom: (body: CreateRoomInput) =>
    apiRequest<GameRoom>('/api/games/wordly/rooms', {
      auth: true,
      method: 'POST',
      body,
    }),
  createRocketRoom: (body: RocketRoomInput) =>
    apiRequest<GameRoom>('/api/games/rocket/rooms', {
      auth: true,
      method: 'POST',
      body,
    }),
  /** null (204) when the user can create or join another room, in any game. */
  activeGame: (signal?: AbortSignal) =>
    apiRequest<ActiveGame | null>('/api/games/me/active-game', {
      auth: true,
      signal,
    }),
  leaveActiveGame: () =>
    apiRequest<null>('/api/games/me/active-game/leave', {
      auth: true,
      method: 'POST',
    }),
  room: (id: string, signal?: AbortSignal) =>
    apiRequest<GameRoom>(roomPath(id), { auth: true, signal }),
  join: (code: string) =>
    apiRequest<GameRoom>(
      `/api/games/rooms/code/${encodeURIComponent(code)}/join`,
      { auth: true, method: 'POST' },
    ),
  ready: (id: string, ready: boolean) =>
    apiRequest<GameRoom>(`${roomPath(id)}/ready`, {
      auth: true,
      method: 'POST',
      body: { ready },
    }),
  settings: (
    id: string,
    body: UpdateRoomSettingsInput | UpdateRocketRoomSettingsInput,
  ) =>
    apiRequest<GameRoom>(`${roomPath(id)}/settings`, {
      auth: true,
      method: 'PUT',
      body,
    }),
  leaveRoom: (id: string) =>
    apiRequest<GameRoom>(`${roomPath(id)}/leave`, {
      auth: true,
      method: 'POST',
    }),
  start: (id: string) =>
    apiRequest<GameMatch>(`${roomPath(id)}/start`, {
      auth: true,
      method: 'POST',
    }),
  kick: (id: string, userId: string) =>
    apiRequest<GameRoom>(
      `${roomPath(id)}/members/${encodeURIComponent(userId)}/kick`,
      { auth: true, method: 'POST' },
    ),
  ranking: (id: string, signal?: AbortSignal) =>
    apiRequest<GameRanking>(`${matchPath(id)}/ranking`, { auth: true, signal }),
  match: (id: string, signal?: AbortSignal) =>
    apiRequest<GameMatch>(matchPath(id), { auth: true, signal }),
  current: (id: string, signal?: AbortSignal) =>
    apiRequest<CurrentWord>(`${matchPath(id)}/words/current`, {
      auth: true,
      signal,
    }),
  guess: (id: string, body: GuessInput) =>
    apiRequest<GuessResponse | PendingGuessResponse>(
      `${matchPath(id)}/guesses`,
      { auth: true, method: 'POST', body },
    ),
  hint: (id: string, wordId: string, requestId: string) =>
    apiRequest<HintResponse>(
      `${matchPath(id)}/words/${encodeURIComponent(wordId)}/hint`,
      { auth: true, method: 'POST', body: { requestId } },
    ),
  leaveMatch: (id: string) =>
    apiRequest<LeaveMatchResponse>(`${matchPath(id)}/leave`, {
      auth: true,
      method: 'POST',
    }),
  result: (id: string, signal?: AbortSignal) =>
    apiRequest<GameResult>(`${matchPath(id)}/result`, { auth: true, signal }),
  ticket: (id: string) =>
    apiRequest<GameTicket>(`${roomPath(id)}/websocket-ticket`, {
      auth: true,
      method: 'POST',
    }),
}
