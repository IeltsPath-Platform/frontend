import { QuestionChooser } from '../../lessons/components/QuestionChooser'
import { KnowledgePointPicker } from '../../questions/components/KnowledgePointPicker'
import type { CourseBlock } from '../types'

const isVersionId = (reference: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(reference)

export function CourseBlockEditor({ value, onChange, disabled, number }: {
  value: CourseBlock; onChange: (next: CourseBlock) => void; disabled: boolean; number: number
}) {
  return <div className="adm-course-draft-block">
    <h5>Khối {number} · {value.type === 'TEXT' ? 'Văn bản' : 'Bài tập'}</h5>
    {value.type === 'TEXT' ? <>
      <label className="adm-field"><span>Nội dung khối {number}</span><textarea className="adm-textarea" maxLength={20000} value={value.text ?? ''} onChange={(event) => onChange({ ...value, text: event.target.value })} /></label>
      <details><summary>Điểm kiến thức khối {number} ({value.knowledgePointIds.length}/50)</summary><KnowledgePointPicker value={value.knowledgePointIds.map((knowledgePointId) => ({ knowledgePointId, weight: 1 }))} onChange={(next) => { if (next.length <= 50) onChange({ ...value, knowledgePointIds: next.map((item) => item.knowledgePointId) }) }} /></details>
    </> : <>
      <QuestionChooser purpose="LEARNING" known={[]} value={value.questionRefs.filter(isVersionId)} onChange={(next) => {
        const references = value.questionRefs.filter((reference) => !isVersionId(reference) || next.includes(reference))
        next.forEach((reference) => { if (!references.includes(reference)) references.push(reference) })
        if (references.length <= 100) onChange({ ...value, questionRefs: references })
      }} />
      <details><summary>UUID hoặc importRef ({value.questionRefs.length}/100)</summary>
        <p className="adm-muted">Dùng UUID của phiên bản câu hỏi hoặc mã importRef đã có trong ngân hàng. Phân tích sẽ kiểm tra các tham chiếu.</p>
        {value.questionRefs.map((reference, index) => <div className="adm-course-draft-reference" key={index}>
          <label className="adm-field"><span>Tham chiếu câu {index + 1} của khối {number}</span><input className="adm-input" maxLength={100} value={reference} onChange={(event) => onChange({ ...value, questionRefs: value.questionRefs.map((item, position) => position === index ? event.target.value : item) })} /></label>
          <button className="adm-btn" type="button" disabled={disabled} onClick={() => onChange({ ...value, questionRefs: value.questionRefs.filter((_, position) => position !== index) })}>Gỡ tham chiếu {index + 1}</button>
        </div>)}
        <button className="adm-btn" type="button" disabled={disabled || value.questionRefs.length >= 100} onClick={() => onChange({ ...value, questionRefs: [...value.questionRefs, ''] })}>Thêm tham chiếu câu</button>
      </details>
    </>}
  </div>
}
