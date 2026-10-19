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

describe('community media uploads', () => {
  beforeEach(() => {
    requestMock.mockReset()
  })

  it('uploads an image as multipart field file and returns only the public URL', async () => {
    requestMock.mockResolvedValue({ url: 'https://bucket.supabase.co/storage/v1/object/public/community/images/a.png', key: 'a.png', contentType: 'image/png', size: 4 })
    const file = new File(['data'], 'a.png', { type: 'image/png' })
    await expect(communityApi.uploadImage(file)).resolves.toEqual({ url: 'https://bucket.supabase.co/storage/v1/object/public/community/images/a.png' })
    expect(requestMock).toHaveBeenCalledWith('/api/community/media/images', expect.objectContaining({ method: 'POST', auth: true, body: expect.any(FormData) }))
    const formData = requestMock.mock.calls[0][1].body as FormData
    expect(formData.get('file')).toBe(file)
  })

  it('maps storage unavailable errors to a friendly message without backend details', async () => {
    requestMock.mockRejectedValue(new HttpError(503, 'backend detail should stay private'))
    await expect(communityApi.uploadImage(new File(['x'], 'x.png', { type: 'image/png' }))).rejects.toThrow('Tải tệp từ máy tạm thời chưa khả dụng, hãy dùng đường dẫn URL')
  })

  it('rejects invalid files before making an authenticated request', async () => {
    await expect(communityApi.uploadImage(new File(['x'], 'bad.exe', { type: 'application/octet-stream' }))).rejects.toThrow('Tệp ảnh không được hỗ trợ')
    const largeFile = new File(['x'], 'large.png', { type: 'image/png' })
    Object.defineProperty(largeFile, 'size', { value: 5 * 1024 * 1024 + 1 })
    await expect(communityApi.uploadImage(largeFile)).rejects.toThrow('vượt quá dung lượng tối đa 5 MB')
    expect(requestMock).not.toHaveBeenCalled()
  })

  it('keeps image upload cancellation distinguishable from a network failure', async () => {
    requestMock.mockRejectedValue(new DOMException('Aborted', 'AbortError'))
    await expect(communityApi.uploadImage(new File(['x'], 'x.png', { type: 'image/png' }))).rejects.toMatchObject({ name: 'AbortError' })
  })

  it('has no video upload: videos can only be attached as links', () => {
    expect('uploadVideo' in communityApi).toBe(false)
  })
})
