import type {
  RocketAnswerAck,
  RocketApi,
  RocketCurrent,
  RocketEndReason,
  RocketOption,
  RocketResult,
  RocketRound,
  RocketRoundResult,
  RocketSoloSettings,
} from '../types/rocket'

/** In-browser stand-in for game-service until the Rocket API exists. Mirrors the server rules in the plan. */

export const MOCK_WORD_BANK: ReadonlyArray<{ word: string; meaning: string }> = [
  { word: 'actor', meaning: 'Diễn viên (nam)' },
  { word: 'driver', meaning: 'Tài xế' },
  { word: 'career', meaning: 'Sự nghiệp' },
  { word: 'teacher', meaning: 'Giáo viên' },
  { word: 'doctor', meaning: 'Bác sĩ' },
  { word: 'journey', meaning: 'Hành trình' },
  { word: 'library', meaning: 'Thư viện' },
  { word: 'weather', meaning: 'Thời tiết' },
  { word: 'achieve', meaning: 'Đạt được' },
  { word: 'improve', meaning: 'Cải thiện' },
]

export const MOCK_DEFAULTS = { initialLives: 4, secondsPerQuestion: 15 } as const
const REVEAL_MS = 2500
const BASE_POINTS = 100
const SPEED_POINTS = 100
const LATENCY_MS = 180
const STORAGE_KEY = 'rocket-mock-matches'

type MockRound = {
  roundId: string
  meaning: string
  options: RocketOption[]
  correctOptionId: string
  status: 'PENDING' | 'OPEN' | 'CLOSED'
  opensAt: number | null
  deadlineAt: number | null
  chosenOptionId: string | null
  requestId: string | null
  result: RocketRoundResult | null
}

type MockMatch = {
  matchId: string
  settings: RocketSoloSettings
  rounds: MockRound[]
  lives: number
  score: number
  status: 'ACTIVE' | 'ELIMINATED' | 'FINISHED' | 'FORFEITED'
  endReason: RocketEndReason | null
  startedAt: number
  endedAt: number | null
  nextRoundAt: number | null
}

export class MockRocketError extends Error {
  readonly status: number
  readonly code: string

  constructor(status: number, code: string, message: string) {
    super(message)
    this.name = 'MockRocketError'
    this.status = status
    this.code = code
  }
}

function shuffle<T>(items: readonly T[], random: () => number): T[] {
  const copy = [...items]
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(random() * (i + 1))
    ;[copy[i], copy[j]] = [copy[j], copy[i]]
  }
  return copy
}

export function speedPoints(remainingMs: number, limitMs: number) {
  const ratio = Math.min(1, Math.max(0, remainingMs / limitMs))
  return BASE_POINTS + Math.floor(SPEED_POINTS * ratio)
}

type Options = {
  now?: () => number
  random?: () => number
  latencyMs?: number
  storage?: Pick<Storage, 'getItem' | 'setItem'> | null
}

export function createMockRocketApi(options: Options = {}): RocketApi {
  const now = options.now ?? (() => Date.now())
  const random = options.random ?? Math.random
  const latency = options.latencyMs ?? LATENCY_MS
  const storage = options.storage === undefined ? safeSession() : options.storage
  const matches = new Map<string, MockMatch>(load(storage))
  let sequence = 0

  const id = (prefix: string) => {
    sequence += 1
    return `${prefix}-${now().toString(36)}-${sequence}-${Math.floor(random() * 1e6).toString(36)}`
  }
  const delay = <T,>(value: () => T, signal?: AbortSignal) =>
    new Promise<T>((resolve, reject) => {
      const timer = setTimeout(() => {
        try {
          resolve(value())
        } catch (error) {
          reject(error)
        }
      }, latency)
      signal?.addEventListener('abort', () => {
        clearTimeout(timer)
        reject(new DOMException('Aborted', 'AbortError'))
      })
    })
  const save = () => {
    try {
      storage?.setItem(STORAGE_KEY, JSON.stringify([...matches.entries()]))
    } catch {
      // Session storage is a convenience for reloads only.
    }
  }
  const find = (matchId: string) => {
    const match = matches.get(matchId)
    if (!match) throw new MockRocketError(404, 'MATCH_NOT_FOUND', 'Không tìm thấy lượt chơi.')
    return match
  }

  function finish(match: MockMatch, reason: RocketEndReason, at: number) {
    match.endReason = reason
    match.endedAt = at
    match.nextRoundAt = null
    if (match.status === 'ACTIVE') match.status = 'FINISHED'
  }

  function openRound(match: MockMatch, round: MockRound, at: number) {
    round.status = 'OPEN'
    round.opensAt = at
    round.deadlineAt = at + match.settings.secondsPerQuestion * 1000
  }

  function closeRound(match: MockMatch, round: MockRound, chosen: string | null, at: number) {
    const correct = chosen === round.correctOptionId
    const limit = match.settings.secondsPerQuestion * 1000
    const points = correct ? speedPoints((round.deadlineAt ?? at) - at, limit) : 0
    if (correct) match.score += points
    else match.lives = Math.max(0, match.lives - 1)
    round.status = 'CLOSED'
    round.chosenOptionId = chosen

    const index = match.rounds.indexOf(round)
    if (match.lives === 0) {
      match.status = 'ELIMINATED'
      finish(match, 'NO_LIVES_LEFT', at)
    } else if (index === match.rounds.length - 1) {
      finish(match, 'ALL_ROUNDS_COMPLETED', at)
    } else {
      match.nextRoundAt = at + REVEAL_MS
    }
    round.result = {
      roundId: round.roundId,
      correctOptionId: round.correctOptionId,
      chosenOptionId: chosen,
      correct,
      points,
      livesRemaining: match.lives,
      totalScore: match.score,
      status: match.status,
      nextRoundAt: match.nextRoundAt ? new Date(match.nextRoundAt).toISOString() : null,
      matchFinished: match.endReason !== null,
      endReason: match.endReason,
    }
    return round.result
  }

  /** What the server's round worker would have done by `at`: close expired rounds, open due ones. */
  function settle(match: MockMatch, at: number) {
    if (match.endReason) return
    const open = match.rounds.find((round) => round.status === 'OPEN')
    if (open && open.deadlineAt !== null && at >= open.deadlineAt) {
      closeRound(match, open, null, open.deadlineAt)
    }
    if (match.endReason) return
    if (!match.rounds.some((round) => round.status === 'OPEN') && match.nextRoundAt !== null && at >= match.nextRoundAt) {
      const next = match.rounds.find((round) => round.status === 'PENDING')
      if (next) openRound(match, next, at)
      match.nextRoundAt = null
    }
  }

  function toRound(match: MockMatch, round: MockRound, at: number): RocketRound {
    const index = match.rounds.indexOf(round)
    // Like the server: a round in its reveal pause has a scheduled opening and no deadline yet.
    const opensAt = round.opensAt ?? match.nextRoundAt
    return {
      roundId: round.roundId,
      number: index + 1,
      total: match.rounds.length,
      meaning: round.meaning,
      options: round.options,
      opensAt: opensAt === null ? null : new Date(opensAt).toISOString(),
      deadlineAt: round.deadlineAt === null ? null : new Date(round.deadlineAt).toISOString(),
      serverTime: new Date(at).toISOString(),
      me: { answered: round.chosenOptionId !== null, optionId: round.chosenOptionId },
      player: { livesRemaining: match.lives, totalScore: match.score, status: match.status },
    }
  }

  return {
    startSolo: ({ questionCount }) =>
      delay(() => {
        const count = Math.round(questionCount)
        if (!Number.isFinite(count) || count < 1 || count > MOCK_WORD_BANK.length) {
          throw new MockRocketError(400, 'INVALID_SETTINGS', `Số từ phải từ 1 đến ${MOCK_WORD_BANK.length}.`)
        }
        const at = now()
        const picked = shuffle(MOCK_WORD_BANK, random).slice(0, count)
        const rounds: MockRound[] = picked.map((entry) => {
          const distractors = shuffle(
            MOCK_WORD_BANK.filter((other) => other.word !== entry.word && other.meaning !== entry.meaning),
            random,
          ).slice(0, 2)
          const options = shuffle([entry, ...distractors], random).map((item) => ({
            optionId: id('opt'),
            word: item.word,
          }))
          return {
            roundId: id('round'),
            meaning: entry.meaning,
            options,
            correctOptionId: options.find((option) => option.word === entry.word)!.optionId,
            status: 'PENDING',
            opensAt: null,
            deadlineAt: null,
            chosenOptionId: null,
            requestId: null,
            result: null,
          }
        })
        const match: MockMatch = {
          matchId: id('match'),
          settings: { questionCount: count, ...MOCK_DEFAULTS },
          rounds,
          lives: MOCK_DEFAULTS.initialLives,
          score: 0,
          status: 'ACTIVE',
          endReason: null,
          startedAt: at,
          endedAt: null,
          nextRoundAt: null,
        }
        openRound(match, rounds[0], at)
        matches.set(match.matchId, match)
        save()
        return { matchId: match.matchId }
      }),

    current: (matchId, signal) =>
      delay((): RocketCurrent => {
        const match = find(matchId)
        const at = now()
        settle(match, at)
        save()
        const closed = match.rounds.filter((round) => round.status === 'CLOSED')
        const upcoming =
          match.rounds.find((round) => round.status === 'OPEN') ??
          (match.endReason ? undefined : match.rounds.find((round) => round.status === 'PENDING'))
        return {
          matchId,
          settings: match.settings,
          round: upcoming ? toRound(match, upcoming, at) : null,
          lastRoundResult: closed.at(-1)?.result ?? null,
          matchFinished: match.endReason !== null,
          serverTime: new Date(at).toISOString(),
        }
      }, signal),

    answer: (matchId, roundId, body) =>
      delay((): RocketAnswerAck => {
        const match = find(matchId)
        const round = match.rounds.find((item) => item.roundId === roundId)
        if (!round) throw new MockRocketError(404, 'ROUND_NOT_FOUND', 'Không tìm thấy câu hỏi.')
        if (round.requestId === body.requestId && round.result) {
          return { ...body, roundId, receivedAt: new Date(now()).toISOString(), roundResult: round.result }
        }
        const at = now()
        if (match.endReason) throw new MockRocketError(409, 'MATCH_FINISHED', 'Lượt chơi đã kết thúc.')
        if (round.status !== 'OPEN' || (round.deadlineAt !== null && at >= round.deadlineAt)) {
          settle(match, at)
          save()
          throw new MockRocketError(409, 'ROUND_CLOSED', 'Đã hết thời gian cho câu này.')
        }
        if (!round.options.some((option) => option.optionId === body.optionId)) {
          throw new MockRocketError(400, 'INVALID_OPTION', 'Lựa chọn không hợp lệ.')
        }
        round.requestId = body.requestId
        const roundResult = closeRound(match, round, body.optionId, at)
        save()
        return { ...body, roundId, receivedAt: new Date(at).toISOString(), roundResult }
      }),

    leave: (matchId) =>
      delay(() => {
        const match = find(matchId)
        const at = now()
        settle(match, at)
        if (!match.endReason) {
          match.status = 'FORFEITED'
          finish(match, 'PLAYER_LEFT', at)
        }
        save()
      }),

    result: (matchId, signal) =>
      delay((): RocketResult => {
        const match = find(matchId)
        settle(match, now())
        save()
        if (!match.endReason || match.endedAt === null) {
          throw new MockRocketError(409, 'MATCH_NOT_FINISHED', 'Lượt chơi chưa kết thúc.')
        }
        const closed = match.rounds.filter((round) => round.status === 'CLOSED')
        return {
          matchId,
          endReason: match.endReason,
          settings: match.settings,
          totalRounds: match.rounds.length,
          answered: closed.length,
          correctCount: closed.filter((round) => round.result?.correct).length,
          livesRemaining: match.lives,
          totalScore: match.score,
          playerStatus: match.status,
          durationMs: match.endedAt - match.startedAt,
          startedAt: new Date(match.startedAt).toISOString(),
          endedAt: new Date(match.endedAt).toISOString(),
        }
      }, signal),

    // The mock only plays solo: no room socket and no ranking.
    match: (matchId, signal) =>
      delay(() => {
        find(matchId)
        return { roomId: null, playerMode: 'SOLO' as const, ownUserId: null, ranking: null }
      }, signal),

    ranking: (_matchId, signal) =>
      delay(() => {
        throw new MockRocketError(404, 'NOT_FOUND', 'Chơi thử không có bảng xếp hạng.')
      }, signal),
  }
}

function safeSession(): Pick<Storage, 'getItem' | 'setItem'> | null {
  try {
    return typeof window === 'undefined' ? null : window.sessionStorage
  } catch {
    return null
  }
}

function load(storage: Pick<Storage, 'getItem'> | null): Array<[string, MockMatch]> {
  try {
    const raw = storage?.getItem(STORAGE_KEY)
    const parsed: unknown = raw ? JSON.parse(raw) : []
    return Array.isArray(parsed) ? (parsed as Array<[string, MockMatch]>) : []
  } catch {
    return []
  }
}
