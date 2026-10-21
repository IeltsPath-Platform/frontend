export type PlayerMode = 'SOLO' | 'MULTIPLAYER'
export type PlayMode = 'FINITE' | 'ENDLESS'
export type LetterStatus = 'CORRECT' | 'PRESENT' | 'ABSENT'

export type RoomSettings = {
  initialLives: number
  wordTimeLimitSeconds: number | null
  playMode: PlayMode
  wordLimit: number | null
  timeEnabled: boolean
}

export type CreateRoomInput = {
  playerMode: PlayerMode
  initialLives: number
  playMode: PlayMode
  wordLimit: number | null
  timeEnabled: boolean
}

export type UpdateRoomSettingsInput = Pick<
  RoomSettings,
  'initialLives' | 'wordLimit' | 'timeEnabled'
>

export type GameRoomMember = {
  userId: string
  role: string
  status: string
  joinedAt: string
  slotNumber: number | null
  displayName: string | null
}

export type GameRoom = {
  id: string
  roomCode: string
  hostUserId: string
  gameType: string
  learningDomain: string
  mode: string
  maxPlayers: number
  status: string
  createdAt: string
  members: GameRoomMember[]
  items: unknown[]
  playerMode: PlayerMode
  settings: RoomSettings | null
  canStart: boolean
  activeMatchId: string | null
  message: string | null
}

export type GameCatalog = {
  games: {
    gameType: string
    name: string
    description: string
    status: string
  }[]
}

export type GameMatch = {
  matchId: string
  roomId: string
  sessionId: string | null
  status: string
  startedAt: string
  players: {
    userId: string
    score: number
    rank: number | null
    status: string
  }[]
  playerMode: PlayerMode | null
  settings: RoomSettings | null
  ownPlayer: RankingPlayer | null
  ranking: GameRanking | null
}

export type RankingPlayer = {
  userId: string
  displayName: string | null
  slotNumber: number | null
  rank: number
  status: string
  livesRemaining: number
  totalScore: number
  totalSolveTimeMs: number
  wordsProcessed: number
  wordsSolved: number
  currentStreak: number
  /** Set only while a DISCONNECTED player is inside the 30 s reconnect grace. */
  reconnectDeadlineAt?: string | null
}
export type GameRanking = {
  matchId: string
  status: string
  playerMode: PlayerMode
  isFinal: boolean
  serverTime: string
  players: RankingPlayer[]
}
export type GameEvent = {
  type: string
  matchId?: string
  room?: GameRoom
  match?: GameMatch
  ranking?: GameRanking
  message?: string
  userId?: string
}

export type WordPlayer = {
  status: string
  livesRemaining: number
  totalScore: number
  currentStreak: number
  bestStreak: number
}

export type HintResponse = {
  playerWordId: string
  sourceGuess: string
  sourceLetters: LetterStatus[]
  revealedCell: { column: number; letter: string; status: LetterStatus }
  hintUsed: boolean
}

export type CurrentWord = {
  playerWordId: string
  wordNumber: number
  wordLimit: number | null
  meaning: string
  columns: number
  maxAttempts: number
  attemptsUsed: number
  timeEnabled: boolean
  deadlineAt: string | null
  wordStatus: string
  player: WordPlayer
  guesses: { attemptNumber: number; guess: string; letters: LetterStatus[] }[]
  keyboard: Record<string, LetterStatus>
  hint: HintResponse | null
}

export type GuessInput = {
  requestId: string
  playerWordId: string
  guess: string
}

export type GuessResponse = {
  requestId: string
  playerWordId: string
  guess: string
  letters: LetterStatus[]
  keyboard: Record<string, LetterStatus>
  attemptsUsed: number
  maxAttempts: number
  wordStatus: string
  points: { base: number; bonus: number; total: number }
  player: WordPlayer
  nextWord: CurrentWord | null
  matchFinished: boolean
  endReason: string | null
}

export type PendingGuessResponse = {
  status: 202
  code: 'REQUEST_PENDING'
  message: string
  timestamp: string
  error: string
  path: string
  details: null
}

export type GameResult = {
  matchId: string
  gameType: 'WORDLY'
  playerMode: PlayerMode
  players?: RankingPlayer[]
  status: 'COMPLETED'
  endReason: string | null
  settings: RoomSettings
  player: {
    userId: string
    displayName: string | null
    status: string
    livesRemaining: number
    wordsProcessed: number
    wordsSolved: number
    wordsFailed: number
    wordsTimedOut: number
    bestStreak: number
    baseScore: number
    bonusScore: number
    totalScore: number
    totalSolveTimeMs: number
  }
  startedAt: string
  endedAt: string
  durationMs: number
}

export type LeaveMatchResponse = {
  matchId: string
  status: string
  endReason: string
  playerStatus: string
  totalScore: number
  resultAvailable: boolean
}

export type GameTicket = {
  ticket: string
  expiresAt: string
  subprotocols: string[]
}

/** The Wordly room or match the user still belongs to. */
export type ActiveGame = {
  roomId: string
  roomCode: string
  playerMode: PlayerMode
  roomStatus: 'WAITING' | 'IN_MATCH'
  matchId: string | null
  playerStatus: string | null
}
