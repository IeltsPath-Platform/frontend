import { HttpError } from '@/lib/httpClient'
import { adminErrorCode, adminErrorMessage } from '../../lib/adminErrors'
import { importReportSchema } from '../types'

const LABELS: Record<string, string> = {
  NOT_XLSX: 'File không phải Excel .xlsx hoặc không có dữ liệu', MISSING_PART: 'Chưa gửi file Excel', FILE_TOO_LARGE: 'File lớn hơn 5 MB',
  IMPORT_QUOTA_EXCEEDED: 'Bạn đã dùng hết lượt nhập hôm nay', UNREADABLE_FILE: 'Không đọc được file', MACRO_NOT_ALLOWED: 'File có macro không được phép',
  TOO_MANY_ROWS: 'File vượt 2000 dòng dữ liệu', CELL_TOO_LONG: 'Một ô vượt 20000 ký tự', SHEET_MISSING: 'Thiếu trang tính', COLUMN_MISSING: 'Thiếu cột',
  TEMPLATE_VERSION_MISMATCH: 'Template đã cũ, tải template mới', FORMULA_NOT_ALLOWED: 'File có công thức, hãy dán giá trị',
  REQUIRED: 'Thiếu thông tin bắt buộc', TOO_LONG: 'Nội dung vượt giới hạn', INVALID_VALUE: 'Giá trị không hợp lệ', DUPLICATE: 'Giá trị bị trùng',
  CODE_CONFLICT: 'Mã, band hoặc thứ tự đã được sử dụng', UNKNOWN_REFERENCE: 'Tham chiếu không có trong file', UNKNOWN_KNOWLEDGE_POINT: 'Mã kiến thức không hoạt động',
  UNKNOWN_QUESTION_REF: 'Không tìm thấy câu hỏi tham chiếu', UNSUPPORTED_TYPE: 'Loại câu chưa hỗ trợ', NOT_ENOUGH_OPTIONS: 'Chưa đủ phương án',
  ANSWER_NOT_IN_OPTIONS: 'Đáp án không thuộc phương án', NO_ACCEPTED_ANSWER: 'Chưa có đáp án chấp nhận', NO_EXPLANATION: 'Thiếu giải thích',
  DIFFICULTY_REQUIRED: 'Thiếu độ khó', UNKNOWN_ERROR_CODE: 'Mã lỗi không được phép', PREREQUISITE_ORDER: 'Kiến thức nền phải ở bài trước',
  KP_NOT_COVERED: 'Thiếu kiến thức cần dạy', NO_PRACTICE_SET: 'Thiếu bộ luyện tập', FEW_PRACTICE_SETS: 'Chưa đủ bộ luyện tập', NO_EXERCISE_QUESTION: 'Thiếu câu hỏi luyện tập',
}
export function importIssueLabel(code: string) { return LABELS[code] ?? `Lỗi kiểm tra (${code})` }
export function importError(reason: unknown) { return LABELS[adminErrorCode(reason) ?? ''] ?? adminErrorMessage(reason) }
export function importFailureReport(reason: unknown) {
  if (!(reason instanceof HttpError) || reason.status !== 422) return null
  const details = reason.body && typeof reason.body === 'object' ? (reason.body as { details?: unknown }).details : null
  const parsed = importReportSchema.safeParse(details)
  return parsed.success ? parsed.data : null
}
