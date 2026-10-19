import { beforeEach, describe, expect, it, vi } from 'vitest'

const requestMock = vi.hoisted(() => vi.fn())
vi.mock('@/lib/httpClient', () => ({
  apiRequest: requestMock,
  HttpError: class HttpError extends Error {
    status: number
    constructor(status: number) { super('backend detail should stay private'); this.status = status; this.name = 'HttpError' }
  },
}))

import { communityApi } from './communityApi'
import { HttpError } from '@/lib/httpClient'

class MockUploadXhr {
  static last: MockUploadXhr
  constructor() { MockUploadXhr.last = this }
  upload = { onprogress: null as ((event: ProgressEvent) => void) | null }
  onload: (() => void) | null = null
  onerror: (() => void) | null = null
  onabort: (() => void) | null = null
  status = 200
  url = ''
  file: File | null = null
  headers: Record<string, string> = {}
  open(method: string, url: string) { expect(method).toBe('PUT'); this.url = url }
  setRequestHeader(name: string, value: string) { this.headers[name] = value }
  send(file: File) { this.file = file; this.onload?.() }
  abort() { this.onabort?.() }
}

describe('community media uploads', () => {
  beforeEach(() => {
    requestMock.mockReset()
    vi.stubGlobal('XMLHttpRequest', MockUploadXhr)
    MockUploadXhr.last = undefined as unknown as MockUploadXhr
  })

  it('uploads an image as multipart field file and returns only the public URL', async () => {
    requestMock.mockResolvedValue({ url: 'https://bucket.supabase.co/storage/v1/object/public/community/images/a.png', key: 'a.png', contentType: 'image/png', size: 4 })
    const file = new File(['data'], 'a.png', { type: 'image/png' })
    await expect(communityApi.uploadImage(file)).resolves.toEqual({ url: 'https://bucket.supabase.co/storage/v1/object/public/community/images/a.png' })
    expect(requestMock).toHaveBeenCalledWith('/api/community/media/images', expect.objectContaining({ method: 'POST', auth: true, body: expect.any(FormData) }))
    const formData = requestMock.mock.calls[0][1].body as FormData
    expect(formData.get('file')).toBe(file)
  })

  it('requests a signed video URL, PUTs the file with its MIME type, and returns publicUrl only', async () => {
    const signedUrl = 'https://signed.example.invalid/private-token'
    requestMock.mockResolvedValue({ uploadUrl: signedUrl, key: 'v.mp4', publicUrl: 'https://bucket.supabase.co/community/videos/v.mp4' })
    const file = new File(['video'], 'clip.mp4', { type: 'video/mp4' })
    const result = await communityApi.uploadVideo(file)
    expect(result).toEqual({ url: 'https://bucket.supabase.co/community/videos/v.mp4' })
    expect(requestMock).toHaveBeenCalledWith('/api/community/media/videos/upload-url', expect.objectContaining({ body: { contentType: 'video/mp4', size: file.size }, auth: true }))
    expect(MockUploadXhr.last.url).toBe(signedUrl)
    expect(MockUploadXhr.last.headers['Content-Type']).toBe('video/mp4')
    expect(MockUploadXhr.last.file).toBe(file)
    expect(JSON.stringify(result)).not.toContain(signedUrl)
  })

  it('maps storage unavailable errors to a friendly message without backend details', async () => {
    requestMock.mockRejectedValue(new HttpError(503, 'backend detail should stay private'))
    await expect(communityApi.uploadImage(new File(['x'], 'x.png', { type: 'image/png' }))).rejects.toThrow('Tải tệp từ máy tạm thời chưa khả dụng, hãy dùng đường dẫn URL')
  })

  it('rejects invalid files before making an authenticated request', async () => {
    await expect(communityApi.uploadImage(new File(['x'], 'bad.exe', { type: 'application/octet-stream' }))).rejects.toThrow('Tệp ảnh không được hỗ trợ')
    const largeFile = new File(['x'], 'large.mp4', { type: 'video/mp4' })
    Object.defineProperty(largeFile, 'size', { value: 50 * 1024 * 1024 + 1 })
    await expect(communityApi.uploadVideo(largeFile)).rejects.toThrow('vượt quá dung lượng tối đa 50 MB')
    expect(requestMock).not.toHaveBeenCalled()
  })

  it('keeps image upload cancellation distinguishable from a network failure', async () => {
    requestMock.mockRejectedValue(new DOMException('Aborted', 'AbortError'))
    await expect(communityApi.uploadImage(new File(['x'], 'x.png', { type: 'image/png' }))).rejects.toMatchObject({ name: 'AbortError' })
  })
})
