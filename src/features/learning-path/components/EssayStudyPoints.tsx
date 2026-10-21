import { useEffect, useId, useRef, useState } from 'react'
import { Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { EssayStudyPoint } from '~types/learningPath'
import { toApiError, userMessage } from '../api'
import { CRITERION_NAME, focusNoteText, groupStudyPoints } from './essayCriteria'

type Practise = (point: EssayStudyPoint) => Promise<void>

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
  const [opening, setOpening] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const inFlight = useRef(false)
  const mounted = useRef(true)
  useEffect(() => {
    mounted.current = true
    return () => { mounted.current = false }
  }, [])
  const criterion = CRITERION_NAME[point.criterionCode ?? ''] ?? point.criterionCode
  const title = point.name ?? point.title ?? criterion ?? 'Kiến thức cần học'

  async function practise() {
    if (!onPractise || inFlight.current) return
    inFlight.current = true
    setOpening(true)
    setError(null)
    try {
      await onPractise(point)
    } catch (reason) {
      inFlight.current = false
      if (mounted.current) {
        setOpening(false)
        setError(userMessage(toApiError(reason)))
      }
    }
  }

  return (
    <li>
      <strong>{title}</strong>
      {point.kind === 'CRITERION' ? (
        <small className="lp-essay-study__criterion">
          {criterion}{point.band !== null ? ` · band ${point.band.toFixed(1)}` : ''}
        </small>
      ) : null}
      {point.reason ? <p>{point.reason}</p> : null}
      {notes.map((note, index) => (
        <p className="lp-essay-study__note" key={`${note.title}-${index}`}>
          <span>AI gợi ý</span> {focusNoteText(note)}
        </p>
      ))}
      {point.kind === 'CRITERION' && onPractise && point.knowledgePointId ? (
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
