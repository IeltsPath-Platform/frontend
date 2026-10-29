import { useState } from 'react'
import { Eye, X } from 'lucide-react'
import { AdminModal } from '../../components/AdminLayer'
import { QuestionChooser } from '../../lessons/components/QuestionChooser'
import { TYPE_LABEL } from '../../questions/lib/labels'
import { useCourseDraftCatalog } from '../lib/courseDraftCatalog'
import { useQuestionStems } from '../lib/useQuestionStems'
import { CourseQuestionDetail } from './CourseQuestionDetail'

const isVersionId = (reference: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(reference)

/**
 * The questions of an exercise block, one row each: the question's text cut to one line, so the questions can be told
 * apart, and its type. The eye button opens the whole question with its knowledge points. Choosing happens in a dialog.
 * A version the bank list does not carry keeps a short id, and a reference that is not a version id (a code kept from an
 * imported file) is listed as it is, so both can still be removed.
 */
export function CourseQuestionList({ value, onChange, limit, disabled }: {
  value: readonly string[]; onChange: (next: string[]) => void; limit: number; disabled: boolean
}) {
  const { questions } = useCourseDraftCatalog()
  const [open, setOpen] = useState(false)
  const [viewing, setViewing] = useState<{ questionId: string; versionId: string } | null>(null)
  const byVersion = new Map((questions.data?.content ?? []).filter((question) => question.currentPublishedVersionId).map((question) => [question.currentPublishedVersionId as string, question]))
  const stems = useQuestionStems(value.flatMap((versionId) => {
    const question = isVersionId(versionId) ? byVersion.get(versionId) : undefined
    return question ? [{ questionId: question.id, versionId }] : []
  }))

  return <div className="adm-sec">
    <div className="adm-sec__head">
      <h5 className="adm-sec__title">Câu hỏi<span className="adm-count">{value.length}/{limit}</span></h5>
      <button className="adm-btn adm-btn--small" disabled={disabled} onClick={() => setOpen(true)} type="button">{value.length ? 'Sửa lựa chọn' : 'Chọn câu hỏi'}</button>
    </div>
    <div className="adm-table-wrap adm-kp-table">
      <table aria-label="Câu hỏi của khối" className="adm-table">
        <thead><tr><th className="adm-stt" scope="col">STT</th><th scope="col">Đề bài</th><th scope="col">Loại</th><th aria-label="Thao tác" scope="col" /></tr></thead>
        <tbody>{value.length === 0 ? <tr><td className="adm-muted adm-kp-table__empty" colSpan={4}>Chưa chọn câu hỏi nào.</td></tr> : value.map((versionId, index) => {
          const imported = !isVersionId(versionId)
          const question = imported ? undefined : byVersion.get(versionId)
          const stem = stems.data?.get(versionId)
          return <tr key={versionId}>
            <td className="adm-stt">{index + 1}</td>
            <td className="adm-qrow__stem">{stem !== undefined
              ? <span title={stem}>{stem || '(không có nội dung)'}</span>
              : question ? <span className="adm-muted">{stems.status === 'loading' ? 'Đang tải…' : 'Không tải được đề bài'}</span>
              : <code>{imported ? versionId : versionId.slice(-8)}</code>}</td>
            <td className="adm-qrow__type">{question ? <span className="adm-muted">{TYPE_LABEL[question.questionType] ?? question.questionType}</span> : <span className="adm-muted">{imported ? 'Mã nhập từ file' : questions.status === 'loading' ? 'Đang tải…' : 'Không tìm thấy trong ngân hàng đã xuất bản'}</span>}</td>
            <td className="adm-kp-table__remove adm-qrow__tools">
              {question ? <button aria-label={`Xem chi tiết câu hỏi ${index + 1}`} onClick={() => setViewing({ questionId: question.id, versionId })} type="button"><Eye aria-hidden="true" size={16} /></button> : null}
              <button aria-label={`Bỏ câu hỏi ${index + 1}`} disabled={disabled} onClick={() => onChange(value.filter((item) => item !== versionId))} type="button"><X aria-hidden="true" size={16} /></button>
            </td>
          </tr>
        })}</tbody>
      </table>
    </div>
    {viewing ? <CourseQuestionDetail onClose={() => setViewing(null)} questionId={viewing.questionId} versionId={viewing.versionId} /> : null}
    {open ? <AdminModal title="Chọn câu hỏi cho khối" description="Câu hỏi đã xuất bản dành cho bài học" stacked onClose={() => setOpen(false)}>
      {(close) => <>
        <QuestionChooser hideSelected known={[]} onChange={(next) => { const merged = [...value.filter((reference) => !isVersionId(reference)), ...next]; if (merged.length <= limit) onChange(merged) }} purpose="LEARNING" value={value.filter(isVersionId)} />
        <div className="adm-sec__foot"><span className="adm-muted">{value.length}/{limit} đã chọn</span><button className="adm-btn adm-btn--primary" onClick={close} type="button">Lưu</button></div>
      </>}
    </AdminModal> : null}
  </div>
}
