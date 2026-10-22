import { adminErrorCode, adminErrorDetails, adminErrorMessage } from '../../lib/adminErrors'

const ERROR_TEXT: Record<string, string> = {
  LESSON_NOT_PUBLISHABLE: 'Chưa xuất bản được bài học.',
  LESSON_EXERCISE_LOCKED:
    'Bài học đã xuất bản nên không đổi được bộ câu hỏi của block bài tập (học viên đã có tiến độ theo block). ' +
    'Muốn thay câu hỏi, hãy tạo block mới trong một bài ở trạng thái nháp.',
  LESSON_BLOCK_INVALID: 'Nội dung block chưa hợp lệ.',
  LESSON_SORT_CONFLICT: 'Thứ tự bị xung đột với thay đổi khác. Hãy tải lại trang rồi sắp xếp lại.',
}

export function lessonErrorText(reason: unknown): string {
  const code = adminErrorCode(reason)
  const known = code ? ERROR_TEXT[code] : undefined
  const detail = adminErrorMessage(reason)
  return known ? `${known}${detail && detail !== known ? ` (${detail})` : ''}` : detail
}

/** The safe reason codes of `details.issues` (`lesson-authoring-v1`), in words the author can act on. */
const ISSUE_TEXT: Record<string, string> = {
  LESSON_HAS_NO_ACTIVE_KP: 'Bài chưa gắn knowledge point nào đang hoạt động.',
  LESSON_HAS_NO_BLOCKS: 'Bài chưa có block nào.',
  TEXT_BLOCK_KP_INACTIVE: 'Một block bài giảng gắn knowledge point đã ngừng hoạt động.',
  EXERCISE_QUESTION_NOT_PUBLISHED: 'Có câu hỏi trong bài tập chưa được xuất bản.',
  EXERCISE_QUESTION_PURPOSE_INVALID: 'Có câu hỏi trong bài tập không dành cho bài học (purpose khác LEARNING).',
  EXERCISE_QUESTION_ALREADY_OWNED: 'Có câu hỏi đang thuộc bài học hoặc gói đề khác.',
  ESSAY_TASK_INVALID: 'Block bài viết chưa hợp lệ (thiếu Task, hoặc Task 1 thiếu dữ kiện biểu đồ hay ảnh).',
  VOCABULARY_SENSE_UNAVAILABLE: 'Có nghĩa từ vựng không còn tồn tại hoặc đã bị ẩn.',
}

function lineOf(item: unknown): string | null {
  if (typeof item === 'string') return ISSUE_TEXT[item] ?? item
  if (item && typeof item === 'object') {
    const record = item as Record<string, unknown>
    const message = record.message ?? record.reason ?? record.description
    if (typeof message === 'string') return message
    if (typeof record.code === 'string') return record.code
  }
  return null
}

/** The individual reasons a publish was refused: whichever list the server put in `details`. */
export function publishProblems(reason: unknown): string[] {
  const details = adminErrorDetails(reason)
  for (const key of ['problems', 'errors', 'issues', 'violations']) {
    const list = details[key]
    if (Array.isArray(list)) return list.map(lineOf).filter((line): line is string => line !== null)
  }
  return []
}
