import { z } from 'zod'
import { apiRequest } from '@/lib/httpClient'
import { contentPackageSchema, packageSectionSchema, packageVersionSchema, sectionOrderSchema, sectionRequestSchema, type SectionRequest } from '../types'

const BASE = '/api/content/admin/packages'
const packagePath = (id: string) => `${BASE}/${z.uuid().parse(id)}`
const sectionsPath = (id: string, versionId: string) => `${packagePath(id)}/versions/${z.uuid().parse(versionId)}/sections`

export async function getPackage(id: string, signal?: AbortSignal) {
  return contentPackageSchema.parse(await apiRequest<unknown>(packagePath(id), { auth: true, signal }))
}

export async function createDraftVersion(id: string, rulesJson = '{}') {
  const rules = z.string().max(20000).refine((value) => { try { JSON.parse(value); return true } catch { return false } }).parse(rulesJson)
  return packageVersionSchema.parse(await apiRequest<unknown>(`${packagePath(id)}/versions`, { auth: true, method: 'POST', body: { rulesJson: rules } }))
}

export async function addSection(id: string, versionId: string, body: SectionRequest) {
  return packageSectionSchema.parse(await apiRequest<unknown>(sectionsPath(id, versionId), { auth: true, method: 'POST', body: sectionRequestSchema.parse(body) }))
}

export async function updateSection(id: string, versionId: string, sectionId: string, body: SectionRequest) {
  return packageSectionSchema.parse(await apiRequest<unknown>(`${sectionsPath(id, versionId)}/${z.uuid().parse(sectionId)}`, { auth: true, method: 'PUT', body: sectionRequestSchema.parse(body) }))
}

export async function deleteSection(id: string, versionId: string, sectionId: string) {
  z.null().parse(await apiRequest<unknown>(`${sectionsPath(id, versionId)}/${z.uuid().parse(sectionId)}`, { auth: true, method: 'DELETE' }))
}

export async function reorderSections(id: string, versionId: string, sectionIds: string[]) {
  z.null().parse(await apiRequest<unknown>(`${sectionsPath(id, versionId)}/order`, { auth: true, method: 'PUT', body: sectionOrderSchema.parse({ sectionIds }) }))
}
