import { describe, expect, it } from 'vitest'
import { HttpError } from '@/lib/httpClient'
import {
  isPasswordLengthValid,
  isWeakPasswordError,
  mapAuthPasswordHttpError,
  PASSWORD_LENGTH_MESSAGE,
  weakPasswordMessage,
} from './passwordRules'

describe('isPasswordLengthValid', () => {
  it('accepts 8 to 72 characters and refuses 7 or 73', () => {
    expect(isPasswordLengthValid('1234567')).toBe(false)
    expect(isPasswordLengthValid('12345678')).toBe(true)
    expect(isPasswordLengthValid('a'.repeat(72))).toBe(true)
    expect(isPasswordLengthValid('a'.repeat(73))).toBe(false)
  })
})

describe('weak password errors', () => {
  it('recognises the stable WEAK_PASSWORD code only', () => {
    expect(isWeakPasswordError(new HttpError(400, 'x', {}, 'WEAK_PASSWORD'))).toBe(true)
    expect(isWeakPasswordError(new HttpError(400, 'x', {}, 'OTHER'))).toBe(false)
    expect(isWeakPasswordError(new Error('WEAK_PASSWORD'))).toBe(false)
  })

  it('turns each known reason into its own sentence, from a comma-separated string', () => {
    const error = new HttpError(400, 'x', { details: { reasons: 'TOO_SHORT,TOO_SIMPLE' } }, 'WEAK_PASSWORD')

    expect(weakPasswordMessage(error)).toBe(
      'Mật khẩu phải có ít nhất 8 ký tự. Mật khẩu quá đơn giản, tránh chuỗi lặp hoặc liên tiếp (như 12345678).',
    )
  })

  it('accepts reasons sent as a list', () => {
    const error = new HttpError(400, 'x', { details: { reasons: ['CONTAINS_ACCOUNT_INFO'] } } as never, 'WEAK_PASSWORD')

    expect(weakPasswordMessage(error)).toBe('Mật khẩu không được chứa email, họ tên hoặc số điện thoại của bạn.')
  })

  it('skips unknown reasons and falls back to the server message when none is known', () => {
    const partly = new HttpError(400, 'x', { details: { reasons: 'NEW_RULE,TOO_COMMON' } }, 'WEAK_PASSWORD')
    expect(weakPasswordMessage(partly)).toBe('Mật khẩu này quá phổ biến, hãy chọn mật khẩu khác.')

    const none = new HttpError(400, 'Mật khẩu không hợp lệ.', { message: 'Mật khẩu không hợp lệ.' }, 'WEAK_PASSWORD')
    expect(weakPasswordMessage(none)).toBe('Mật khẩu không hợp lệ.')
  })
})

describe('mapAuthPasswordHttpError', () => {
  it('maps a generic 400 about length to the 8–72 message', () => {
    const error = new HttpError(400, 'Mật khẩu phải có từ 6 đến 72 ký tự.', { message: 'Mật khẩu phải có từ 6 đến 72 ký tự.' })

    expect(mapAuthPasswordHttpError(error, 'fallback')).toBe(PASSWORD_LENGTH_MESSAGE)
  })
})
