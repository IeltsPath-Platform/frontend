export type UnderstandingLevel = 'UNKNOWN' | 'FAMILIAR' | 'LEARNING' | 'MASTERED'

export interface LevelConfig {
  key: UnderstandingLevel
  label: string
  shortLabel: string
  description: string
  color: string
  bgColor: string
  borderColor: string
  boxRange: string
}

export const UNDERSTANDING_LEVELS: Record<UnderstandingLevel, LevelConfig> = {
  UNKNOWN: {
    key: 'UNKNOWN',
    label: 'Chưa biết',
    shortLabel: 'Chưa biết',
    description: 'Từ vựng mới hoặc chưa ghi nhớ được nghĩa',
    color: '#c0362c',
    bgColor: '#fdf2f2',
    borderColor: '#fca5a5',
    boxRange: 'Hộp 1',
  },
  FAMILIAR: {
    key: 'FAMILIAR',
    label: 'Mới biết',
    shortLabel: 'Mới biết',
    description: 'Đã nhận biết được từ nhưng chưa thuộc hẳn',
    color: '#d97706',
    bgColor: '#fffbeb',
    borderColor: '#fcd34d',
    boxRange: 'Hộp 2',
  },
  LEARNING: {
    key: 'LEARNING',
    label: 'Đang học',
    shortLabel: 'Đang học',
    description: 'Đang trong quá trình ôn tập ngắt quãng',
    color: '#2563eb',
    bgColor: '#eff6ff',
    borderColor: '#93c5fd',
    boxRange: 'Hộp 3',
  },
  MASTERED: {
    key: 'MASTERED',
    label: 'Đã nhớ',
    shortLabel: 'Đã nhớ',
    description: 'Đã thành thạo và nhớ lâu dài',
    color: '#16a34a',
    bgColor: '#f0fdf4',
    borderColor: '#86efac',
    boxRange: 'Hộp 4–5',
  },
}

export const ALL_LEVELS: UnderstandingLevel[] = ['UNKNOWN', 'FAMILIAR', 'LEARNING', 'MASTERED']

export function getLevelConfig(level: UnderstandingLevel | null | undefined): LevelConfig {
  if (!level || !(level in UNDERSTANDING_LEVELS)) {
    return UNDERSTANDING_LEVELS.UNKNOWN
  }
  return UNDERSTANDING_LEVELS[level]
}

export function boxToUnderstandingLevel(box: number): UnderstandingLevel {
  if (box <= 1) return 'UNKNOWN'
  if (box === 2) return 'FAMILIAR'
  if (box === 3) return 'LEARNING'
  return 'MASTERED'
}

/** Formats next review timestamp to human friendly relative text (in Vietnamese) */
export function formatRelativeDue(nextReviewAt: string | null | undefined, now: Date = new Date()): {
  text: string
  isDue: boolean
  isToday: boolean
} {
  if (!nextReviewAt) {
    return { text: 'Cần ôn ngay', isDue: true, isToday: true }
  }

  const dueDate = new Date(nextReviewAt)
  const diffMs = dueDate.getTime() - now.getTime()

  if (diffMs <= 0) {
    return { text: 'Đến hạn ôn', isDue: true, isToday: true }
  }

  const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
  if (diffHours < 24) {
    return { text: `Ôn sau ${Math.max(1, diffHours)} giờ`, isDue: false, isToday: true }
  }
  const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24))
  if (diffDays <= 1) {
    return { text: 'Ôn vào ngày mai', isDue: false, isToday: false }
  }
  return { text: `Ôn sau ${diffDays} ngày`, isDue: false, isToday: false }
}

export function bandToCefr(band: number | null | undefined): string {
  if (band == null || isNaN(band) || band <= 0) return 'B1'
  if (band < 3.0) return 'A1'
  if (band <= 3.5) return 'A2'
  if (band <= 5.0) return 'B1'
  if (band <= 6.5) return 'B2'
  if (band <= 8.0) return 'C1'
  return 'C2'
}
