import { describe, expect, it } from 'vitest'
import { createPackageRequestSchema, packageListItemSchema } from './types'

/** Seeded demo packages use md5-derived ids: valid database uuids that do not carry RFC version/variant bits. */
const MD5_ID = 'c4ca4238-a0b9-2382-0dcc-509a6f75849b'

const item = {
  id: MD5_ID, code: 'DEMO-REVIEW-1', title: 'Demo', packageType: 'PRACTICE_SET', accessLevel: 'FREE', status: 'PUBLISHED',
  currentPublishedVersionId: 'c81e728d-9d4c-2f63-6f06-7f89cc14862c', lessonId: MD5_ID, topicId: null, courseId: null,
  sourceCode: null, createdAt: '2026-10-20T14:16:13.483776Z', updatedAt: '2026-10-20T14:16:13.483776Z',
  latestVersionNumber: 1, hasDraft: false,
}

describe('package ids', () => {
  it('accepts database uuids that are not RFC 4122 version/variant uuids', () => {
    expect(packageListItemSchema.safeParse(item).success).toBe(true)
  })

  it('still rejects values that are not shaped like a uuid', () => {
    expect(packageListItemSchema.safeParse({ ...item, id: 'not-a-uuid' }).success).toBe(false)
    expect(packageListItemSchema.safeParse({ ...item, currentPublishedVersionId: '' }).success).toBe(false)
  })

  it('lets an author link a final test to a seeded topic', () => {
    const body = { code: 'TT-1', title: 'Final', packageType: 'TOPIC_TEST', topicId: MD5_ID }
    expect(createPackageRequestSchema.safeParse(body).success).toBe(true)
  })
})
