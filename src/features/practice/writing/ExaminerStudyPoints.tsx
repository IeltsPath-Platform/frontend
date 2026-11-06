import { useId, useRef, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { toApiError, userMessage } from '@/features/learning-path/api'
import { CRITERION_NAME } from '@/features/learning-path/components/essayCriteria'
import { reviewPath } from '@/features/learning-path/lib/masteryGuide'
import { startStudyPointPractice } from '@/features/learning-path/lib/studyPointPractice'
import type { EssayStudyPoint } from '~types/learningPath'
import type { ExaminerStudyPoint } from './examinerApi'

/**
 * What to study after the examiner's grade. Each point opens the optional review made for it, or starts free practice on its
 * knowledge point. Nothing here blocks learning: the points only say where to study.
 */
export function ExaminerStudyPoints({ points }: { points: ExaminerStudyPoint[] }) {
  const headingId = useId()
  const location = useLocation()
  const backTo = `${location.pathname}${location.search}`
  if (points.length === 0) return null
  return (
    <section className="wr-card we-study" aria-labelledby={headingId}>
      <h3 id={headingId}>Cần ôn</h3>
      <ul>
        {points.map((point, index) => (
          <StudyItem backTo={backTo} key={`${point.kind}-${point.knowledgePointId ?? index}`} point={point} />
        ))}
      </ul>
    </section>
  )
}

function StudyItem({ point, backTo }: { point: ExaminerStudyPoint; backTo: string }) {
  const navigate = useNavigate()
  const [opening, setOpening] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const inFlight = useRef(false)
  const title = point.name ?? point.code ?? CRITERION_NAME[point.criterionCode ?? ''] ?? point.criterionCode ?? 'Kiến thức cần học'
  const detail = point.kind === 'ERROR_CODE'
    ? `Lỗi giáo viên đánh dấu ×${point.count ?? 1}`
    : `${CRITERION_NAME[point.criterionCode ?? ''] ?? point.criterionCode ?? 'Tiêu chí'}${point.band != null ? ` · band ${point.band.toFixed(1)}` : ''}`

  async function practise() {
    if (inFlight.current) return
    inFlight.current = true
    setOpening(true)
    setError(null)
    try {
      await startStudyPointPractice(asStudyPoint(point), backTo, navigate)
    } catch (reason) {
      inFlight.current = false
      setOpening(false)
      setError(userMessage(toApiError(reason)))
    }
  }

  return (
    <li>
      <strong>{title}</strong>
      <small className="we-study__detail">{detail}</small>
      <div className="we-study__actions">
        {point.reviewItemId ? <Link className="lp-btn" to={reviewPath(point.reviewItemId)}>Ôn ngay</Link> : null}
        {point.practiceKnowledgePointId ? (
          <Button aria-label={`Luyện tập ${title}`} className="lp-btn" disabled={opening} onClick={() => void practise()} type="button">
            {opening ? 'Đang mở…' : 'Luyện tập'}
          </Button>
        ) : null}
      </div>
      {error ? <p className="lp-error" role="alert">{error}</p> : null}
    </li>
  )
}

/** The shape free practice takes its point from; the examiner's point carries the same ids. */
function asStudyPoint(point: ExaminerStudyPoint): EssayStudyPoint {
  return {
    kind: 'KNOWLEDGE_POINT',
    criterionCode: point.criterionCode ?? null,
    band: point.band ?? null,
    knowledgePointId: point.knowledgePointId ?? null,
    code: point.code ?? null,
    name: point.name ?? null,
    title: point.name ?? null,
    reason: null,
    practiceKnowledgePointId: point.practiceKnowledgePointId ?? null,
  }
}
