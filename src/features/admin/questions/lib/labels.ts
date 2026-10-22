import { adminErrorCode, adminErrorMessage } from '../../lib/adminErrors'

export const TYPE_LABEL: Record<string, string> = {
  MULTIPLE_CHOICE: 'Trắc nghiệm',
  FILL_IN_BLANK: 'Điền từ',
  MATCHING: 'Nối',
  TRUE_FALSE_NOT_GIVEN: 'True / False / Not Given',
  SHORT_ANSWER: 'Trả lời ngắn',
  ESSAY: 'Bài luận',
  SPEAKING: 'Speaking',
}

export const SKILL_LABEL: Record<string, string> = {
  LISTENING: 'Listening',
  READING: 'Reading',
  WRITING: 'Writing',
  SPEAKING: 'Speaking',
  ALL: 'Chung',
}

export const PURPOSE_LABEL: Record<string, string> = { LEARNING: 'Bài học', EXAM: 'Bài thi', PLACEMENT: 'Xếp lớp' }
export const STATUS_LABEL: Record<string, string> = { DRAFT: 'Nháp', PUBLISHED: 'Đã xuất bản', ARCHIVED: 'Đã lưu trữ' }
export const DIFFICULTY_LABEL: Record<string, string> = { EASY: 'Dễ', MEDIUM: 'Vừa', HARD: 'Khó' }

export function statusBadgeClass(status: string): string {
  if (status === 'PUBLISHED') return 'adm-badge adm-badge--ok'
  if (status === 'ARCHIVED') return 'adm-badge adm-badge--muted'
  return 'adm-badge adm-badge--warn'
}

const ERROR_TEXT: Record<string, string> = {
  QUESTION_VERSION_NOT_PUBLISHABLE: 'Phiên bản chưa đủ điều kiện xuất bản: kiểm tra đáp án và các trường bắt buộc.',
  DIFFICULTY_REQUIRED: 'Cần chọn độ khó trước khi xuất bản.',
  QUESTION_VERSION_STATE_INVALID: 'Trạng thái hiện tại của phiên bản không cho phép thao tác này. Hãy tải lại trang.',
  QUESTION_VERSION_IN_USE: 'Không thể lưu trữ: phiên bản đang được dùng trong bài học hoặc gói đề đã xuất bản.',
  UNKNOWN_ERROR_CODE: 'Có mã lỗi không nằm trong danh mục mã lỗi đang dùng.',
}

/** A readable sentence for a failed question call: the known `details.code` first, else the server message. */
export function questionErrorText(reason: unknown): string {
  const code = adminErrorCode(reason)
  const known = code ? ERROR_TEXT[code] : undefined
  const detail = adminErrorMessage(reason)
  return known ? `${known}${detail && detail !== known ? ` (${detail})` : ''}` : detail
}
