import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { AdminLoading, AdminError } from '../../components/AdminState'
import { AdminPage } from '../../pages/AdminPage'
import { useAdminConfirm } from '../../lib/useAdminConfirm'
import { useAdminError } from '../../lib/useAdminError'
import { useAdminResource } from '../../lib/useAdminResource'
import { deleteImportDraft, getImportDraft, importDraftCourse, saveImportDraft } from '../api/courseImportApi'
import { ImportCoursePreview } from '../components/ImportCoursePreview'
import { ImportIssues } from '../components/ImportIssues'
import { importError, importFailureReport } from '../lib/importLabels'
import type { ImportDraft, ImportSheets, ImportSuccess } from '../types'
import '../course-import.css'

const LIST_PATH = '/content-author/course-import'

/** A kept workbook: look at the course it would make, fix what is wrong, save, and import once it is clean. */
export function CourseImportDraftPage() {
  const { draftId = '' } = useParams()
  const draft = useAdminResource(`import-draft|${draftId}`, (signal) => getImportDraft(draftId, signal))
  return (
    <AdminPage plain title="Bản nháp nhập khóa học" subtitle="Xem khóa học sẽ được tạo từ file, sửa chỗ sai rồi lưu. Chỉ nhập khi không còn lỗi.">
      {draft.status === 'loading' ? <AdminLoading label="Đang tải bản nháp…" /> : null}
      {draft.status === 'error' ? <AdminError message={draft.error ?? 'Không tải được bản nháp.'} onRetry={draft.reload} /> : null}
      {draft.status === 'success' && draft.data ? <DraftEditor detail={draft.data} key={draft.data.id} /> : null}
    </AdminPage>
  )
}

function DraftEditor({ detail: initial }: { detail: ImportDraft }) {
  const navigate = useNavigate()
  const [detail, setDetail] = useState(initial)
  const [sheets, setSheets] = useState<ImportSheets>(initial.sheets)
  const [dirty, setDirty] = useState(false)
  const [busy, setBusy] = useState(false)
  const [success, setSuccess] = useState<ImportSuccess | null>(null)
  const [, setError] = useAdminError()
  const { confirm, confirmDialog } = useAdminConfirm()
  const { report } = detail
  const imported = detail.status === 'IMPORTED'
  const clean = report.valid && !report.errors.length
  const canImport = !busy && !dirty && !imported && clean && !success

  function edit(sheet: string, row: number, column: string, value: string) {
    setSheets((current) => ({ ...current, [sheet]: (current[sheet] ?? []).map((item) => item.number === row ? { ...item, cells: { ...item.cells, [column]: value } } : item) }))
    setDirty(true)
  }
  async function save() {
    if (busy || !dirty) return
    setBusy(true); setError(null)
    try { const saved = await saveImportDraft(detail.id, sheets); setDetail(saved); setSheets(saved.sheets); setDirty(false) }
    catch (reason) { setError(importError(reason)) }
    finally { setBusy(false) }
  }
  async function importNow() {
    if (!canImport) return
    setBusy(true); setError(null)
    try { setSuccess(await importDraftCourse(detail.id)); setDetail({ ...detail, status: 'IMPORTED' }) }
    catch (reason) {
      const failed = importFailureReport(reason)
      if (failed) { setDetail({ ...detail, report: failed }); setError('Bản nháp có lỗi. Sửa các chỗ được báo rồi lưu lại.') } else setError(importError(reason))
    } finally { setBusy(false) }
  }
  async function remove() {
    if (busy) return
    if (!(await confirm({ title: 'Xóa bản nháp?', message: 'Bản nháp và các chỉnh sửa trong đó sẽ mất. Khóa học đã nhập (nếu có) không bị ảnh hưởng.', confirmLabel: 'Xóa', tone: 'danger' }))) return
    setBusy(true); setError(null)
    try { await deleteImportDraft(detail.id); navigate(LIST_PATH) }
    catch (reason) { setError(importError(reason)); setBusy(false) }
  }

  return (
    <div className="adm-import-workspace">
      {confirmDialog}
      <header className="adm-card adm-od">
        <Link className="adm-od__back" to={LIST_PATH}>← Về danh sách bản nháp</Link>
        <div className="adm-od__row">
          <div className="adm-od__title">
            <h2>{detail.filename}</h2>
            <span className={`adm-badge ${imported ? 'adm-badge--ok' : 'adm-badge--muted'}`}>{imported ? 'Đã nhập' : 'Bản nháp'}</span>
          </div>
          <div className="adm-od__actions">
            <button className="adm-btn" disabled={busy} onClick={() => void remove()} type="button">Xóa bản nháp</button>
            <button className="adm-btn" disabled={busy || !dirty || imported} onClick={() => void save()} type="button">Lưu bản nháp</button>
            <button className="adm-btn adm-btn--primary" disabled={!canImport} onClick={() => void importNow()} type="button">Import</button>
          </div>
        </div>
        {report.summary ? (
          <ul aria-label="Nội dung sẽ tạo" className="adm-od__stats">
            <li><strong>{report.summary.topics}</strong> chủ đề</li><li><strong>{report.summary.lessons}</strong> bài học</li>
            <li><strong>{report.summary.questions}</strong> câu hỏi</li><li><strong>{report.summary.packages}</strong> gói bài</li>
          </ul>
        ) : null}
        <p className={`adm-od__status ${imported || clean ? 'adm-od__status--ok' : 'adm-od__status--bad'}`} role="status">
          {imported ? 'Đã nhập thành khóa học. Bản nháp này không sửa được nữa.' : clean ? 'Không còn lỗi, có thể nhập.' : `Còn ${report.errors.length} lỗi cần sửa.`}
          {dirty ? ' Có thay đổi chưa lưu.' : ''}
        </p>
        <p className="adm-muted">{imported ? 'Mở Khóa học & chủ đề để làm tiếp.' : dirty ? 'Lưu bản nháp để kiểm tra lại các thay đổi.' : clean ? 'Import tạo khóa học chưa kích hoạt, nội dung ở trạng thái Nháp. Việc này không thể hoàn tác.' : 'Mở từng mục bên dưới để sửa, rồi lưu bản nháp.'}</p>
        {busy ? <p role="status">Đang xử lý…</p> : null}
      </header>

      {report.outline ? <ImportCoursePreview errors={report.errors} onEdit={imported ? undefined : edit} outline={report.outline} sheets={sheets} warnings={report.warnings} /> : null}
      <ImportIssues issues={report.errors} title="Lỗi" />
      <ImportIssues issues={report.warnings} title="Cảnh báo" />

      {success ? (
        <section className="adm-card">
          <h2>Đã tạo khóa học (chưa kích hoạt)</h2>
          <p>Đã tạo {success.topicIds.length} chủ đề, {success.lessonIds.length} bài học, {success.questionIds.length} câu hỏi và {success.packageIds.length} gói bài. Bài học, câu hỏi và gói bài ở trạng thái Nháp.</p>
          <h3>Việc cần hoàn thiện</h3>
          <ul className="adm-import-tasks">
            <li>Kích hoạt khóa học và các chủ đề.</li><li>Xuất bản bài học, câu hỏi và gói bài sau khi rà soát nội dung.</li>
            <li>Thêm từ vựng, ảnh, audio và tài liệu cho từng bài học.</li><li>Thêm mô tả, ảnh bìa, banner và điểm mở khóa cho khóa học.</li>
            <li>Chọn nguồn đề cho từng gói mốc practice test.</li>
          </ul>
          <Link to="/content-author/courses">Mở Khóa học &amp; chủ đề</Link>
          <ul>{success.packageIds.map((id) => <li key={id}><Link to={`/content-author/packages/${id}`}>Hoàn thiện gói bài {success.packageTitles?.[id] ?? 'Gói bài'}</Link></li>)}</ul>
          <ImportIssues issues={success.warnings} title="Cảnh báo sau import" />
        </section>
      ) : null}
    </div>
  )
}
