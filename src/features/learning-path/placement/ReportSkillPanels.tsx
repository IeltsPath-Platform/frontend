import type { ReactNode } from 'react'
import { ChevronDown, CircleCheck, CircleX, Info } from 'lucide-react'
import type { PlacementReportEssay, PlacementReportQuestion, PlacementSkill } from '~types/learningPath'
import { CRITERION_NAMES, SPEAKING_REVIEW } from './placementReport'
import { SKILL_META } from './placementSkills'

/** A collapsible skill block: icon, name and band pill in the header. */
function ReportPanel({ skill, title, band, children }: { skill: PlacementSkill; title: string; band: number | null; children: ReactNode }) {
  const Icon = SKILL_META[skill].icon
  return (
    <details className="pl-report-panel" open>
      <summary>
        <Icon aria-hidden="true" className="pl-report-panel__icon" size={20} />
        <span className="pl-report-panel__name">{title}</span>
        <span className="pl-report-pill">{band !== null ? band.toFixed(1) : '…'}</span>
        <ChevronDown aria-hidden="true" className="pl-report-panel__chevron" size={18} />
      </summary>
      <div className="pl-report-panel__body">{children}</div>
    </details>
  )
}

/** Listening / Reading: every question with the learner's answer and the expected one. */
export function ObjectiveReport({ skill, band, questions }: { skill: PlacementSkill; band: number | null; questions: PlacementReportQuestion[] }) {
  const correct = questions.filter((question) => question.correct).length
  return (
    <ReportPanel band={band} skill={skill} title={SKILL_META[skill].label}>
      <p className="pl-report-summary">
        Bạn trả lời đúng <strong>{correct}/{questions.length}</strong> câu.
        {questions.length - correct > 0 ? ` Xem lại ${questions.length - correct} câu sai bên dưới cùng đáp án đúng.` : ' Rất tốt!'}
      </p>
      <div className="pl-report-table-wrap">
        <table className="pl-report-table pl-report-table--answers">
          <thead>
            <tr><th scope="col">Câu</th><th scope="col">Câu hỏi</th><th scope="col">Bạn trả lời</th><th scope="col">Đáp án</th><th scope="col"><span className="sr-only">Kết quả</span></th></tr>
          </thead>
          <tbody>
            {questions.map((question) => (
              <tr data-correct={question.correct} key={question.number}>
                <td className="pl-report-num">{question.number}</td>
                <td>
                  {question.prompt}
                  {question.explanation && !question.correct ? <small className="pl-report-explain">{question.explanation}</small> : null}
                </td>
                <td className="pl-report-answer">{question.learnerAnswer ?? <em>Bỏ trống</em>}</td>
                <td className="pl-report-answer">{question.correctAnswer ?? '–'}</td>
                <td className="pl-report-mark">
                  {question.correct
                    ? <CircleCheck aria-label="Đúng" className="pl-report-mark--ok" size={20} />
                    : <CircleX aria-label="Sai" className="pl-report-mark--bad" size={20} />}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </ReportPanel>
  )
}

/** Writing task: the LLM examiner's overall comment, one row per criterion and what to study next. */
export function EssayReport({ title, essay }: { title: string; essay: PlacementReportEssay }) {
  const feedback = essay.feedback
  return (
    <ReportPanel band={essay.band} skill="WRITING" title={title}>
      {!essay.submitted ? (
        <p className="pl-report-summary">Bạn đã nộp phần này mà chưa viết bài nên phần này được tính 0 điểm.</p>
      ) : essay.band === null ? (
        <p className="pl-report-summary">Bài viết đang được chấm, nhận xét sẽ có trong ít phút nữa.</p>
      ) : !feedback ? (
        <p className="pl-report-summary">Bài viết đã có band nhưng chưa có nhận xét chi tiết (hệ thống chấm tự động chưa trả nhận xét cho bài này).</p>
      ) : (
        <>
          {feedback.summary ? (
            <>
              <h4 className="pl-report-label">Nhận xét chung</h4>
              <p className="pl-report-summary">{feedback.summary}</p>
            </>
          ) : null}
          <div className="pl-report-table-wrap">
            <table className="pl-report-table">
              <thead><tr><th scope="col">Tiêu chí</th><th scope="col">Nhận xét chi tiết</th></tr></thead>
              <tbody>
                {feedback.criteria.map((criterion) => (
                  <tr key={criterion.code}>
                    <th scope="row">
                      {CRITERION_NAMES[criterion.code] ?? criterion.code}
                      {criterion.band !== null ? <span className="pl-report-band">{criterion.band.toFixed(1)}</span> : null}
                    </th>
                    <td className="pl-report-comment">{criterion.comment ?? 'Không có nhận xét cho tiêu chí này.'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {feedback.focus.length > 0 ? <StudyList items={feedback.focus} /> : null}
          <p className="pl-report-note"><Info aria-hidden="true" size={14} />Nhận xét do AI chấm theo band descriptor công khai, mang tính tham khảo.</p>
        </>
      )}
    </ReportPanel>
  )
}

/** Speaking: general guidance until recordings are graded. */
export function SpeakingReport({ band }: { band: number | null }) {
  return (
    <ReportPanel band={band} skill="SPEAKING" title="Speaking">
      <p className="pl-report-notice"><Info aria-hidden="true" size={16} />
        Hệ thống chưa chấm bản ghi Speaking. Band hiện là band tạm và nhận xét dưới đây là hướng dẫn chung theo từng tiêu chí, chưa dựa trên bài nói của bạn.
      </p>
      <div className="pl-report-table-wrap">
        <table className="pl-report-table">
          <thead><tr><th scope="col">Tiêu chí</th><th scope="col">Lưu ý</th><th scope="col">Nên luyện</th></tr></thead>
          <tbody>
            {SPEAKING_REVIEW.map((row) => (
              <tr key={row.criterion}>
                <th scope="row">{row.criterion}</th>
                <td className="pl-report-comment">{row.comment}</td>
                <td className="pl-report-comment">{row.study}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </ReportPanel>
  )
}

function StudyList({ items }: { items: string[] }) {
  return (
    <div className="pl-report-study">
      <h4 className="pl-report-label">Kiến thức cần học</h4>
      <ul>
        {items.map((item) => {
          const [head, ...rest] = item.split(':')
          return <li key={item}>{rest.length ? <><strong>{head}:</strong>{rest.join(':')}</> : item}</li>
        })}
      </ul>
    </div>
  )
}
