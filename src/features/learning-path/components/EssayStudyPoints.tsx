import { useId } from 'react'
import { Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { EssayStudyPoint } from '~types/learningPath'
import { CRITERION_NAME, focusNoteText, groupStudyPoints, practiceTargetOf } from './essayCriteria'
import { usePointPractise, type Practise } from './usePointPractise'

export function EssayStudyPoints({ points, onPractise }: {
  points: EssayStudyPoint[]
  /** Starts practice on the point's knowledge point; a rejection is shown under that point. */
  onPractise?: Practise
}) {
  const headingId = useId()
  if (points.length === 0) return null
  return (
    <section className="lp-essay-study" aria-labelledby={headingId}>
      <h4 id={headingId}>Kiến thức cần học</h4>
      <ul>
        {groupStudyPoints(points).map(({ point, notes }, index) => (
          <StudyPointItem key={`${point.kind}-${point.knowledgePointId ?? point.title}-${index}`} notes={notes} point={point} onPractise={onPractise} />
        ))}
      </ul>
    </section>
  )
}

function StudyPointItem({ point, notes, onPractise }: { point: EssayStudyPoint; notes: EssayStudyPoint[]; onPractise?: Practise }) {
  const { opening, error, practise } = usePointPractise(point, onPractise)
  const criterion = CRITERION_NAME[point.criterionCode ?? ''] ?? point.criterionCode
  const title = point.name ?? point.title ?? criterion ?? 'Kiến thức cần học'
  const practiceTarget = practiceTargetOf(point)

  return (
    <li data-kind={point.kind}>
      <strong>{title}</strong>
      {point.kind === 'CRITERION' ? (
        <small className="lp-essay-study__criterion">
          {criterion}{point.band !== null ? ` · band ${point.band.toFixed(1)}` : ''}
        </small>
      ) : null}
      {point.kind === 'KNOWLEDGE_POINT' ? (
        <small className="lp-essay-study__criterion">{criterion ? `${criterion} · ` : ''}Cần luyện</small>
      ) : null}
      {point.kind === 'KNOWLEDGE_POINT' && point.excerpt ? (
        <blockquote className="lp-essay-study__excerpt">{point.excerpt}</blockquote>
      ) : null}
      {point.reason ? <p>{point.reason}</p> : null}
      {notes.map((note, index) => (
        <p className="lp-essay-study__note" key={`${note.title}-${index}`}>
          <span>AI gợi ý</span> {focusNoteText(note)}
        </p>
      ))}
      {onPractise && practiceTarget ? (
        <div className="lp-essay-study__actions">
          <Button className="lp-btn" aria-label={`Luyện tập ${title}`} disabled={opening} onClick={() => void practise()} type="button">
            {opening ? <Loader2 aria-hidden="true" className="lp-spin" /> : null}
            {opening ? 'Đang mở…' : 'Luyện tập'}
          </Button>
        </div>
      ) : null}
      {error ? <p className="lp-error" role="alert">{error}</p> : null}
    </li>
  )
}
