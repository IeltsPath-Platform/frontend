import { Trash2 } from 'lucide-react'
import { AdminModal } from '../../components/AdminLayer'
import { COURSE_SET_MIN_QUESTIONS, type CoursePracticeSet } from '../types'
import { DIFFICULTY_LABEL, TYPE_LABEL } from '../../questions/lib/labels'
import { useCourseDraftCatalog } from '../lib/courseDraftCatalog'

/**
 * A practice set the model wrote, read in full before the course is approved: its passage and every question with the
 * options, the right answer and the explanation. A question can be dropped while the set keeps its minimum.
 */
export function CoursePracticeSetDetail({ set, disabled, onChange, onClose }: {
  set: CoursePracticeSet; disabled: boolean; onChange: (next: CoursePracticeSet) => void; onClose: () => void
}) {
  const { knowledge } = useCourseDraftCatalog()
  const knowledgeById = new Map((knowledge.data?.nodes ?? []).map((node) => [node.id, node]))
  const canDrop = !disabled && set.questions.length > COURSE_SET_MIN_QUESTIONS
  return <AdminModal title={set.title} description={`${TYPE_LABEL[set.questionType] ?? set.questionType} · ${set.questions.length} câu`} size="lg" stacked onClose={onClose}>
    {() => <div className="adm-setview">
      <section aria-label="Đoạn văn của gói" className="adm-setview__passage">
        <h3>Đoạn văn</h3>
        {set.instructions?.trim() ? <p className="adm-setview__hint">{set.instructions}</p> : null}
        <p className="adm-setview__text">{set.passage}</p>
      </section>
      <section aria-label="Câu hỏi của gói" className="adm-setview__questions">
      <h3>Câu hỏi<span className="adm-count">{set.questions.length}</span></h3>
      {set.questions.map((question, index) => <details className="adm-pkgdetail__question" key={index}>
        <summary><strong>Câu {index + 1}.</strong> {question.stem}</summary>
        <div className="adm-qdetail">
          <p className="adm-qdetail__badges">
            {question.difficulty ? <span className="adm-badge adm-badge--muted">{DIFFICULTY_LABEL[question.difficulty] ?? question.difficulty}</span> : null}
            {(question.knowledgePointIds?.length ? question.knowledgePointIds : set.knowledgePointIds).map((id) => <span className="adm-badge adm-badge--muted" key={id}
              title={knowledgeById.get(id)?.name}>{knowledgeById.get(id)?.code ?? id}</span>)}
          </p>
          <h3>Các lựa chọn</h3>
          <ul className="adm-qdetail__options">{question.options.map((option) => <li className={option.optionKey === question.correctKey ? 'is-correct' : undefined} key={option.optionKey}>
            <strong>{option.optionKey}</strong><span>{option.content}</span>{option.optionKey === question.correctKey ? <span className="adm-badge adm-badge--ok">Đáp án đúng</span> : null}
          </li>)}</ul>
          <h3>Giải thích</h3>
          <p className="adm-qdetail__stem">{question.explanation}</p>
          {disabled ? null : <div><button aria-label={`Gỡ câu ${index + 1} khỏi gói`} className="adm-btn adm-btn--danger adm-btn--small" disabled={!canDrop}
            onClick={() => onChange({ ...set, questions: set.questions.filter((_, position) => position !== index) })} type="button">
            <Trash2 aria-hidden="true" size={14} />Gỡ câu này</button>
            {canDrop ? null : <small className="adm-muted"> Gói cần ít nhất {COURSE_SET_MIN_QUESTIONS} câu.</small>}</div>}
        </div>
      </details>)}
      </section>
    </div>}
  </AdminModal>
}
