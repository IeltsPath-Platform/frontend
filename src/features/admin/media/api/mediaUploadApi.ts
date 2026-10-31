import { z } from 'zod'
import { apiRequest } from '@/lib/httpClient'

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
