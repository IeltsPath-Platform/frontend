import { AdminError, AdminLoading } from '../../components/AdminState'
import { useAdminResource } from '../../lib/useAdminResource'
import { getQuestion, listVersionPassages } from '../../questions/api/questionApi'
import { describeAnswerSpec } from '../../questions/lib/versionForm'
import { DIFFICULTY_LABEL, SKILL_LABEL, TYPE_LABEL } from '../../questions/lib/labels'

/**
 * One question as the learner gets it, read when it first shows: type, the passage that goes with it (when asked for),
 * the text, the options, the answer and the explanation. Used by the question dialog and by the practice-set dialog.
 */
export function CourseQuestionContent({ questionId, versionId, withPassages = true }: { questionId: string; versionId: string; withPassages?: boolean }) {
  const detail = useAdminResource(`course-question-detail:${questionId}`, (signal) => getQuestion(questionId, signal))
  const passages = useAdminResource(`course-question-passages:${withPassages ? versionId : 'none'}`, (signal) => withPassages ? listVersionPassages(versionId, signal) : Promise.resolve([]))
  const version = detail.data?.versions?.find((item) => item.id === versionId)
  if (detail.status === 'loading') return <AdminLoading label="Đang tải câu hỏi…" />
  if (detail.status === 'error') return <AdminError message={detail.error ?? 'Không tải được câu hỏi.'} onRetry={detail.reload} />
  if (!version) return <p className="adm-muted">Không tìm thấy phiên bản câu hỏi này.</p>
  return <div className="adm-qdetail">
    <p className="adm-qdetail__badges">
      <span className="adm-badge">{TYPE_LABEL[detail.data!.questionType] ?? detail.data!.questionType}</span>
      {detail.data!.skill ? <span className="adm-badge adm-badge--muted">{SKILL_LABEL[detail.data!.skill] ?? detail.data!.skill}</span> : null}
      {version.difficulty ? <span className="adm-badge adm-badge--muted">{DIFFICULTY_LABEL[version.difficulty] ?? version.difficulty}</span> : null}
    </p>
    {withPassages && passages.status === 'success' && passages.data?.length ? <>
      <h3>Đoạn văn đi kèm</h3>
      {passages.data.map((passage) => <section aria-label="Đoạn văn đi kèm" className="adm-qdetail__passage" key={passage.assetId}>
        <p className="adm-qdetail__stem">{passage.text}</p>
        <small className="adm-muted">{passage.source === 'LESSON' ? `Lấy từ bài học: ${passage.sourceName}` : passage.source === 'SECTION' ? `Lấy từ phần thi: ${passage.sourceName}` : 'Gắn trực tiếp với câu hỏi'}</small>
      </section>)}
    </> : null}
    {withPassages && passages.status === 'success' && !passages.data?.length ? <p className="adm-muted">Không tìm thấy đoạn văn đi kèm. Nếu đề bài nhắc tới một đoạn, đoạn đó chưa được gắn với câu hỏi này.</p> : null}
    {withPassages && passages.status === 'error' ? <AdminError message="Không tải được đoạn văn đi kèm." onRetry={passages.reload} /> : null}
    <h3>Đề bài</h3>
    <p className="adm-qdetail__stem">{version.stem?.trim() || '(không có nội dung)'}</p>
    {version.options?.length ? <>
      <h3>Các lựa chọn</h3>
      <ul className="adm-qdetail__options">{[...version.options].sort((left, right) => (left.sortOrder ?? 0) - (right.sortOrder ?? 0)).map((option) => <li key={option.optionKey}><strong>{option.optionKey}</strong><span>{option.content}</span></li>)}</ul>
    </> : null}
    <h3>Đáp án</h3>
    <p>{describeAnswerSpec(version.answerSpecJson)}</p>
    {version.explanation?.trim() ? <><h3>Giải thích</h3><p className="adm-qdetail__stem">{version.explanation}</p></> : null}
  </div>
}
