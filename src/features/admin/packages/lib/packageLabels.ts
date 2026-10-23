import { adminErrorCode, adminErrorMessage } from '../../lib/adminErrors'
import type { ContentPackage } from '../types'

export const PACKAGE_TYPE_LABEL: Record<ContentPackage['packageType'], string> = {
  MOCK_TEST: 'Thi thử', PLACEMENT_TEST: 'Kiểm tra đầu vào', PRACTICE_SET: 'Bộ luyện tập',
  PRACTICE_TEST: 'Đề luyện tập', QUIZ: 'Trắc nghiệm', LESSON: 'Bài học', TOPIC_TEST: 'Đề cuối chủ đề', COURSE_TEST: 'Đề cuối khóa',
}
export const PACKAGE_STATUS_LABEL = { DRAFT: 'Bản nháp', PUBLISHED: 'Đã xuất bản', ARCHIVED: 'Đã lưu trữ' }
export const SECTION_SKILL_LABEL = { READING: 'Đọc', LISTENING: 'Nghe', WRITING: 'Viết', SPEAKING: 'Nói' }
const ERROR_LABEL: Record<string, string> = {
  QUESTION_ALREADY_USED: 'Có câu đã thuộc một đề khác đã xuất bản', QUESTION_PURPOSE_MISMATCH: 'Có câu sai mục đích với loại đề',
  INVALID_PACKAGE_LESSON: 'Bài học của bộ luyện tập không hợp lệ', INVALID_PACKAGE_TOPIC: 'Chủ đề không hợp lệ cho đề cuối', INVALID_PACKAGE_COURSE: 'Khóa học không hợp lệ cho đề cuối',
  INVALID_CONTENT_STATE: 'Nội dung chưa đủ điều kiện xuất bản', QUESTION_ALREADY_IN_VERSION: 'Câu này đã có trong đề',
  EMPTY_FILE: 'Chọn file audio có nội dung', UNSUPPORTED_AUDIO: 'File không phải audio hợp lệ (mp3, m4a, wav, ogg)', AUDIO_TOO_LARGE: 'File lớn hơn 25 MB',
  STORAGE_UNAVAILABLE: 'Kho lưu trữ chưa sẵn sàng, thử lại sau', PUBLISH_FAILED: 'Xuất bản theo lịch thất bại, hệ thống sẽ thử lại',
}
export function publicationError(code: string) { return ERROR_LABEL[code] ?? 'Xuất bản theo lịch chưa thành công. Kiểm tra nội dung và lịch xuất bản.' }
export function packageError(reason: unknown) {
  const code = adminErrorCode(reason)
  if (code === 'VERSION_NOT_DRAFT') return 'Phiên bản này không còn là bản nháp. Tải lại gói để xem trạng thái mới.'
  if (code === 'DRAFT_EXISTS') return 'Gói đã có bản nháp. Tải lại gói để mở bản nháp hiện có.'
  if (code && ERROR_LABEL[code]) return code === 'INVALID_CONTENT_STATE' ? `${ERROR_LABEL[code]}. ${adminErrorMessage(reason)}` : ERROR_LABEL[code]!
  return adminErrorMessage(reason)
}
