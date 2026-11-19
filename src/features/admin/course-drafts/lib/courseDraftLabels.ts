import type { CoursePartOfSpeech } from '../types'

export const PART_OF_SPEECH_LABELS: Record<CoursePartOfSpeech, string> = {
  NOUN: 'Danh từ', VERB: 'Động từ', ADJECTIVE: 'Tính từ', ADVERB: 'Trạng từ', PREPOSITION: 'Giới từ', CONJUNCTION: 'Liên từ',
  IDIOM: 'Thành ngữ', PHRASAL_VERB: 'Cụm động từ',
}
