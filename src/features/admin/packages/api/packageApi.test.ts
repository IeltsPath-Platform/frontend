import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ZodError } from 'zod'
import { clearAccessToken, setAccessToken } from '@/lib/httpClient'
import { API_BASE_URL } from '@/lib/env'
import { draft, draftId, makePackage, nextSectionId, packageId, section, sectionId, sectionRequest } from '../testFixtures'
import { addSection, createDraftVersion, deleteSection, getPackage, reorderSections, updateSection } from './packageApi'

const fetchMock = vi.fn<typeof fetch>()
const base = `${API_BASE_URL}/api/content/admin/packages/${packageId}`
const sections = `${base}/versions/${draftId}/sections`
function respond(body: unknown, status = 200) {
  fetchMock.mockResolvedValue(new Response(status === 204 ? null : JSON.stringify(body), { status }))
}
function request(url: string, method: string, body?: unknown) {
  expect(fetchMock).toHaveBeenCalledTimes(1)
  const [actualUrl, options] = fetchMock.mock.calls[0]!
  expect(actualUrl).toBe(url)
  expect(options).toMatchObject({ method, credentials: 'include', headers: { Accept: 'application/json', Authorization: 'Bearer test-access-token' } })
  if (body === undefined) expect(options!.body).toBeUndefined()
  else {
    expect(options!.headers).toMatchObject({ 'Content-Type': 'application/json' })
    expect(JSON.parse(options!.body as string)).toEqual(body)
  }
}
describe('package authoring API', () => {
  beforeEach(() => { fetchMock.mockReset(); vi.stubGlobal('fetch', fetchMock); setAccessToken('test-access-token') })
  afterEach(() => { clearAccessToken(); vi.unstubAllGlobals() })

  it('reads the implemented partial DTO without passage, audio or question stems', async () => {
    respond(makePackage())
    await expect(getPackage(packageId)).resolves.toEqual(makePackage())
    request(base, 'GET')
  })
  it('rejects a malformed nested question instead of accepting unvalidated detail', async () => {
    const body = makePackage([{ ...draft, sections: [{ ...section, questions: [{ ...section.questions[0]!, questionVersionId: 'invalid' }] }] }])
    respond(body)
    await expect(getPackage(packageId)).rejects.toBeInstanceOf(ZodError)
  })
  it('creates an empty draft with server-owned version numbering', async () => {
    respond({ ...draft, sections: [] }, 201)
    await expect(createDraftVersion(packageId)).resolves.toEqual({ ...draft, sections: [] })
    request(`${base}/versions`, 'POST', { rulesJson: '{}' })
  })
  it.each(['create', 'update'] as const)('sends every section field on %s', async (action) => {
    respond(section, action === 'create' ? 201 : 200)
    const result = action === 'create' ? addSection(packageId, draftId, sectionRequest) : updateSection(packageId, draftId, sectionId, sectionRequest)
    await expect(result).resolves.toEqual(section)
    request(action === 'create' ? sections : `${sections}/${sectionId}`, action === 'create' ? 'POST' : 'PUT', sectionRequest)
  })
  it.each([0, -60])('accepts the backend duration contract for %i seconds', async (timeLimitSeconds) => {
    respond({ ...section, timeLimitSeconds })
    await updateSection(packageId, draftId, sectionId, { ...sectionRequest, timeLimitSeconds })
    request(`${sections}/${sectionId}`, 'PUT', { ...sectionRequest, timeLimitSeconds })
  })
  it('accepts a bodyless 204 for section deletion', async () => {
    respond(null, 204)
    await expect(deleteSection(packageId, draftId, sectionId)).resolves.toBeUndefined()
    request(`${sections}/${sectionId}`, 'DELETE')
  })
  it.each([[nextSectionId, sectionId], []])('sends exactly one atomic PUT for the full section order %j', async (...ids) => {
    respond(null, 204)
    await expect(reorderSections(packageId, draftId, ids)).resolves.toBeUndefined()
    request(`${sections}/order`, 'PUT', { sectionIds: ids })
  })
  it.each([
    () => getPackage('invalid'),
    () => createDraftVersion('invalid'),
    () => createDraftVersion(packageId, '{broken'),
    () => addSection(packageId, 'invalid', sectionRequest),
    () => updateSection(packageId, draftId, 'invalid', sectionRequest),
    () => deleteSection(packageId, draftId, 'invalid'),
    () => reorderSections(packageId, draftId, ['invalid']),
    () => reorderSections(packageId, draftId, [sectionId, sectionId]),
    () => addSection(packageId, draftId, { ...sectionRequest, title: '' }),
  ])('rejects invalid IDs, bodies and duplicate ordering before fetching', async (action) => {
    await expect(action()).rejects.toBeInstanceOf(ZodError)
    expect(fetchMock).not.toHaveBeenCalled()
  })
  it.each([
    () => getPackage(packageId), () => createDraftVersion(packageId),
    () => addSection(packageId, draftId, sectionRequest),
    () => updateSection(packageId, draftId, sectionId, sectionRequest),
    () => deleteSection(packageId, draftId, sectionId), () => reorderSections(packageId, draftId, []),
  ])('rejects malformed successful responses with Zod validation', async (action) => {
    respond({ unexpected: true })
    await expect(action()).rejects.toBeInstanceOf(ZodError)
  })
  it.each([400, 403, 404, 409])('preserves the backend %i envelope without a retry', async (status) => {
    const body = { message: 'Version cannot be edited', details: { code: 'VERSION_NOT_DRAFT' } }
    respond(body, status)
    await expect(updateSection(packageId, draftId, sectionId, sectionRequest)).rejects.toMatchObject({ status, message: body.message, body })
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })
})
