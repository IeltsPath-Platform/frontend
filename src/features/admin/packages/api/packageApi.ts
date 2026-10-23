import { z } from 'zod'
import { apiRequest } from '@/lib/httpClient'
import {
  AUDIO_CONTENT_TYPES, AUDIO_MAX_BYTES, addSectionQuestionRequestSchema, audioRequestSchema, audioUploadSchema,
  contentPackageSchema, createPackageRequestSchema, packageFiltersSchema, packageListItemSchema, packagePreviewSchema,
  packageSectionSchema, packageVersionSchema, passageRequestSchema, practiceSourceSchema, publicationScheduleSchema,
  publishedPackageSchema, sectionAudioSchema, sectionOrderSchema, sectionQuestionOrderSchema, sectionQuestionSchema, sectionRequestSchema,
  type AddSectionQuestionRequest, type AudioRequest, type CreatePackageRequest, type PackageFilters, type PassageRequest, type SectionRequest,
} from '../types'

const BASE = '/api/content/admin/packages'
const packagePath = (id: string) => `${BASE}/${z.uuid().parse(id)}`
const sectionsPath = (id: string, versionId: string) => `${packagePath(id)}/versions/${z.uuid().parse(versionId)}/sections`
const versionPath = (id: string, versionId: string) => `${packagePath(id)}/versions/${z.uuid().parse(versionId)}`
const sectionPath = (id: string, versionId: string, sectionId: string) => `${sectionsPath(id, versionId)}/${z.uuid().parse(sectionId)}`

export async function listPackages(filters: PackageFilters = {}, signal?: AbortSignal) {
  const params = new URLSearchParams()
  for (const [key, value] of Object.entries(packageFiltersSchema.parse(filters))) if (value !== undefined) params.set(key, value)
  return z.array(packageListItemSchema).parse(await apiRequest<unknown>(`${BASE}${params.size ? `?${params}` : ''}`, { auth: true, signal }))
}

export async function createPackage(body: CreatePackageRequest) {
  return contentPackageSchema.parse(await apiRequest<unknown>(BASE, { auth: true, method: 'POST', body: createPackageRequestSchema.parse(body) }))
}

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

export async function addSectionQuestion(id: string, versionId: string, sectionId: string, body: AddSectionQuestionRequest) {
  return sectionQuestionSchema.parse(await apiRequest<unknown>(`${sectionPath(id, versionId, sectionId)}/questions`, { auth: true, method: 'POST', body: addSectionQuestionRequestSchema.parse(body) }))
}

export async function removeSectionQuestion(id: string, versionId: string, sectionId: string, sectionQuestionId: string) {
  z.null().parse(await apiRequest<unknown>(`${sectionPath(id, versionId, sectionId)}/questions/${z.uuid().parse(sectionQuestionId)}`, { auth: true, method: 'DELETE' }))
}

export async function reorderSectionQuestions(id: string, versionId: string, sectionId: string, sectionQuestionIds: string[]) {
  z.null().parse(await apiRequest<unknown>(`${sectionPath(id, versionId, sectionId)}/questions/order`, { auth: true, method: 'PUT', body: sectionQuestionOrderSchema.parse({ sectionQuestionIds }) }))
}

export async function updatePassage(id: string, versionId: string, sectionId: string, body: PassageRequest) {
  return z.object({ passage: z.string() }).parse(await apiRequest<unknown>(`${sectionPath(id, versionId, sectionId)}/passage`, { auth: true, method: 'PUT', body: passageRequestSchema.parse(body) }))
}

export async function deletePassage(id: string, versionId: string, sectionId: string) {
  z.null().parse(await apiRequest<unknown>(`${sectionPath(id, versionId, sectionId)}/passage`, { auth: true, method: 'DELETE' }))
}

export async function updateAudio(id: string, versionId: string, sectionId: string, body: AudioRequest) {
  return sectionAudioSchema.parse(await apiRequest<unknown>(`${sectionPath(id, versionId, sectionId)}/audio`, { auth: true, method: 'PUT', body: audioRequestSchema.parse(body) }))
}

export async function deleteAudio(id: string, versionId: string, sectionId: string) {
  z.null().parse(await apiRequest<unknown>(`${sectionPath(id, versionId, sectionId)}/audio`, { auth: true, method: 'DELETE' }))
}

export async function uploadAudio(file: File) {
  z.file().min(1).max(AUDIO_MAX_BYTES).mime([...AUDIO_CONTENT_TYPES]).parse(file)
  const body = new FormData()
  body.append('file', file)
  return audioUploadSchema.parse(await apiRequest<unknown>('/api/content/admin/media/audio', { auth: true, method: 'POST', body }))
}

export async function previewVersion(id: string, versionId: string, signal?: AbortSignal) {
  return packagePreviewSchema.parse(await apiRequest<unknown>(`${versionPath(id, versionId)}/preview`, { auth: true, signal }))
}

export async function publishVersion(id: string, versionId: string) {
  const packageId = z.uuid().parse(id)
  return publishedPackageSchema.parse(await apiRequest<unknown>(`/api/content/packages/${packageId}/publish`, { auth: true, method: 'POST', body: { versionId: z.uuid().parse(versionId) } }))
}

export async function scheduleVersion(id: string, versionId: string, publishAt: string) {
  const instant = z.iso.datetime({ offset: true }).refine((value) => Date.parse(value) > Date.now(), { message: 'Thời gian xuất bản phải ở tương lai.' }).parse(publishAt)
  return publicationScheduleSchema.parse(await apiRequest<unknown>(`${versionPath(id, versionId)}/schedule`, { auth: true, method: 'PUT', body: { publishAt: instant } }))
}

export async function cancelSchedule(id: string, versionId: string) {
  z.null().parse(await apiRequest<unknown>(`${versionPath(id, versionId)}/schedule`, { auth: true, method: 'DELETE' }))
}

export async function listSchedules(id: string, signal?: AbortSignal) {
  return z.array(publicationScheduleSchema).parse(await apiRequest<unknown>(`${packagePath(id)}/publication-schedules`, { auth: true, signal }))
}

export async function listPracticeSources(signal?: AbortSignal) {
  return z.array(practiceSourceSchema).parse(await apiRequest<unknown>('/api/content/practice-tests/sources', { auth: true, signal }))
}
