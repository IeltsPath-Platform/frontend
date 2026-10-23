import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { API_BASE_URL } from './env'
import { HttpError, apiDownload, clearAccessToken, setAccessToken } from './httpClient'

const XLSX = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
const fetchMock = vi.fn<typeof fetch>()

function file(bytes: number[], status = 200) {
  return new Response(new Uint8Array(bytes), { status, headers: { 'Content-Type': XLSX } })
}
function json(value: unknown, status: number) {
  return new Response(JSON.stringify(value), { status, headers: { 'Content-Type': 'application/json' } })
}

describe('apiDownload', () => {
  beforeEach(() => { fetchMock.mockReset(); vi.stubGlobal('fetch', fetchMock); setAccessToken('first-token') })
  afterEach(() => { clearAccessToken(); vi.unstubAllGlobals() })

  it('returns the file as a blob, asking for a spreadsheet with the bearer token', async () => {
    fetchMock.mockResolvedValueOnce(file([80, 75, 3, 4]))

    const blob = await apiDownload('/api/content/admin/course-import/template')

    expect(blob).toBeInstanceOf(Blob)
    expect(blob.size).toBe(4)
    expect(blob.type).toBe(XLSX)
    expect(fetchMock).toHaveBeenCalledOnce()
    const [url, options] = fetchMock.mock.calls[0]
    expect(url).toBe(`${API_BASE_URL}/api/content/admin/course-import/template`)
    expect(options?.method).toBe('GET')
    expect(options?.headers).toMatchObject({ Accept: XLSX, Authorization: 'Bearer first-token' })
  })

  it('refreshes the session on 401 and downloads again with the new token', async () => {
    fetchMock
      .mockResolvedValueOnce(json({ message: 'expired' }, 401))
      .mockResolvedValueOnce(json({ accessToken: 'second-token' }, 200))
      .mockResolvedValueOnce(file([1, 2, 3]))

    const blob = await apiDownload('/api/content/admin/course-import/template')

    expect(blob.size).toBe(3)
    expect(fetchMock).toHaveBeenCalledTimes(3)
    expect(String(fetchMock.mock.calls[1][0])).toBe(`${API_BASE_URL}/auth/refresh`)
    expect(fetchMock.mock.calls[2][1]?.headers).toMatchObject({ Authorization: 'Bearer second-token' })
  })

  it('throws an HttpError with the status when the server answers with an error', async () => {
    fetchMock.mockResolvedValueOnce(json({ message: 'Máy chủ lỗi' }, 500))

    await expect(apiDownload('/api/content/admin/course-import/template')).rejects.toMatchObject({
      name: 'HttpError', status: 500, message: 'Máy chủ lỗi',
    })
  })

  it('passes a network failure on as an HttpError with status 0', async () => {
    fetchMock.mockRejectedValueOnce(new TypeError('offline'))

    const failure = await apiDownload('/api/content/admin/course-import/template').catch((reason: unknown) => reason)

    expect(failure).toBeInstanceOf(HttpError)
    expect((failure as HttpError).isNetworkError).toBe(true)
  })
})
