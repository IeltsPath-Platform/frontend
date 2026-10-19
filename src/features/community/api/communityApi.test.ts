import { describe, expect, it } from 'vitest'
import { notificationSchema, postSchema } from './communityApi'

describe('community API schemas', () => {
  it('accepts stable demo GUIDs in post and notification payloads', () => {
    const learnerId = '00000000-0000-0000-0000-000000000001'
    const adminId = '00000000-0000-0000-0000-000000000002'
    const post = postSchema.parse({
      id: '00000000-0000-0000-0000-000000000003',
      authorId: learnerId,
      category: 'GENERAL',
      title: null,
      body: 'A demo post',
      createdAt: '2026-10-17T00:00:00Z',
      author: { id: adminId, displayName: 'Demo admin' },
    })
    const notification = notificationSchema.parse({
      id: '00000000-0000-0000-0000-000000000004',
      actorId: adminId,
      eventType: 'community.user-followed.v1',
      postId: null,
      commentId: null,
      createdAt: '2026-10-17T00:00:00Z',
      readAt: null,
    })

    expect(post.authorId).toBe(learnerId)
    expect(notification.actorId).toBe(adminId)
    expect(post.background).toBeUndefined()
  })

  it('accepts and validates optional background key in post payload', () => {
    const postWithBg = postSchema.parse({
      id: '00000000-0000-0000-0000-000000000003',
      authorId: '00000000-0000-0000-0000-000000000001',
      category: 'GENERAL',
      title: null,
      body: 'Post with violet background',
      createdAt: '2026-10-18T00:00:00Z',
      background: 'VIOLET',
    })
    expect(postWithBg.background).toBe('VIOLET')

    const postWithNullBg = postSchema.parse({
      id: '00000000-0000-0000-0000-000000000003',
      authorId: '00000000-0000-0000-0000-000000000001',
      category: 'GENERAL',
      title: null,
      body: 'Post with null background',
      createdAt: '2026-10-18T00:00:00Z',
      background: null,
    })
    expect(postWithNullBg.background).toBeNull()

    expect(() =>
      postSchema.parse({
        id: '00000000-0000-0000-0000-000000000003',
        authorId: '00000000-0000-0000-0000-000000000001',
        category: 'GENERAL',
        title: null,
        body: 'Invalid background',
        createdAt: '2026-10-18T00:00:00Z',
        background: 'INVALID_BG',
      }),
    ).toThrow()
  })

  it('rejects unsupported and oversized image files before making a request', async () => {
    const { communityApi } = await import('./communityApi')
    const unsupported = new File(['binary'], 'bad.exe', { type: 'application/octet-stream' })
    const oversized = new File([new Uint8Array(5 * 1024 * 1024 + 1)], 'large.png', { type: 'image/png' })
    await expect(communityApi.uploadImage(unsupported)).rejects.toThrow('Tệp ảnh không được hỗ trợ')
    await expect(communityApi.uploadImage(oversized)).rejects.toThrow('vượt quá dung lượng tối đa 5 MB')
  })
})

