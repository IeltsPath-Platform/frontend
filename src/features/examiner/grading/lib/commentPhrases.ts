import type { CriterionKey } from '@/features/admin/examiner-review/types'

/**
 * Sentences an examiner often writes, one click each, so a comment is mostly picked and then edited rather than typed from
 * nothing. They only fill the box: the examiner reads and changes them like any text they wrote.
 */
export const CRITERION_PHRASES: Record<CriterionKey, readonly string[]> = {
  taskResponse: [
    'Trả lời đủ các yêu cầu của đề bài.',
    'Các ý chính chưa được phát triển đầy đủ.',
    'Phần Overview chưa rõ, cần nêu xu hướng chung.',
    'Số liệu hoặc ví dụ minh họa chưa đủ cụ thể.',
  ],
  coherence: [
    'Bố cục rõ ràng, mỗi đoạn có một ý chính.',
    'Từ nối dùng đúng nhưng hơi máy móc.',
    'Cần liên kết ý giữa các câu mạch lạc hơn.',
    'Cách chia đoạn chưa hợp lý.',
  ],
  lexical: [
    'Vốn từ khá đa dạng và dùng chính xác.',
    'Lặp từ nhiều, nên dùng từ đồng nghĩa.',
    'Còn lỗi chính tả hoặc dùng sai từ.',
    'Cần thêm collocation tự nhiên.',
  ],
  grammar: [
    'Dùng được nhiều cấu trúc câu phức.',
    'Còn lỗi chia động từ và thì.',
    'Hay sai mạo từ và số ít, số nhiều.',
    'Câu quá dài, thiếu dấu câu, nên tách câu.',
  ],
}

/** What each criterion looks at, in a few words under its name, so the examiner never has to guess which box is which. */
export const CRITERION_HINTS: Record<CriterionKey, string> = {
  taskResponse: 'Trả lời đủ đề, phát triển ý, có Overview',
  coherence: 'Bố cục, liên kết ý, chia đoạn',
  lexical: 'Vốn từ, độ chính xác, collocation',
  grammar: 'Cấu trúc câu, độ chính xác ngữ pháp',
}

export const OVERALL_PHRASES: readonly string[] = [
  'Bài viết đạt yêu cầu cơ bản của đề.',
  'Điểm mạnh: bố cục rõ và có số liệu minh họa.',
  'Ưu tiên cải thiện: phát triển ý và độ chính xác ngữ pháp.',
  'Nên luyện thêm cách viết Overview và dùng từ nối tự nhiên.',
]

/** Adds a sentence after what is already written, separated by a space, never glued to the last word. */
export function withPhrase(text: string, phrase: string) {
  const trimmed = text.replace(/\s+$/, '')
  if (trimmed.includes(phrase)) return text
  return trimmed === '' ? phrase : `${trimmed} ${phrase}`
}
