import { HttpError } from '@/lib/httpClient'
import { adminErrorCode, adminErrorMessage } from '../../lib/adminErrors'
import type { AiDraftStatus } from '../types'

export const DRAFT_STATUS_LABEL: Record<AiDraftStatus, string> = {
  QUEUED: 'Đang chờ', GENERATING: 'Đang sinh', READY: 'Chờ duyệt', FAILED: 'Lỗi', APPROVED: 'Đã duyệt', REJECTED: 'Đã từ chối',
}
export const REJECTED_REASON_LABEL: Record<string, string> = {
  NOT_AN_OBJECT: 'Dữ liệu câu hỏi không đúng định dạng', BAD_STEM: 'Nội dung câu hỏi thiếu hoặc vượt giới hạn',
  NO_EXPLANATION: 'Thiếu giải thích', BAD_OPTIONS: 'Các lựa chọn không hợp lệ', CORRECT_NOT_AN_OPTION: 'Đáp án đúng không thuộc các lựa chọn',
  DISTRACTOR_NOT_A_WRONG_OPTION: 'Phương án nhiễu không hợp lệ', UNKNOWN_ERROR_CODE: 'Mã lỗi của phương án nhiễu không còn hoạt động',
  NO_ACCEPTED_ANSWER: 'Chưa có đáp án được chấp nhận', DUPLICATE_STEM: 'Nội dung câu hỏi trùng với câu đã có trong kiến thức hoặc bản nháp',
}
const FAILURE_LABEL: Record<string, string> = {
  NOT_CONFIGURED: 'Chưa cấu hình mô hình AI', INVALID_REPLY: 'AI trả kết quả không hợp lệ', FAILED: 'Gọi AI thất bại',
  TIMEOUT: 'AI trả lời quá lâu, chưa kịp xong. Hãy thử lại hoặc chọn ít điểm kiến thức hơn.',
  UNSUPPORTED_KIND: 'Loại bản nháp chưa được hỗ trợ', INTERNAL: 'Không xử lý được yêu cầu. Hãy gửi yêu cầu mới.',
}
const HTTP_FAILURE = /^HTTP_(\d{3})$/
export function aiDraftFailure(code: string | null) {
  const status = code ? HTTP_FAILURE.exec(code)?.[1] : undefined
  if (status === '429') return 'Dịch vụ AI đang giới hạn lượt gọi (429). Đợi một lúc rồi thử lại.'
  if (status) return `Dịch vụ AI trả lỗi ${status}. Hãy thử lại sau.`
  return code ? FAILURE_LABEL[code] ?? 'Không tạo được nội dung. Hãy gửi yêu cầu mới.' : 'Không tạo được nội dung. Hãy gửi yêu cầu mới.'
}
export function aiDraftError(reason: unknown) {
  if (adminErrorCode(reason) === 'INVALID_DRAFT_ITEM' && reason instanceof HttpError) {
    const body = reason.body as { details?: { reason?: unknown } } | null
    const code = body?.details?.reason
    return typeof code === 'string' ? REJECTED_REASON_LABEL[code] ?? 'Câu hỏi chưa hợp lệ. Kiểm tra dữ liệu rồi lưu lại.' : 'Câu hỏi chưa hợp lệ. Kiểm tra dữ liệu rồi lưu lại.'
  }
  if (adminErrorCode(reason) === 'AI_QUOTA_EXCEEDED' || reason instanceof HttpError && reason.status === 429) return 'Bạn đã dùng hết lượt sinh hôm nay'
  if (adminErrorCode(reason) === 'UNKNOWN_ERROR_CODE') return REJECTED_REASON_LABEL.UNKNOWN_ERROR_CODE!
  if (reason instanceof HttpError && reason.status === 400) return 'Yêu cầu không hợp lệ. Kiểm tra dữ liệu và trạng thái bản nháp rồi thử lại.'
  if (reason instanceof HttpError && reason.status === 404) return 'Không tìm thấy bản nháp hoặc kiến thức được chọn.'
  return adminErrorMessage(reason)
}
export function draftLoadError(reason: unknown): never {
  if (reason instanceof HttpError) throw new HttpError(reason.status, aiDraftError(reason), reason.body, reason.code)
  throw reason
}
export function draftBadgeClass(status: AiDraftStatus) {
  if (status === 'FAILED') return 'adm-badge adm-badge--danger'
  if (status === 'APPROVED') return 'adm-badge adm-badge--ok'
  if (status === 'REJECTED') return 'adm-badge adm-badge--muted'
  return 'adm-badge adm-badge--warn'
}
export function draftIsRunning(status: AiDraftStatus) { return status === 'QUEUED' || status === 'GENERATING' }
