import { useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ClipboardCheck, Loader2, Lock, RotateCcw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useToast } from '@/components/toast/toastContext'
import type { PracticeTestMilestone } from '~types/learningPath'
import { learningApi, toApiError } from '../api'
import { reportApiError } from '../lib/reviewGate'
import { useApiResource } from '../lib/useApiResource'

/**
 * The practice tests a course places after some of its chặng. Their first result feeds the course's process score, so a
 * learner who never sees them loses that part of the score. The list is an extra: when it cannot be read the course
 * page still works, so an error shows nothing.
 */
export function CoursePracticeTests({ courseId, topicTitles }: {
  courseId: string
  /** Titles of the course's chặng in the course's order; the n-th one names the chặng a milestone opens after. */
  topicTitles: string[]
}) {
  const navigate = useNavigate()
  const { toast } = useToast()
  const resource = useApiResource(`practice-tests:${courseId}`, () => learningApi.listPracticeTests(courseId))
  const [startingId, setStartingId] = useState<string | null>(null)
  const inFlight = useRef(false)
  const milestones = resource.data ?? []
  if (milestones.length === 0) return null

  // The board numbers chặng inside each skill, while a milestone counts them across the whole course, so the label
  // names the chặng and shows no number that could be read as a position in a skill.
  function afterLabel(milestone: PracticeTestMilestone) {
    const title = topicTitles[milestone.afterTopicSequence - 1]
    return title ? `chặng “${title}”` : `chặng thứ ${milestone.afterTopicSequence} của khóa`
  }

  async function start(milestone: PracticeTestMilestone) {
    if (inFlight.current) return
    inFlight.current = true
    setStartingId(milestone.packageId)
    try {
      const assignment = await learningApi.createPracticeTestAssignment(courseId, milestone.packageId)
      const attempt = await learningApi.createAttempt({
        packageVersionId: assignment.packageVersionId,
        attemptType: 'PRACTICE_TEST',
        mode: 'STANDARD',
        channel: 'WEB',
        expiresAt: null,
      })
      navigate(`/learn/tests/${attempt.id}?course=${courseId}&practice=1`)
    } catch (reason) {
      const error = toApiError(reason)
      reportApiError(error)
      if (error.code === 'PRACTICE_TEST_LOCKED') {
        toast({ title: `Đề luyện chưa mở. Hoàn thành ${afterLabel(milestone)} trước.`, tone: 'error' })
        resource.reload()
      } else {
        toast({ title: `${error.message} Hãy thử lại.`, tone: 'error' })
      }
      inFlight.current = false
      setStartingId(null)
    }
  }

  return (
    <section className="lp-milestones" aria-labelledby="lp-milestones-title">
      <h2 className="lp-milestones__title" id="lp-milestones-title">Đề luyện theo mốc</h2>
      <ul className="lp-milestones__list">
        {milestones.map((milestone) => {
          const after = afterLabel(milestone)
          const starting = startingId === milestone.packageId
          return (
            <li className={`lp-milestone lp-milestone--${milestone.status.toLowerCase()}`} key={milestone.packageId}>
              <span className="lp-milestone__icon" aria-hidden="true">
                {milestone.status === 'LOCKED' ? <Lock size={16} /> : <ClipboardCheck size={18} />}
              </span>
              <div className="lp-milestone__text">
                <h3 className="lp-milestone__name">{milestone.title}</h3>
                <p className="lp-milestone__meta">
                  {milestone.status === 'LOCKED' ? `Mở sau ${after}` : `Sau ${after}`}
                </p>
              </div>
              <div className="lp-milestone__action">
                {milestone.status === 'LOCKED' ? <span className="lp-chip lp-chip--locked">Chưa mở</span> : null}
                {milestone.status === 'DONE' && milestone.percent !== null ? (
                  <span className="lp-chip lp-chip--success">{milestone.percent}%</span>
                ) : null}
                {milestone.status !== 'LOCKED' ? (
                  <Button
                    className={milestone.status === 'AVAILABLE' ? 'lp-btn lp-btn--accent' : 'lp-btn'}
                    disabled={startingId !== null}
                    onClick={() => void start(milestone)}
                    type="button"
                    variant={milestone.status === 'AVAILABLE' ? 'default' : 'outline'}
                  >
                    {starting ? <Loader2 aria-hidden="true" className="lp-spin" /> : milestone.status === 'DONE' ? <RotateCcw aria-hidden="true" /> : null}
                    {starting ? 'Đang giao đề…' : milestone.status === 'DONE' ? 'Làm lại' : 'Làm đề'}
                  </Button>
                ) : null}
              </div>
            </li>
          )
        })}
      </ul>
    </section>
  )
}
