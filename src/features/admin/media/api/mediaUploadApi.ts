import { z } from 'zod'
import { apiRequest } from '@/lib/httpClient'
import { adminErrorCode, adminErrorMessage } from '../../lib/adminErrors'

export const IMAGE_MAX_BYTES = 2 * 1024 * 1024
export const IMAGE_CONTENT_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const

const imageUploadSchema = z.object({
  mediaReference: z.string().min(1),
  mediaUrl: z.string().url().nullable(),
  contentType: z.enum(IMAGE_CONTENT_TYPES),
  sizeBytes: z.number().int().positive().max(IMAGE_MAX_BYTES),
})

export async function uploadAdminImage(endpoint: string, file: File) {
  z.file().min(1).max(IMAGE_MAX_BYTES).mime([...IMAGE_CONTENT_TYPES]).parse(file)
  const body = new FormData()
  body.append('file', file)
  return imageUploadSchema.parse(await apiRequest<unknown>(endpoint, { auth: true, method: 'POST', body }))
}

export const DOCUMENT_MAX_BYTES = 20 * 1024 * 1024
export const DOCUMENT_CONTENT_TYPE = 'application/pdf'

const documentUploadSchema = z.object({
  mediaReference: z.string().min(1),
  contentType: z.literal(DOCUMENT_CONTENT_TYPE),
  sizeBytes: z.number().int().positive().max(DOCUMENT_MAX_BYTES),
})

/** Why a chosen file cannot be a lesson document, or null when it can. Checked before anything is sent. */
export function documentFileProblem(file: File): string | null {
  if (file.type !== DOCUMENT_CONTENT_TYPE && !file.name.toLowerCase().endsWith('.pdf')) return 'Chỉ nhận tệp PDF.'
  if (file.size === 0) return 'Tệp PDF không có nội dung.'
  if (file.size > DOCUMENT_MAX_BYTES) return 'Tệp PDF lớn hơn 20 MB.'
  return null
}

/** Stores a PDF privately. The returned `mediaReference` is attached to a lesson document; it has no public link. */
export async function uploadAdminDocument(file: File) {
  const body = new FormData()
  body.append('file', file)
  return documentUploadSchema.parse(await apiRequest<unknown>('/api/content/admin/media/document', { auth: true, method: 'POST', body }))
}

const DOCUMENT_ERRORS: Record<string, string> = {
  DOCUMENT_TOO_LARGE: 'Tệp PDF lớn hơn 20 MB.',
  UNSUPPORTED_DOCUMENT: 'Tệp không phải PDF hợp lệ.',
  EMPTY_FILE: 'Tệp PDF không có nội dung.',
  STORAGE_UNAVAILABLE: 'Kho lưu trữ chưa sẵn sàng, thử lại sau.',
}

/** The message for a failed document upload or attach, in Vietnamese where the server sent a known code. */
export function documentErrorMessage(reason: unknown): string {
  const code = adminErrorCode(reason)
  return (code && DOCUMENT_ERRORS[code]) || adminErrorMessage(reason)
}
