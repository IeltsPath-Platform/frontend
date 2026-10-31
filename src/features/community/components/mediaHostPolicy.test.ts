import { describe, expect, it } from 'vitest'
import { isAllowedImageHost, isUploadedVideo } from '../utils/mediaHostPolicy'

const mediaHost = 'kndrsdqzbzsaiuuruqno.supabase.co'

describe('configured Supabase media host', () => {
  it('accepts the configured host for community image and video media', () => {
    expect(isAllowedImageHost(mediaHost, mediaHost)).toBe(true)
    expect(isUploadedVideo(`https://${mediaHost}/storage/v1/object/public/community/videos/clip`, mediaHost)).toBe(true)
  })

  it('rejects a different Supabase project and a spoofed hostname suffix', () => {
    for (const host of ['evil.supabase.co', `${mediaHost}.evil.com`]) {
      expect(isAllowedImageHost(host, mediaHost)).toBe(false)
      expect(isUploadedVideo(`https://${host}/storage/v1/object/public/community/videos/clip`, mediaHost)).toBe(false)
    }
  })

  it('rejects Supabase media hosts when the configured host is missing', () => {
    expect(isAllowedImageHost(mediaHost, undefined)).toBe(false)
    expect(isUploadedVideo(`https://${mediaHost}/storage/v1/object/public/community/videos/clip`, undefined)).toBe(false)
  })
})
