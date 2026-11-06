import { describe, expect, it } from 'vitest'
import { reviewReasonText } from './reviewReason'

describe('reviewReasonText', () => {
  it('says an optional Writing criterion review is the learner\'s own choice to study', () => {
    expect(reviewReasonText({ blocking: false, triggerKind: 'WRITING_CRITERION' })).toContain('vẫn học tiếp được')
  })

  it('says a required Writing review was raised by the examiner grading another essay', () => {
    const text = reviewReasonText({ blocking: true, triggerKind: 'WRITING_CRITERION' })
    expect(text).toContain('Examiner')
    expect(text).toContain('bài viết khác')
  })

  it('treats a Writing review without the blocking flag as required', () => {
    expect(reviewReasonText({ triggerKind: 'WRITING_CRITERION' })).toContain('Examiner')
  })

  it('always calls a Speaking criterion review a suggestion, never a requirement', () => {
    expect(reviewReasonText({ blocking: false, triggerKind: 'SPEAKING_CRITERION' })).toContain('gợi ý')
    expect(reviewReasonText({ triggerKind: 'SPEAKING_CRITERION' })).toContain('gợi ý')
  })

  it('names a repeated mistake behind an error pattern review', () => {
    expect(reviewReasonText({ blocking: false, triggerKind: 'ERROR_PATTERN' })).toContain('lỗi này')
  })

  it('gives no reason for other kinds or when none is recorded', () => {
    expect(reviewReasonText({ blocking: true, triggerKind: 'PRACTICE' })).toBeNull()
    expect(reviewReasonText({ blocking: true, triggerKind: null })).toBeNull()
    expect(reviewReasonText({})).toBeNull()
  })
})
