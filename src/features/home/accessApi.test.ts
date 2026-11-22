import { describe, expect, it } from 'vitest'
import { AccessApiError, createAccessClient } from './accessApi'

function clientAnswering(status: number, body: unknown) {
  const fetcher = (async () => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })) as typeof fetch
  return createAccessClient({ baseUrl: 'http://gateway', accessToken: 'token', fetcher })
}

describe('activating a key that the server refuses with 403', () => {
  it('tells the learner to verify the email when that is the reason', async () => {
    const client = clientAnswering(403, { message: 'Vui lòng xác minh email trước khi nhập mã kích hoạt' })

    await expect(client.activateKey('ip-dev5-keys-aaa3', 'once')).rejects.toMatchObject({
      status: 403, message: 'Vui lòng xác minh email của tài khoản trước khi nhập mã kích hoạt.',
    })
  })

  it('keeps the general sentence for any other refusal, and does not show the server text', async () => {
    const client = clientAnswering(403, { message: 'Không có quyền truy cập' })

    const failure = await client.activateKey('ip-dev5-keys-aaa3', 'once').catch((error: unknown) => error)
    expect(failure).toBeInstanceOf(AccessApiError)
    expect((failure as AccessApiError).message).toBe('Tài khoản của bạn chưa được phép thực hiện thao tác này.')
  })

  it('keeps the general sentence when the refusal has no readable body', async () => {
    const fetcher = (async () => new Response('', { status: 403 })) as typeof fetch
    const client = createAccessClient({ baseUrl: 'http://gateway', accessToken: 'token', fetcher })

    await expect(client.activateKey('ip-dev5-keys-aaa3', 'once')).rejects.toMatchObject({
      message: 'Tài khoản của bạn chưa được phép thực hiện thao tác này.',
    })
  })
})
