import { apiDownload, apiRequest, HttpError } from '@/lib/httpClient'
import { z } from 'zod'
import { IMPORT_MAX_BYTES, importDraftSchema, importDraftSummarySchema, importReportSchema, importSuccessSchema, type ImportSheets } from '../types'

const BASE = '/api/content/admin/course-import'
function fileBody(file: File) {
  if (file.size > IMPORT_MAX_BYTES) throw new HttpError(413, 'File lớn hơn 5 MB', { details: { code: 'FILE_TOO_LARGE' } })
  if (!file.size || !/\.xlsx$/i.test(file.name)) throw new HttpError(400, 'Chọn file Excel .xlsx có dữ liệu', { details: { code: 'NOT_XLSX' } })
  const body = new FormData(); body.append('file', file); return body
}
export function downloadCourseTemplate(signal?: AbortSignal) { return apiDownload(`${BASE}/template`, { signal }) }
export async function validateCourseImport(file: File) {
  return importReportSchema.parse(await apiRequest<unknown>(`${BASE}/validate`, { auth: true, method: 'POST', body: fileBody(file) }))
}
export async function importCourse(file: File) {
  return importSuccessSchema.parse(await apiRequest<unknown>(BASE, { auth: true, method: 'POST', body: fileBody(file) }))
}

const DRAFTS = `${BASE}/drafts`
/** Keeps the checked file as a draft the author can open again. A file that cannot be read is refused with 422. */
export async function createImportDraft(file: File) {
  return importDraftSchema.parse(await apiRequest<unknown>(DRAFTS, { auth: true, method: 'POST', body: fileBody(file) }))
}
export async function listImportDrafts(signal?: AbortSignal) {
  return z.array(importDraftSummarySchema).parse(await apiRequest<unknown>(DRAFTS, { auth: true, signal }))
}
export async function getImportDraft(id: string, signal?: AbortSignal) {
  return importDraftSchema.parse(await apiRequest<unknown>(`${DRAFTS}/${id}`, { auth: true, signal }))
}
export async function saveImportDraft(id: string, sheets: ImportSheets) {
  return importDraftSchema.parse(await apiRequest<unknown>(`${DRAFTS}/${id}`, { auth: true, method: 'PUT', body: { sheets } }))
}
export async function importDraftCourse(id: string) {
  return importSuccessSchema.parse(await apiRequest<unknown>(`${DRAFTS}/${id}/import`, { auth: true, method: 'POST' }))
}
export async function deleteImportDraft(id: string) {
  await apiRequest<unknown>(`${DRAFTS}/${id}`, { auth: true, method: 'DELETE' })
}
