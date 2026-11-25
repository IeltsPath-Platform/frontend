import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ZodError } from 'zod'
import { clearAccessToken, setAccessToken } from '@/lib/httpClient'
import { API_BASE_URL } from '@/lib/env'
import { archivePackage, restorePackage, updatePackageInfo } from './packageApi'
import { STATS_BATCH, listPackageStats } from './packageStatsApi'
import { makePackage } from '../testFixtures'

const packageId = '00000000-0000-4000-8000-000000000001'
const fetchMock = vi.fn<typeof fetch>()

function respond(body: unknown, status = 200) {
  fetchMock.mockResolvedValue(new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } }))
}
function lastCall() {
  const [url, init] = fetchMock.mock.calls.at(-1)!
  return { url: String(url), method: init?.method, body: init?.body ? JSON.parse(String(init.body)) : undefined }
}

describe('package information API', () => {
  beforeEach(() => {
    fetchMock.mockReset()
    vi.stubGlobal('fetch', fetchMock)
    setAccessToken('test-access-token')
  })
  afterEach(() => {
    clearAccessToken()
    vi.unstubAllGlobals()
  })

  it('patches only the given fields of the package', async () => {
    respond(makePackage())

    await updatePackageInfo(packageId, { title: 'Đề mới', accessLevel: 'PREMIUM' })

    expect(lastCall()).toEqual({ url: `${API_BASE_URL}/api/content/admin/packages/${packageId}`, method: 'PATCH', body: { title: 'Đề mới', accessLevel: 'PREMIUM' } })
  })

  it('sends a blank source to take a practice test out of the library', async () => {
    respond(makePackage())

    await updatePackageInfo(packageId, { sourceCode: '' })

    expect(lastCall().body).toEqual({ sourceCode: '' })
  })

  it('refuses an empty title before sending anything', async () => {
    await expect(updatePackageInfo(packageId, { title: '   ' })).rejects.toBeInstanceOf(ZodError)
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('hides and restores a package through its own routes', async () => {
    respond(makePackage())
    await archivePackage(packageId)
    expect(lastCall()).toMatchObject({ url: `${API_BASE_URL}/api/content/admin/packages/${packageId}/archive`, method: 'POST' })

    respond(makePackage())
    await restorePackage(packageId)
    expect(lastCall()).toMatchObject({ url: `${API_BASE_URL}/api/content/admin/packages/${packageId}/restore`, method: 'POST' })
  })

  it('asks for attempt statistics in batches of the server limit and joins the answers', async () => {
    const ids = Array.from({ length: STATS_BATCH + 1 }, (_, index) => `00000000-0000-4000-8000-${String(index + 1).padStart(12, '0')}`)
    fetchMock
      .mockResolvedValueOnce(new Response(JSON.stringify([{ packageId: ids[0], started: 2, submitted: 1, averageBand: 6 }]), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify([{ packageId: ids[STATS_BATCH], started: 1, submitted: 1, averageBand: null }]), { status: 200 }))

    const stats = await listPackageStats(ids)

    expect(fetchMock).toHaveBeenCalledTimes(2)
    const first = String(fetchMock.mock.calls[0]![0])
    expect(first).toContain('/api/assessments/admin/package-stats?')
    expect(first.match(/packageIds=/g)).toHaveLength(STATS_BATCH)
    expect(stats.map((item) => item.packageId)).toEqual([ids[0], ids[STATS_BATCH]])
  })

  it('asks nothing when there are no packages', async () => {
    await expect(listPackageStats([])).resolves.toEqual([])
    expect(fetchMock).not.toHaveBeenCalled()
  })
})
