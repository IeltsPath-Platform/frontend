import { ChevronRight } from 'lucide-react'
import { AdminError, AdminLoading } from '../../components/AdminState'
import { useAdminResource } from '../../lib/useAdminResource'
import { previewVersion } from '../api/packageApi'

function answerText(spec: unknown) {
  if (!spec || typeof spec !== 'object' || Array.isArray(spec)) return 'Chưa có đáp án tự chấm'
  const answer = spec as Record<string, unknown>
  if (typeof answer.correct === 'string') return `Đáp án đúng: ${answer.correct}`
  if (Array.isArray(answer.accepted)) return `Đáp án chấp nhận: ${answer.accepted.filter((item): item is string => typeof item === 'string').join(' / ')}`
  return answer.type === 'ESSAY' ? 'Bài luận được chấm theo rubric.' : 'Không có đáp án tự chấm.'
}
/** The keys of the options an answer marks as correct: one key, or several. Empty for a question that is not a choice. */
function correctKeys(spec: unknown): string[] {
  if (!spec || typeof spec !== 'object' || Array.isArray(spec)) return []
  const { correct } = spec as Record<string, unknown>
  if (typeof correct === 'string') return [correct]
  return Array.isArray(correct) ? correct.filter((key): key is string => typeof key === 'string') : []
}
function mediaUrl(value: string | null) {
  try { const parsed = new URL(value ?? ''); return ['http:', 'https:'].includes(parsed.protocol) ? parsed.href : undefined } catch { return undefined }
}

/**
 * A version of a package as a learner would take it: each section, folded under its title (open when it is the only one), with its instructions, passage, recording and numbered
 * questions, each with its answer and explanation under it. `embedded` leaves out the title and the close button for a
 * place that already has its own, such as a dialog.
 */
export function PackagePreview({ packageId, versionId, onClose, embedded = false }: { packageId: string; versionId: string; onClose: () => void; embedded?: boolean }) {
  const preview = useAdminResource(`package-preview:${packageId}:${versionId}`, (signal) => previewVersion(packageId, versionId, signal))
  let questionNumber = 0
  return <section className={`adm-pv${embedded ? ' adm-pv--embedded' : ' adm-card'}`} aria-label="Xem trước gói">
    {embedded ? null : <div className="adm-package-actions"><h2>Xem trước gói</h2><button className="adm-btn" type="button" onClick={onClose}>Đóng xem trước</button></div>}
    {preview.status === 'loading' ? <AdminLoading label="Đang tải bản xem trước…" /> : null}
    {preview.status === 'error' ? <AdminError message={preview.error!} onRetry={preview.reload} /> : null}
    {preview.data?.sections.map((section, sectionIndex) => {
      const answers = preview.data?.answers.find((answer) => answer.sectionId === section.sectionId)
      const answerOf = new Map((answers?.items ?? []).map((answer) => [answer.questionVersionId, answer]))
      const audioUrl = section.audio ? mediaUrl(section.audio.mediaUrl) : undefined
      return <details className="adm-pv-section" key={section.sectionId} open={preview.data?.sections.length === 1}>
        <summary className="adm-pv-section__head">
          <ChevronRight aria-hidden="true" className="adm-pv-section__chevron" size={18} />
          <span className="adm-pv-section__badge">Phần {sectionIndex + 1}</span>
          <h3>{section.title}</h3>
          <span className="adm-pv-section__count">{section.items.length} câu</span>
        </summary>
        <div className="adm-pv-section__body">
        {section.instructions ? <p className="adm-pv-section__instructions">{section.instructions}</p> : null}
        {section.passage ? <div className="adm-pv-passage"><p>{section.passage}</p></div> : null}
        {audioUrl ? <audio className="adm-pv-audio" controls preload="none" src={audioUrl}>Trình duyệt không hỗ trợ audio.</audio> : null}
        <ol className="adm-pv-questions">{section.items.map((item) => {
          questionNumber += 1
          const options = Array.isArray(item.options)
            ? [...item.options].sort((a, b) => a.sortOrder - b.sortOrder).map(({ optionKey, content }) => [optionKey, content])
            : Object.entries(item.options ?? {})
          const answer = answerOf.get(item.questionVersionId)
          const correct = correctKeys(answer?.answerSpec)
          return <li className="adm-pv-question" key={item.questionVersionId}>
            <span aria-hidden="true" className="adm-pv-question__number">{questionNumber}</span>
            <div className="adm-pv-question__body">
              <p className="adm-pv-question__stem">{item.stem}</p>
              {options.length ? <ul className="adm-pv-options">{options.map(([key, content]) => <li className={correct.includes(key) ? 'is-correct' : undefined} key={key}><strong>{key}.</strong> {content}</li>)}</ul> : null}
              {item.hint ? <p className="adm-pv-question__hint">Gợi ý: {item.hint}</p> : null}
              {answer ? <div className="adm-pv-answer">
                <p className="adm-pv-answer__text">{answerText(answer.answerSpec)}</p>
                {answer.explanation ? <p className="adm-pv-answer__explanation">{answer.explanation}</p> : null}
              </div> : null}
            </div>
          </li>
        })}</ol>
        {answers?.audioTranscript ? <details className="adm-pv-transcript"><summary>Transcript</summary><p>Transcript: {answers.audioTranscript}</p></details> : null}
        </div>
      </details>
    })}
  </section>
}
