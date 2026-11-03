import { Link } from 'react-router-dom'
import { Dumbbell, Loader2, Lock } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { CourseUnlockTarget, TreePoint } from '~types/learningPath'
import { userMessage } from '../api'
import type { PointPractice } from '../lib/usePointPractice'
import { tierGroup } from '../lib/treeMeta'
import { UnlockDialog } from './UnlockDialog'

/** What the learner can do with the point: practise it, or open the skill it belongs to. Only a point that needs work is the loud one. */
export function PracticeButton({ practice, point, describedBy, className }: {
  practice: PointPractice
  point: TreePoint
  describedBy: string
  className: string
}) {
  const loud = tierGroup(point) === 'PRIORITY'
  if (point.locked) {
    return (
      <Button aria-describedby={describedBy} className={`lp-btn ${className}`} onClick={() => practice.setUnlockOpen(true)} type="button" variant="outline">
        <Lock aria-hidden="true" size={14} />
        Mở khóa
      </Button>
    )
  }
  return (
    <Button
      aria-describedby={describedBy}
      className={`lp-btn ${className}${loud ? ' lp-btn--accent' : ''}`}
      disabled={!point.practiceAvailable || practice.starting || practice.depleted}
      onClick={() => void practice.practise()}
      type="button"
      variant={loud ? 'default' : 'outline'}
    >
      {practice.starting ? <Loader2 aria-hidden="true" className="lp-spin" size={15} /> : <Dumbbell aria-hidden="true" size={15} />}
      {practice.starting ? 'Đang mở bộ…' : 'Luyện'}
    </Button>
  )
}

/** The failure of the last try and the unlock dialog, which belong under the button. */
export function PracticeFeedback({ practice, point, courseId, onCourseChanged, className }: {
  practice: PointPractice
  point: TreePoint
  courseId: string
  onCourseChanged: () => void
  className?: string
}) {
  const { failure, unlockOpen, setUnlockOpen } = practice
  const review = failure?.code === 'REVIEW_REQUIRED' ? failure.details.reviews?.[0] : undefined
  return (
    <>
      {failure ? (
        <p className={`lp-error${className ? ` ${className}` : ''}`} role="alert">
          {userMessage(failure)}
          {review ? <> <Link to={`/learn/reviews/${review.reviewId}`}>Làm bài ôn</Link></> : null}
        </p>
      ) : null}
      {unlockOpen && point.skill && ['LISTENING', 'READING', 'WRITING'].includes(point.skill) ? (
        <UnlockDialog courseId={courseId} target={point.skill as CourseUnlockTarget} onClose={() => setUnlockOpen(false)} onChanged={() => { onCourseChanged(); setUnlockOpen(false) }} />
      ) : null}
      {unlockOpen && point.skill === 'SPEAKING' ? <p role="status">Kỹ năng Nói sắp ra mắt.</p> : null}
    </>
  )
}
