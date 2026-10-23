import { HttpError } from '@/lib/httpClient'
import { adminErrorMessage } from '../../lib/adminErrors'
import type { ErrorCategory, ErrorType, ErrorTypeUpdate } from '../types'

export const ERROR_CATEGORY_LABEL: Record<ErrorCategory, string> = { GRAMMAR: 'Ngữ pháp', VOCABULARY: 'Từ vựng', COHERENCE: 'Mạch lạc', TASK: 'Đáp ứng đề', READING_STRATEGY: 'Chiến lược đọc', LISTENING_STRATEGY: 'Chiến lược nghe', SPELLING_NUMBER: 'Chính tả & số' }
export const SEVERITY_LABEL: Record<number, string> = { 1: '1 · Nhẹ', 2: '2 · Vừa', 3: '3 · Nặng' }
export function errorTypeMessage(reason: unknown) {
  const message = adminErrorMessage(reason)
  // DuplicateCodeException returns HTTP 400 with a message and no machine code.
  return reason instanceof HttpError && reason.status === 400 && /^ErrorType with code '.+' already exists$/.test(message) ? 'Mã lỗi này đã tồn tại. Hãy chọn mã khác.' : message
}
export function errorTypeUpdate(item: ErrorType): ErrorTypeUpdate {
  return { name: item.name, category: item.category, severity: item.severity, knowledgePointId: item.knowledgePointId, fixHint: item.fixHint, status: item.status, reviewStatus: item.reviewStatus }
}
