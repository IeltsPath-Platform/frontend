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
  })
})
