/** Shapes follow backend/plans/261021-rocket-game (round model shared by solo and multiplayer). */

export type RocketPlayerStatus = 'ACTIVE' | 'ELIMINATED' | 'FINISHED' | 'FORFEITED'

export type RocketEndReason = 'ALL_ROUNDS_COMPLETED' | 'NO_LIVES_LEFT' | 'PLAYER_LEFT'

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
  opensAt: string
  deadlineAt: string
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
  durationMs: number
  startedAt: string
  endedAt: string
}

export type RocketApi = {
  startSolo: (settings: Pick<RocketSoloSettings, 'questionCount'>) => Promise<{ matchId: string }>
  current: (matchId: string, signal?: AbortSignal) => Promise<RocketCurrent>
  answer: (matchId: string, roundId: string, body: RocketAnswerInput) => Promise<RocketAnswerAck>
  leave: (matchId: string) => Promise<void>
  result: (matchId: string, signal?: AbortSignal) => Promise<RocketResult>
}
