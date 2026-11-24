import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { AdminField } from '../../components/AdminField'
import { AdminPage } from '../../pages/AdminPage'
import { createImportDraft, deleteImportDraft, downloadCourseTemplate, listImportDrafts } from '../api/courseImportApi'
import { importError, importFailureReport } from '../lib/importLabels'
import { IMPORT_MAX_BYTES, type ImportReport } from '../types'
import { ImportIssues } from '../components/ImportIssues'
import '../course-import.css'
import { useAdminError } from '../../lib/useAdminError'
import { useAdminConfirm } from '../../lib/useAdminConfirm'
import { useAdminResource } from '../../lib/useAdminResource'
import { AdminModal } from '../../components/AdminLayer'
import { AdminLoading, AdminError } from '../../components/AdminState'
import { fetchKnowledgeTree } from '../../knowledge-graph/api/knowledgeGraphApi'
import { fetchErrorTypes } from '../../error-types/api/errorTypeApi'
import { CourseKnowledgeDialog } from '../../course-drafts/components/CourseKnowledgeDialog'
import { ERROR_CATEGORY_LABEL } from '../../error-types/lib/errorTypeLabels'

const DRAFT_PATH = '/content-author/course-import'

function KnowledgeLookup({ onClose }: { onClose: () => void }) {
  const points = useAdminResource("import-knowledge-points", (signal) => fetchKnowledgeTree({ includeInactive: false }, signal))
  if (points.status === "success") return <CourseKnowledgeDialog offered={points.data?.nodes ?? []} picked={[]} limit={0} description="Tra cứu mã điểm kiến thức đang hoạt động trong danh mục." onChange={() => undefined} onClose={onClose} />
  return <AdminModal title="Tra cứu mã điểm kiến thức" onClose={onClose}>{() => points.status === "loading" ? <AdminLoading label="Đang tải điểm kiến thức…" /> : <AdminError message={points.error ?? "Chưa tải được danh mục điểm kiến thức."} onRetry={points.reload} />}</AdminModal>
}

function ErrorLookup({ onClose }: { onClose: () => void }) {
  const errorTypes = useAdminResource("import-error-types", fetchErrorTypes)
  return <AdminModal title="Tra cứu mã lỗi" description="Mã lỗi đang hoạt động và đã duyệt trong danh mục." onClose={onClose}>{() => errorTypes.status === "loading" ? <AdminLoading label="Đang tải mã lỗi…" /> : errorTypes.status === "error" ? <AdminError message={errorTypes.error ?? "Chưa tải được danh mục mã lỗi."} onRetry={errorTypes.reload} /> : <div className="adm-table-wrap"><table className="adm-table"><thead><tr><th>Mã</th><th>Tên</th><th>Nhóm</th></tr></thead><tbody>{(errorTypes.data ?? []).filter((item) => item.status === "ACTIVE" && item.reviewStatus === "APPROVED").map((item) => <tr key={item.id}><td><code>{item.code}</code></td><td>{item.name}</td><td>{ERROR_CATEGORY_LABEL[item.category]}</td></tr>)}</tbody></table></div>}</AdminModal>
}

/** Pick a workbook and check it: the check keeps it as a draft and opens the draft, where the problems are shown. */
export function CourseImportPage() {
  const navigate = useNavigate()
  const [file, setFile] = useState<File | null>(null)
  const [refused, setRefused] = useState<ImportReport | null>(null)
  const [busy, setBusy] = useState(false)
  const [downloading, setDownloading] = useState(false)
  const [, setError] = useAdminError()
  const { confirm, confirmDialog } = useAdminConfirm()
  const drafts = useAdminResource('import-drafts', (signal) => listImportDrafts(signal))
  const locked = busy || downloading
  const [lookup, setLookup] = useState<'knowledge' | 'errors' | null>(null)
  function selectFile(value: File | null) {
    setFile(value); setRefused(null); setError(null)
  }
  // A file that cannot be imported is refused under the input as soon as it is chosen.
  const fileError = !file ? undefined
    : file.size > IMPORT_MAX_BYTES ? 'File lớn hơn 5 MB.'
    : !file.size || !/\.xlsx$/i.test(file.name) ? 'Chọn file Excel .xlsx có dữ liệu.'
    : undefined
  const usable = !!file && !fileError
  async function check() {
    if (!file || !usable || locked) return
    setBusy(true); setError(null); setRefused(null)
    try { const draft = await createImportDraft(file); navigate(`${DRAFT_PATH}/${draft.id}`) }
    catch (reason) { const failed = importFailureReport(reason); if (failed) setRefused(failed); else setError(importError(reason)); setBusy(false) }
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
  async function remove(id: string, name: string) {
    if (!(await confirm({ title: 'Xóa bản nháp?', message: `Bản nháp “${name}” và các chỉnh sửa trong đó sẽ mất.`, confirmLabel: 'Xóa', tone: 'danger' }))) return
    try { await deleteImportDraft(id); drafts.reload() } catch (reason) { setError(importError(reason)) }
  }
  return <AdminPage title="Nhập khóa học từ Excel" subtitle="Kiểm tra file sẽ lưu thành bản nháp để bạn xem lỗi và sửa. Khóa học chỉ được tạo khi bạn nhập bản nháp, chưa kích hoạt; nội dung vẫn ở trạng thái Nháp.">
    {confirmDialog}
    <div className="adm-import-workspace"><section className="adm-card"><AdminField label="File Excel (.xlsx, tối đa 5 MB)" error={fileError} required><input className="adm-input" type="file" accept=".xlsx" disabled={locked} onChange={(event) => selectFile(event.target.files?.[0] ?? null)} /></AdminField><div className="adm-import-actions"><button className="adm-btn" type="button" onClick={() => setLookup('knowledge')}>Tra cứu mã điểm kiến thức</button><button className="adm-btn" type="button" onClick={() => setLookup('errors')}>Tra cứu mã lỗi</button><button className="adm-btn" type="button" disabled={locked} onClick={() => void download()}>{downloading ? 'Đang tải template…' : 'Tải template'}</button><button className="adm-btn adm-btn--primary" type="button" disabled={locked || !usable} onClick={() => void check()}>Kiểm tra</button></div><p className="adm-muted">Dữ liệu bắt đầu ở dòng 3. Bấm Kiểm tra để lưu file thành bản nháp và xem lỗi ngay trong bản nháp.</p><p className="adm-muted">{!file ? 'Chọn file .xlsx hợp lệ để bật Kiểm tra.' : !usable ? 'Sửa lỗi file để bật Kiểm tra.' : 'Sẵn sàng kiểm tra.'}</p>{locked ? <p role="status">Đang xử lý…</p> : null}</section>
      {refused ? <><p role="status">File chưa đọc được nên chưa lưu bản nháp.</p><ImportIssues title="Lỗi" issues={refused.errors} /></> : null}
      <section className="adm-card">
        <h2>Bản nháp của bạn</h2>
        {drafts.status === 'loading' ? <AdminLoading label="Đang tải bản nháp…" /> : null}
        {drafts.status === 'error' ? <AdminError message={drafts.error ?? 'Không tải được danh sách.'} onRetry={drafts.reload} /> : null}
        {drafts.status === 'success' && !(drafts.data ?? []).length ? <p className="adm-muted">Chưa có bản nháp nào. Chọn file và bấm Kiểm tra để tạo.</p> : null}
        {drafts.status === 'success' && (drafts.data ?? []).length ? (
          <div className="adm-table-wrap"><table className="adm-table"><thead><tr><th>File</th><th>Khóa học</th><th>Trạng thái</th><th>Cập nhật</th><th /></tr></thead><tbody>
            {(drafts.data ?? []).map((item) => (
              <tr key={item.id}>
                <td>{item.filename}</td><td>{item.courseCode ? <><code>{item.courseCode}</code> {item.courseName}</> : '—'}</td>
                <td><span className={`adm-badge ${item.status === 'IMPORTED' ? 'adm-badge--ok' : 'adm-badge--muted'}`}>{item.status === 'IMPORTED' ? 'Đã nhập' : 'Bản nháp'}</span></td>
                <td>{new Date(item.updatedAt).toLocaleString('vi-VN')}</td>
                <td><Link className="adm-btn adm-btn--small" to={`${DRAFT_PATH}/${item.id}`}>Mở</Link>{' '}<button className="adm-btn adm-btn--small" onClick={() => void remove(item.id, item.filename)} type="button">Xóa</button></td>
              </tr>
            ))}
          </tbody></table></div>
        ) : null}
      </section>
      {lookup === 'knowledge' ? <KnowledgeLookup onClose={() => setLookup(null)} /> : null}
      {lookup === 'errors' ? <ErrorLookup onClose={() => setLookup(null)} /> : null}
    </div>
  </AdminPage>
}
