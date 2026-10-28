import { useState } from 'react'
import { Link } from 'react-router-dom'
import { AdminPage } from '../../pages/AdminPage'
import { downloadCourseTemplate, importCourse, validateCourseImport } from '../api/courseImportApi'
import { importError, importFailureReport, importIssueLabel } from '../lib/importLabels'
import { IMPORT_MAX_BYTES, type ImportIssue, type ImportReport, type ImportSuccess } from '../types'
import '../course-import.css'
import { useAdminError } from '../../lib/useAdminError'

function Issues({ title, issues }: { title: string; issues: ImportIssue[] }) {
  return <section><h2>{title} ({issues.length})</h2>{issues.length ? <div className="adm-table-wrap"><table className="adm-table"><thead><tr><th className="adm-stt" scope="col">STT</th><th>Trang tính</th><th>Dòng Excel</th><th>Cột</th><th>Mã</th><th>Thông báo</th></tr></thead><tbody>{issues.map((issue, index) => <tr key={index}><td className="adm-stt">{index + 1}</td><td>{issue.sheet || 'Cả file'}</td><td>{issue.row === 0 ? 'Cả file' : issue.row}</td><td>{issue.column || '—'}</td><td>{issue.code}</td><td>{importIssueLabel(issue.code)}<p className="adm-muted">{issue.message}</p></td></tr>)}</tbody></table></div> : <p className="adm-muted">Không có {title.toLocaleLowerCase('vi-VN')}.</p>}</section>
}
export function CourseImportPage() {
  const [file, setFile] = useState<File | null>(null)
  const [validatedFile, setValidatedFile] = useState<File | null>(null)
  const [report, setReport] = useState<ImportReport | null>(null)
  const [success, setSuccess] = useState<ImportSuccess | null>(null)
  const [busy, setBusy] = useState(false)
  const [downloading, setDownloading] = useState(false)
  const [, setError] = useAdminError()
  const locked = busy || downloading
  function selectFile(value: File | null) {
    setFile(value); setValidatedFile(null); setReport(null); setSuccess(null); setError(null)
    if (value && value.size > IMPORT_MAX_BYTES) setError('File lớn hơn 5 MB')
    else if (value && (!value.size || !/\.xlsx$/i.test(value.name))) setError('Chọn file Excel .xlsx có dữ liệu')
  }
  const usable = !!file && file.size > 0 && file.size <= IMPORT_MAX_BYTES && /\.xlsx$/i.test(file.name)
  async function validate() {
    if (!file || !usable || locked) return
    setBusy(true); setError(null); setSuccess(null); setValidatedFile(null)
    try { const value = await validateCourseImport(file); setReport(value); if (value.valid && !value.errors.length) setValidatedFile(file) }
    catch (reason) { setError(importError(reason)); setReport(null) }
    finally { setBusy(false) }
  }
  async function submit() {
    if (!file || file !== validatedFile || !report?.valid || report.errors.length || locked || success) return
    setBusy(true); setError(null)
    try { setSuccess(await importCourse(file)); setValidatedFile(null) }
    catch (reason) { const failed = importFailureReport(reason); setValidatedFile(null); if (failed) { setReport(failed); setError('File có lỗi. Sửa các dòng được báo rồi kiểm tra lại.') } else setError(importError(reason)) }
    finally { setBusy(false) }
  }
  async function download() {
    if (locked) return
    setDownloading(true); setError(null)
    try {
      const blob = await downloadCourseTemplate()
      const url = URL.createObjectURL(blob)
      try { const anchor = document.createElement('a'); anchor.href = url; anchor.download = 'course-import-template-v1.xlsx'; document.body.append(anchor); anchor.click(); anchor.remove() }
      finally { URL.revokeObjectURL(url) }
    } catch (reason) { setError(importError(reason)) }
    finally { setDownloading(false) }
  }
  return <AdminPage title="Nhập khóa học từ Excel" subtitle="Kiểm tra file trước khi ghi. Khóa học được tạo chưa kích hoạt; nội dung vẫn ở trạng thái Nháp.">
    <div className="adm-import-workspace"><section className="adm-card"><label className="adm-field"><span>File Excel (.xlsx, tối đa 5 MB)</span><input className="adm-input" type="file" accept=".xlsx" disabled={locked} onChange={(event) => selectFile(event.target.files?.[0] ?? null)} /></label><div className="adm-import-actions"><button className="adm-btn" type="button" disabled={locked} onClick={() => void download()}>{downloading ? 'Đang tải template…' : 'Tải template'}</button><button className="adm-btn" type="button" disabled={locked || !usable} onClick={() => void validate()}>Kiểm tra</button><button className="adm-btn adm-btn--primary" type="button" disabled={locked || !report?.valid || !!report.errors.length || file !== validatedFile || !!success} onClick={() => void submit()}>Import</button></div><p className="adm-muted">Dữ liệu bắt đầu ở dòng 3. Cảnh báo không chặn import. Dòng 0 là vấn đề của cả file.</p>{locked ? <p role="status">Đang xử lý…</p> : null}</section>
      {report ? <><p role="status">{report.valid && !report.errors.length ? 'File hợp lệ, có thể import.' : 'File chưa hợp lệ.'}</p>{report.summary ? <p>Sẽ tạo {report.summary.topics} chủ đề, {report.summary.lessons} bài học, {report.summary.questions} câu hỏi và {report.summary.packages} gói bài.</p> : null}<Issues title="Lỗi" issues={report.errors} /><Issues title="Cảnh báo" issues={report.warnings} /></> : null}
      {success ? <section className="adm-card"><h2>Đã tạo khóa học (chưa kích hoạt)</h2><p>Bài học, câu hỏi và gói bài ở trạng thái Nháp.</p><Link to="/content-author/courses">Mở Khóa học &amp; chủ đề</Link><ul>{success.packageIds.map((id) => <li key={id}><Link to={`/content-author/packages/${id}`}>Hoàn thiện gói bài {id}</Link></li>)}</ul><Issues title="Cảnh báo sau import" issues={success.warnings} /></section> : null}
    </div>
  </AdminPage>
}
