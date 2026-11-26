import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { clearAccessToken, setAccessToken } from '@/lib/httpClient'
import { uploadSpeakingRecording } from './speakingRecordingApi'

const fetchMock = vi.fn<typeof fetch>()
const wav = vi.hoisted(() => ({ convert: vi.fn(async () => new Blob(['wav'], { type: 'audio/wav' })) }))
vi.mock('@/features/practice/speaking/wavEncoder', () => ({ toWav16kMono: wav.convert }))
const recorder = class {
  static isTypeSupported(type: string) { return type === 'audio/webm' || type === 'audio/wav' }
}

describe('Speaking recording API', () => {
  beforeEach(() => {
    fetchMock.mockReset()
    vi.stubGlobal('fetch', fetchMock)
    vi.stubGlobal('MediaRecorder', recorder)
    setAccessToken('test-access-token')
  })

  afterEach(() => {
    clearAccessToken()
    vi.unstubAllGlobals()
  })

  it('uploads supported audio as multipart and returns only the storage reference', async () => {
    fetchMock.mockResolvedValue(new Response(JSON.stringify({
      mediaReference: 'speaking/user/recording.webm', contentType: 'audio/webm', sizeBytes: 8,
    }), { status: 201, headers: { 'Content-Type': 'application/json' } }))
    const recording = new Blob([new Uint8Array([1, 2, 3])], { type: 'audio/webm;codecs=opus' })

    await expect(uploadSpeakingRecording(recording)).resolves.toEqual({
      mediaReference: 'speaking/user/recording.webm', contentType: 'audio/webm', sizeBytes: 8,
    })

    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(wav.convert).toHaveBeenCalledWith(recording)
    const [url, request] = fetchMock.mock.calls[0]!
    expect(new URL(url as string).pathname).toBe('/api/assessments/speaking-recordings')
    expect(request).toMatchObject({ method: 'POST', credentials: 'include' })
    const uploaded = (request!.body as FormData).get('file') as File
    expect(uploaded).toBeInstanceOf(Blob)
    expect(uploaded.type).toBe('audio/wav')
    expect(uploaded.name).toBe('speaking-recording.wav')
    expect(request!.headers).not.toHaveProperty('Content-Type')
  })

  it('rejects audio MIME types the recorder or backend does not support', async () => {
    await expect(uploadSpeakingRecording(new Blob(['x'], { type: 'audio/flac' })))
      .rejects.toThrow(/không hỗ trợ/i)
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('checks the converted WAV against the assessment 5 MB limit', async () => {
    wav.convert.mockResolvedValueOnce({ size: 5 * 1024 * 1024 + 1, type: 'audio/wav' } as Blob)
    await expect(uploadSpeakingRecording(new Blob(['recording'], { type: 'audio/webm' })))
      .rejects.toThrow(/giới hạn 5 MB/)
    expect(fetchMock).not.toHaveBeenCalled()
  })
})
