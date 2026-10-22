/** Multiplayer Rocket room limits from backend docs/contracts/rocket-game-v1.md. */
export type RocketRoomSettings = {
  questionCount: number | null
  initialLives: number
  secondsPerQuestion: number
}

export const ROCKET_ROOM_DEFAULTS: RocketRoomSettings = {
  questionCount: 10,
  initialLives: 4,
  secondsPerQuestion: 15,
}
export const ROCKET_QUESTION_RANGE = { min: 5, max: 20 } as const
export const ROCKET_SECONDS = [10, 15, 20] as const

/** Error text for a question count outside the multiplayer range, or null when it is valid. */
export function rocketQuestionCountError(count: number | null) {
  return Number.isInteger(count) &&
    (count ?? 0) >= ROCKET_QUESTION_RANGE.min &&
    (count ?? 0) <= ROCKET_QUESTION_RANGE.max
    ? null
    : `Vui lòng nhập số câu là số nguyên từ ${ROCKET_QUESTION_RANGE.min} đến ${ROCKET_QUESTION_RANGE.max}.`
}
