import { AdminField } from '../../components/AdminField'
import { AdminDrawer } from '../../components/AdminLayer'
import { importIssueLabel } from '../lib/importLabels'
import type { ImportIssue } from '../types'

interface FieldSpec { column: string; label: string; required?: boolean; long?: boolean }

/** The fields of each workbook sheet, labelled as the create screens label them. */
const SHEETS: Record<string, { title: string; fields: FieldSpec[] }> = {
  Course: { title: 'Khóa học', fields: [
    { column: 'code', label: 'Mã khóa học', required: true }, { column: 'name', label: 'Tên khóa học', required: true }, { column: 'bandLevel', label: 'Band', required: true },
  ] },
  Topics: { title: 'Chủ đề', fields: [
    { column: 'code', label: 'Mã chủ đề', required: true }, { column: 'name', label: 'Tên chủ đề', required: true },
    { column: 'skill', label: 'Kỹ năng', required: true }, { column: 'sortOrder', label: 'Thứ tự', required: true },
  ] },
  Lessons: { title: 'Bài học', fields: [
    { column: 'code', label: 'Mã bài học', required: true }, { column: 'topicCode', label: 'Chủ đề', required: true },
    { column: 'title', label: 'Tiêu đề', required: true }, { column: 'summary', label: 'Tóm tắt', long: true },
    { column: 'sortOrder', label: 'Thứ tự' }, { column: 'knowledgePointCodes', label: 'Điểm kiến thức' },
  ] },
  Blocks: { title: 'Khối nội dung', fields: [
    { column: 'lessonCode', label: 'Bài học', required: true }, { column: 'type', label: 'Loại khối', required: true }, { column: 'sortOrder', label: 'Thứ tự' },
    { column: 'text', label: 'Văn bản', long: true }, { column: 'questionRefs', label: 'Câu hỏi' }, { column: 'knowledgePointCodes', label: 'Điểm kiến thức' },
  ] },
  Questions: { title: 'Câu hỏi', fields: [
    { column: 'importRef', label: 'Mã tham chiếu', required: true }, { column: 'type', label: 'Loại câu hỏi', required: true },
    { column: 'skill', label: 'Kỹ năng', required: true }, { column: 'stem', label: 'Nội dung câu hỏi', required: true, long: true },
    ...(['A', 'B', 'C', 'D', 'E', 'F'].map((key) => ({ column: `option${key}`, label: `Phương án ${key}` }))),
    { column: 'answer', label: 'Đáp án', required: true }, { column: 'explanation', label: 'Giải thích', required: true, long: true },
    { column: 'difficulty', label: 'Độ khó', required: true }, { column: 'knowledgePointCodes', label: 'Điểm kiến thức', required: true },
    { column: 'distractorErrorCodes', label: 'Mã lỗi của phương án sai' },
  ] },
  PracticeSets: { title: 'Gói luyện tập', fields: [
    { column: 'packageCode', label: 'Mã gói', required: true }, { column: 'title', label: 'Tên gói', required: true },
    { column: 'lessonCode', label: 'Bài học', required: true }, { column: 'questionRefs', label: 'Câu hỏi', required: true },
  ] },
  Tests: { title: 'Bài thi', fields: [
    { column: 'kind', label: 'Loại bài thi', required: true }, { column: 'packageCode', label: 'Mã gói', required: true },
    { column: 'title', label: 'Tên gói', required: true }, { column: 'topicCode', label: 'Chủ đề' },
    { column: 'afterTopicSequence', label: 'Đặt sau chủ đề số' }, { column: 'questionRefs', label: 'Câu hỏi', required: true },
  ] },
}

/** The read-only fields of one workbook row; each field the checks flagged shows the reason right under it. */
export function ImportFields({ sheet, row, cells, errors, warnings, onChange, omit = [] }: {
  /** Columns shown elsewhere on the screen. */
  omit?: string[]
  sheet: string
  row: number
  cells: Record<string, string>
  errors: ImportIssue[]
  warnings: ImportIssue[]
  /** Set when the draft can be edited: the fields take typing. */
  onChange?: (column: string, value: string) => void
}) {
  const spec = SHEETS[sheet]
  if (!spec) return null
  const mine = (issues: ImportIssue[]) => issues.filter((issue) => issue.sheet === sheet && issue.row === row)
  const rowErrors = mine(errors)
  const rowWarnings = mine(warnings)
  const note = (column: string) => rowErrors.filter((issue) => issue.column === column).map((issue) => `${importIssueLabel(issue.code)}.`).join(' ') || undefined
  const known = new Set(spec.fields.map((field) => field.column))
  const other = [...rowErrors, ...rowWarnings].filter((issue) => !known.has(issue.column))
  const fields = spec.fields.filter((field) => !omit.includes(field.column))
  const shown = onChange ? fields : fields.filter((field) => cells[field.column] || note(field.column) || field.required)
  return (
    <div className="adm-ot__drawer">
      {rowErrors.length ? <p className="adm-ot__summary" role="status">Có {rowErrors.length} lỗi trong mục này. Sửa trong file Excel rồi kiểm tra lại.</p> : null}
      {shown.map((field) => (
        <AdminField error={note(field.column)} key={field.column} label={field.label} required={field.required}>
          {field.long
            ? <textarea className="adm-input" onChange={(event) => onChange?.(field.column, event.target.value)} readOnly={!onChange} rows={3} value={cells[field.column] ?? ''} />
            : <input className="adm-input" onChange={(event) => onChange?.(field.column, event.target.value)} readOnly={!onChange} value={cells[field.column] ?? ''} />}
        </AdminField>
      ))}
      {other.length ? (
        <div className="adm-ot__other">
          <h3>Ghi chú khác</h3>
          <ul>{other.map((issue, index) => <li key={index}>{issue.column ? `${issue.column}: ` : ''}{importIssueLabel(issue.code)}</li>)}</ul>
        </div>
      ) : null}
    </div>
  )
}

/** A read-only look at one row of the workbook, laid out like the screen that creates it. */
export function ImportRowDrawer({ sheet, row, cells, errors, warnings, onClose, onChange, stacked = false }: {
  sheet: string
  row: number
  cells: Record<string, string>
  errors: ImportIssue[]
  warnings: ImportIssue[]
  onClose: () => void
  onChange?: (column: string, value: string) => void
  stacked?: boolean
}) {
  const spec = SHEETS[sheet]
  if (!spec) return null
  const count = errors.filter((issue) => issue.sheet === sheet && issue.row === row).length
  return (
    <AdminDrawer
      badge={count ? <span className="adm-badge adm-badge--danger">{count} lỗi</span> : <span className="adm-badge adm-badge--ok">Hợp lệ</span>}
      description={onChange ? `Dòng ${row} của trang tính ${sheet}. Sửa rồi bấm Lưu bản nháp ở trang.` : `Dòng ${row} của trang tính ${sheet}. Dữ liệu từ file Excel, chỉ để xem.`}
      onClose={onClose}
      stacked={stacked}
      title={spec.title}
    >
      {() => <ImportFields cells={cells} errors={errors} onChange={onChange} row={row} sheet={sheet} warnings={warnings} />}
    </AdminDrawer>
  )
}
