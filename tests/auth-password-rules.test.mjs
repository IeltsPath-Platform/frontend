import assert from 'node:assert/strict'
import { after, before, describe, test } from 'node:test'
import { createServer } from 'vite'

let server
let HttpError
let isPasswordLengthValid
let mapAuthPasswordHttpError
let PASSWORD_LENGTH_MESSAGE
let PASSWORD_MAX_LENGTH
let PASSWORD_MIN_LENGTH

before(async () => {
  server = await createServer({ server: { middlewareMode: true }, appType: 'custom' })
  ;({ HttpError } = await server.ssrLoadModule('/src/lib/httpClient.ts'))
  ;({
    isPasswordLengthValid,
    mapAuthPasswordHttpError,
    PASSWORD_LENGTH_MESSAGE,
    PASSWORD_MAX_LENGTH,
    PASSWORD_MIN_LENGTH,
  } = await server.ssrLoadModule('/src/features/auth/lib/passwordRules.ts'))
})
after(async () => { await server?.close() })

describe('auth password rules', () => {
  test('accepts lengths from 6 to 72 inclusive', () => {
    assert.equal(isPasswordLengthValid('12345'), false)
    assert.equal(isPasswordLengthValid('123456'), true)
    assert.equal(isPasswordLengthValid('a'.repeat(PASSWORD_MIN_LENGTH)), true)
    assert.equal(isPasswordLengthValid('a'.repeat(PASSWORD_MAX_LENGTH)), true)
    assert.equal(isPasswordLengthValid('a'.repeat(PASSWORD_MAX_LENGTH + 1)), false)
  })

  test('maps BE field details.password on 400', () => {
    const error = new HttpError(400, 'Validation failed', {
      message: 'Validation failed',
      details: { password: 'Mật khẩu phải có từ 6 đến 72 ký tự' },
    })
    assert.equal(
      mapAuthPasswordHttpError(error, 'fallback'),
      'Mật khẩu phải có từ 6 đến 72 ký tự',
    )
  })

  test('normalizes generic 400 password messages', () => {
    const error = new HttpError(400, 'password size invalid', { message: 'password size invalid' })
    assert.equal(mapAuthPasswordHttpError(error, 'fallback'), PASSWORD_LENGTH_MESSAGE)
  })
})
