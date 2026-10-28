import { describe, expect, it } from 'vitest'
import { aiDraftFailure } from './aiDraftLabels'

describe('aiDraftFailure', () => {
  it('says the model was too slow for a timeout', () => {
    expect(aiDraftFailure('TIMEOUT')).toMatch(/quá lâu/)
  })

  it('names the status the model endpoint answered with', () => {
    expect(aiDraftFailure('HTTP_503')).toBe('Dịch vụ AI trả lỗi 503. Hãy thử lại sau.')
    expect(aiDraftFailure('HTTP_429')).toMatch(/giới hạn lượt gọi \(429\)/)
  })

  it('keeps the older codes and falls back for anything unknown', () => {
    expect(aiDraftFailure('FAILED')).toBe('Gọi AI thất bại')
    expect(aiDraftFailure('HTTP_BAD')).toMatch(/Không tạo được nội dung/)
    expect(aiDraftFailure(null)).toMatch(/Không tạo được nội dung/)
  })
})
