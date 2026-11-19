import { HttpError } from '@/lib/httpClient'
import { adminErrorMessage } from '../../lib/adminErrors'

/**
 * The server's refusal to repeat a course code or band, or to delete a course that still holds content, in words the
 * author can act on; any other error keeps its own message.
 */
export function courseErrorMessage(reason: unknown): string {
  if (reason instanceof HttpError && reason.status === 409) {
    if (reason.code === 'COURSE_NOT_EMPTY') return 'Khóa học còn chủ đề, đề cuối khóa hoặc bài kiểm tra nên không xóa được. Hãy chuyển sang "Ngừng dùng" để học viên không còn thấy.'
    const match = /^Course with (code|bandLevel) '(.*)' already exists$/.exec(reason.message)
    if (match?.[1] === 'code') return `Mã khóa học "${match[2]}" đã được dùng. Hãy chọn mã khác.`
    if (match?.[1] === 'bandLevel') return `Band ${Number(match[2]).toFixed(1)} đã có khóa học. Mỗi band chỉ có một khóa học.`
  }
  return adminErrorMessage(reason)
}
