import { describe, expect, it } from 'vitest'
import { codeSettingsSchema } from './codeSettings'

const messages = (kind: Parameters<typeof codeSettingsSchema>[0], pattern: string) => {
  const result = codeSettingsSchema(kind).safeParse({ pattern, startNumber: '1' })
  return result.success ? [] : result.error.issues.map((issue) => issue.message)
}

describe('codeSettingsSchema', () => {
  it('accepts the default pattern of a knowledge point, which has no {SEQ}', () => {
    expect(messages('KNOWLEDGE_POINT', '{PREFIX}{LEVEL}_{NAME}')).toEqual([])
  })

  it('accepts {NAME} alone for an error type and refuses a pattern without it', () => {
    expect(messages('ERROR_TYPE', '{NAME}')).toEqual([])
    expect(messages('ERROR_TYPE', 'ERR_{NAME}')).toEqual([])
    expect(messages('ERROR_TYPE', 'ERROR')).toEqual(['Cấu trúc mã lỗi cần có {NAME}.'])
  })

  it('refuses keywords that an error type does not use', () => {
    expect(messages('ERROR_TYPE', '{NAME}_{SEQ:2}')).toEqual(['Mã lỗi chỉ dùng được {NAME}.'])
  })

  it('still needs {SEQ} for a topic', () => {
    expect(messages('TOPIC', '{COURSE}_{SKILL}')).toEqual(['Cấu trúc mã chủ đề cần có {SEQ} để tránh trùng mã.'])
  })
})
