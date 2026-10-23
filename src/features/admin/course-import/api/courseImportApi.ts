import { apiDownload, apiRequest, HttpError } from '@/lib/httpClient'
import { IMPORT_MAX_BYTES, importReportSchema, importSuccessSchema } from '../types'

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
