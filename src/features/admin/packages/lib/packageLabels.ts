import { adminErrorCode, adminErrorMessage } from '../../lib/adminErrors'
import type { ContentPackage } from '../types'

export const PACKAGE_TYPE_LABEL: Record<ContentPackage['packageType'], string> = {
  MOCK_TEST: 'Thi thử', PLACEMENT_TEST: 'Kiểm tra đầu vào', PRACTICE_SET: 'Bộ luyện tập',
  PRACTICE_TEST: 'Đề luyện tập', QUIZ: 'Trắc nghiệm', LESSON: 'Bài học', TOPIC_TEST: 'Đề cuối chủ đề', COURSE_TEST: 'Đề cuối khóa',
}
export const PACKAGE_STATUS_LABEL = { DRAFT: 'Bản nháp', PUBLISHED: 'Đã xuất bản', ARCHIVED: 'Đã lưu trữ' }
export const SECTION_SKILL_LABEL = { READING: 'Đọc', LISTENING: 'Nghe', WRITING: 'Viết', SPEAKING: 'Nói' }
export function packageError(reason: unknown) {
  const code = adminErrorCode(reason)
  if (code === 'VERSION_NOT_DRAFT') return 'Phiên bản này không còn là bản nháp. Tải lại gói để xem trạng thái mới.'
  if (code === 'DRAFT_EXISTS') return 'Gói đã có bản nháp. Tải lại gói để mở bản nháp hiện có.'
  return adminErrorMessage(reason)
}
