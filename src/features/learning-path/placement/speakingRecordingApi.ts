import { z } from 'zod'
import { apiRequest } from '@/lib/httpClient'

const MAX_RECORDING_BYTES = 5 * 1024 * 1024
const MIME_TYPES = new Set(['audio/webm', 'audio/mp4', 'audio/ogg', 'audio/mpeg', 'audio/wav'])
const EXTENSIONS: Record<string, string> = {
  'audio/webm': 'webm', 'audio/mp4': 'm4a', 'audio/ogg': 'ogg', 'audio/mpeg': 'mp3', 'audio/wav': 'wav',
}

const uploadResponseSchema = z.object({
  mediaReference: z.string().min(1),
  contentType: z.string().min(1),
  sizeBytes: z.number().int().positive(),
})

export type SpeakingRecordingUpload = z.infer<typeof uploadResponseSchema>

function canonicalContentType(declared: string) {
  return declared.split(';', 1)[0]?.trim().toLowerCase() ?? ''
}

export async function uploadSpeakingRecording(recording: Blob): Promise<SpeakingRecordingUpload> {
  const contentType = canonicalContentType(recording.type)
  if (!MIME_TYPES.has(contentType)
    || (typeof MediaRecorder !== 'undefined' && !MediaRecorder.isTypeSupported(contentType))) {
    throw new Error('Định dạng ghi âm này không hỗ trợ. Hãy thử lại trên trình duyệt khác.')
  }
  if (recording.size === 0) throw new Error('Bản ghi đang trống. Hãy ghi âm lại.')
  if (recording.size > MAX_RECORDING_BYTES) throw new Error('Bản ghi vượt quá giới hạn 5 MB. Hãy ghi âm lại ngắn hơn.')

  const form = new FormData()
  form.append('file', recording, `speaking-recording.${EXTENSIONS[contentType]}`)
  return uploadResponseSchema.parse(await apiRequest<unknown>('/api/assessments/speaking-recordings', {
    auth: true,
    method: 'POST',
    body: form,
  }))
}
