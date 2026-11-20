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
    : `Số câu phải là số nguyên từ ${ROCKET_QUESTION_RANGE.min} đến ${ROCKET_QUESTION_RANGE.max}.`
}

/** Error text for the number of words of a limited solo or room game, or null when it is valid (5 or more). */
export function wordLimitError(wordLimit: number | null) {
  if (wordLimit !== null && wordLimit > 2147483647) return 'Số từ vượt quá giới hạn cho phép.'
  return Number.isInteger(wordLimit) && (wordLimit ?? 0) >= 5 ? null : 'Số từ phải là số nguyên từ 5 trở lên.'
}
