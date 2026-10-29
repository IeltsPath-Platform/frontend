import { adminErrorCode, adminErrorDetails } from '../../lib/adminErrors'
import { aiDraftError } from '../../ai-drafts/lib/aiDraftLabels'
import type { CoursePartOfSpeech } from '../types'

const LABELS: Record<string, string> = {
  PREREQUISITE_ORDER: 'Kiến thức nền phải được dạy ở bài trước', KNOWLEDGE_POINT_UNKNOWN: 'Không tìm thấy điểm kiến thức',
  KNOWLEDGE_POINT_INACTIVE: 'Điểm kiến thức chưa hoạt động', QUESTION_REF_UNKNOWN: 'Không tìm thấy câu hỏi tham chiếu',
  QUESTION_ALREADY_OWNED: 'Câu hỏi đã thuộc bài học hoặc gói khác', QUESTION_REUSED: 'Câu hỏi bị dùng ở nhiều chỗ trong bản nháp',
  PACKAGE_UNKNOWN: 'Không tìm thấy gói bài', PACKAGE_NOT_PUBLISHED: 'Gói bài chưa xuất bản', PACKAGE_WRONG_TYPE: 'Gói bài không đúng loại',
  PACKAGE_ALREADY_LINKED: 'Gói bài đã được gắn hoặc chọn nhiều lần', CODE_TAKEN: 'Mã đã được sử dụng', BAND_TAKEN: 'Band đã có khóa học',
  TOPIC_SORT_ORDER_TAKEN: 'Thứ tự chủ đề đã được sử dụng', KP_NOT_COVERED: 'Chưa dạy điểm kiến thức cần có',
  NO_PRACTICE_SET: 'Thiếu bộ luyện tập', FEW_PRACTICE_SETS: 'Chưa đủ ba bộ luyện tập', NO_EXERCISE_QUESTION: 'Thiếu câu hỏi luyện tập',
  HALLUCINATED_REFERENCE: 'Đã bỏ tham chiếu ngoài kho', DUPLICATE_REFERENCE: 'Đã bỏ tham chiếu lặp',
  EMPTY_LESSON_DROPPED: 'Đã bỏ bài học rỗng', EMPTY_TOPIC_DROPPED: 'Đã bỏ chủ đề rỗng',
  VOCABULARY_INVALID: 'Đã bỏ từ vựng thiếu thông tin hoặc sai loại từ',
  VOCABULARY_SENSE_UNAVAILABLE: 'Nghĩa từ vựng đã chọn không còn khả dụng', VOCABULARY_REJECTED: 'Thư viện từ vựng từ chối từ mới',
  COURSE_MISSING: 'Chưa có thông tin khóa học', TOPIC_MISSING: 'Chưa có chủ đề',
  REQUIRED: 'Chưa điền thông tin', TOO_LONG: 'Vượt độ dài cho phép', TOO_MANY: 'Vượt số lượng cho phép',
  INVALID_VALUE: 'Giá trị không hợp lệ', DUPLICATE: 'Mã bị trùng trong bản nháp',
}
export const PART_OF_SPEECH_LABELS: Record<CoursePartOfSpeech, string> = {
  NOUN: 'Danh từ', VERB: 'Động từ', ADJECTIVE: 'Tính từ', ADVERB: 'Trạng từ', PREPOSITION: 'Giới từ', CONJUNCTION: 'Liên từ',
  IDIOM: 'Thành ngữ', PHRASAL_VERB: 'Cụm động từ',
}
export function courseIssueLabel(code: string) { return LABELS[code] ?? `Không đạt kiểm tra (${code})` }
export function courseDraftError(reason: unknown) {
  const code = adminErrorCode(reason)
  const details = adminErrorDetails(reason)
  const issues = code === 'CODE_CONFLICT' ? details.conflicts : code === 'INVALID_COURSE_DRAFT' ? details.issues : details.errors
  if (Array.isArray(issues)) {
    const messages = issues.filter((issue): issue is Record<string, unknown> => !!issue && typeof issue === 'object').map((issue) => {
      const label = courseIssueLabel(String(issue.code ?? issue.problem ?? 'INVALID_VALUE'))
      return [label, issue.subject, issue.related, issue.path].filter((value) => typeof value === 'string' && value.length).join(' · ')
    })
    if (messages.length) return messages.join('\n')
  }
  return aiDraftError(reason)
}
