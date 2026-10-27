import { useState } from 'react'
import { Eye, X } from 'lucide-react'
import { AdminModal } from '../../components/AdminLayer'
import { QuestionChooser } from '../../lessons/components/QuestionChooser'
import { SKILL_LABEL, TYPE_LABEL } from '../../questions/lib/labels'
import { useCourseDraftCatalog } from '../lib/courseDraftCatalog'
import { CourseQuestionDetail } from './CourseQuestionDetail'

const isVersionId = (reference: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(reference)

/**
 * The questions of an exercise block, one row each with its short code, type and skill. The text of a question is not
 * printed in the table; the eye button opens the whole question. Choosing happens in a dialog. A version the bank list
 * does not carry keeps a short id, and a reference that is not a version id (a code kept from an imported file) is
 * listed as it is, so both can still be removed.
 */
export function CourseQuestionList({ value, onChange, limit, disabled }: {
  value: readonly string[]; onChange: (next: string[]) => void; limit: number; disabled: boolean
}) {
  const { questions } = useCourseDraftCatalog()
  const [open, setOpen] = useState(false)
  const [viewing, setViewing] = useState<{ questionId: string; versionId: string } | null>(null)
  const byVersion = new Map((questions.data?.content ?? []).filter((question) => question.currentPublishedVersionId).map((question) => [question.currentPublishedVersionId as string, question]))

  return <div className="adm-sec">
    <div className="adm-sec__head">
      <h5 className="adm-sec__title">Câu hỏi<span className="adm-count">{value.length}/{limit}</span></h5>
      <button className="adm-btn adm-btn--small" disabled={disabled} onClick={() => setOpen(true)} type="button">{value.length ? 'Sửa lựa chọn' : 'Chọn câu hỏi'}</button>
    </div>
    <div className="adm-table-wrap adm-kp-table">
      <table aria-label="Câu hỏi của khối" className="adm-table">
        <thead><tr><th className="adm-stt" scope="col">STT</th><th scope="col">Mã</th><th scope="col">Loại</th><th scope="col">Kỹ năng</th><th aria-label="Thao tác" scope="col" /></tr></thead>
        <tbody>{value.length === 0 ? <tr><td className="adm-muted adm-kp-table__empty" colSpan={5}>Chưa chọn câu hỏi nào.</td></tr> : value.map((versionId, index) => {
          const imported = !isVersionId(versionId)
          const question = imported ? undefined : byVersion.get(versionId)
          return <tr key={versionId}>
            <td className="adm-stt">{index + 1}</td>
            <td><code>{imported ? versionId : question ? question.id.slice(0, 8) : versionId.slice(-8)}</code></td>
            <td>{question ? <strong>{TYPE_LABEL[question.questionType] ?? question.questionType}</strong> : <span className="adm-muted">{imported ? 'Mã nhập từ file' : questions.status === 'loading' ? 'Đang tải…' : 'Không tìm thấy trong ngân hàng đã xuất bản'}</span>}</td>
            <td className="adm-muted">{question?.skill ? SKILL_LABEL[question.skill] ?? question.skill : ''}</td>
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
