import type { GameRanking, PlayerMode } from '../../types/game'

/** Shapes follow backend docs/contracts/rocket-game-v1.md (round model shared by solo and multiplayer). */

export type RocketPlayerStatus = 'ACTIVE' | 'DISCONNECTED' | 'ELIMINATED' | 'FINISHED' | 'FORFEITED'

export type RocketEndReason =
  | 'ALL_ROUNDS_COMPLETED'
  | 'NO_LIVES_LEFT'
  | 'PLAYER_LEFT'
  | 'LAST_PLAYER_STANDING'
  | 'ALL_ELIMINATED'
  | 'ALL_PLAYERS_LEFT'

export type RocketSoloSettings = {
  questionCount: number
  initialLives: number
  secondsPerQuestion: number
}

export type RocketOption = {
  optionId: string
  word: string
}

export type RocketPlayer = {
  livesRemaining: number
  totalScore: number
  status: RocketPlayerStatus
}

export type RocketRound = {
  roundId: string
  number: number
  total: number
  meaning: string
  options: RocketOption[]
  /** Scheduled opening of a round still in its reveal pause, or when an open round opened. */
  opensAt: string | null
  /** Null until the round opens; fetch the round again at `opensAt`. */
  deadlineAt: string | null
  serverTime: string
  me: { answered: boolean; optionId: string | null }
  player: RocketPlayer
}

export type RocketRoundResult = {
  roundId: string
  correctOptionId: string
  chosenOptionId: string | null
  correct: boolean
  points: number
  livesRemaining: number
  totalScore: number
  status: RocketPlayerStatus
  nextRoundAt: string | null
  matchFinished: boolean
  endReason: RocketEndReason | null
}

export type RocketCurrent = {
  matchId: string
  settings: RocketSoloSettings
  /** Open round, or the next one when `opensAt` is still in the future; null after the match ends. */
  round: RocketRound | null
  /** Result of the most recently closed round, used after a timeout or reload. */
  lastRoundResult: RocketRoundResult | null
  matchFinished: boolean
  serverTime: string
}

export type RocketAnswerInput = {
  requestId: string
  optionId: string
}

export type RocketAnswerAck = {
  requestId: string
  roundId: string
  optionId: string
  receivedAt: string
  /** Present when this answer closed the round; always the case in solo play. */
  roundResult: RocketRoundResult | null
}

export type RocketResult = {
  matchId: string
  endReason: RocketEndReason
  settings: RocketSoloSettings
  totalRounds: number
  answered: number
  correctCount: number
  livesRemaining: number
  totalScore: number
  playerStatus: RocketPlayerStatus
  durationMs: number
  startedAt: string
  endedAt: string
}

/** Who plays the match: multiplayer matches listen to their room socket. */
export type RocketMatchInfo = {
  roomId: string | null
  playerMode: PlayerMode
  ownUserId: string | null
  ranking: GameRanking | null
}

/** One player's line in ROCKET_ROUND_RESULT; never sent before the round closes. */
export type RocketAnswerOutcome = {
  userId: string
  optionId: string | null
  correct: boolean
  points: number
  livesRemaining: number
  totalScore: number
  status: RocketPlayerStatus
}

/** Room socket events of a multiplayer match (backend contract, "WebSocket"). */
export type RocketEvent =
  | {
      type: 'ROCKET_ROUND_STARTED'
      matchId: string
      round: Pick<RocketRound, 'roundId' | 'number' | 'total' | 'meaning' | 'options' | 'opensAt' | 'deadlineAt'>
      serverTime: string
    }
  | { type: 'ROCKET_PLAYER_ANSWERED'; matchId: string; roundId: string; userId: string; answeredCount: number; aliveCount: number }
  | {
      type: 'ROCKET_ROUND_RESULT'
      matchId: string
      roundId: string
      correctOptionId: string
      answers: RocketAnswerOutcome[]
      ranking: GameRanking | null
      nextRoundAt: string | null
      matchFinished: boolean
      endReason: RocketEndReason | null
    }
  | { type: 'RANKING_UPDATED' | 'MEMBER_LEFT' | 'MATCH_FINISHED'; matchId?: string; ranking?: GameRanking; userId?: string }
  | { type: 'ROOM_CLOSED'; matchId?: string; message?: string }

export type RocketApi = {
  startSolo: (settings: Pick<RocketSoloSettings, 'questionCount'>) => Promise<{ matchId: string }>
  current: (matchId: string, signal?: AbortSignal) => Promise<RocketCurrent>
  answer: (matchId: string, roundId: string, body: RocketAnswerInput) => Promise<RocketAnswerAck>
  leave: (matchId: string) => Promise<void>
  result: (matchId: string, signal?: AbortSignal) => Promise<RocketResult>
  match: (matchId: string, signal?: AbortSignal) => Promise<RocketMatchInfo>
  ranking: (matchId: string, signal?: AbortSignal) => Promise<GameRanking>
}
