import { beforeEach, describe, expect, it, vi } from 'vitest'
import { apiRequest } from '@/lib/httpClient'
import { uploadAdminImage } from './mediaUploadApi'

vi.mock('@/lib/httpClient', () => ({ apiRequest: vi.fn() }))

const mediaUploadResponse = {
  mediaReference: 'content-image/author-1/cover.png',
  mediaUrl: 'https://storage.example/content-image/author-1/cover.png',
  contentType: 'image/png',
  sizeBytes: 3,
}

describe('uploadAdminImage', () => {
  beforeEach(() => vi.mocked(apiRequest).mockReset())

  it('uploads a supported image as multipart data to the requested endpoint', async () => {
    vi.mocked(apiRequest).mockResolvedValue(mediaUploadResponse)
    const file = new File(['png'], 'cover.png', { type: 'image/png' })

    await expect(uploadAdminImage('/api/content/admin/media/image', file)).resolves.toEqual(mediaUploadResponse)

    expect(apiRequest).toHaveBeenCalledWith('/api/content/admin/media/image', {
      auth: true, method: 'POST', body: expect.any(FormData),
    })
    const options = vi.mocked(apiRequest).mock.calls[0]?.[1]
    expect(options?.body).toBeInstanceOf(FormData)
    expect((options?.body as FormData).get('file')).toBe(file)
  })

  it('rejects SVG files before making a request', async () => {
    const file = new File(['<svg/>'], 'cover.svg', { type: 'image/svg+xml' })

    await expect(uploadAdminImage('/api/content/admin/media/image', file)).rejects.toThrow()
    expect(apiRequest).not.toHaveBeenCalled()
  })

  it('rejects images larger than two megabytes before making a request', async () => {
    const file = new File([new Uint8Array(2 * 1024 * 1024 + 1)], 'large.png', { type: 'image/png' })

    await expect(uploadAdminImage('/api/content/admin/media/image', file)).rejects.toThrow()
    expect(apiRequest).not.toHaveBeenCalled()
  })

  it('rejects an invalid upload response', async () => {
    vi.mocked(apiRequest).mockResolvedValue({ ...mediaUploadResponse, contentType: 'image/svg+xml' })
    const file = new File(['png'], 'cover.png', { type: 'image/png' })

    await expect(uploadAdminImage('/api/content/admin/media/image', file)).rejects.toThrow()
  })
})
