import { useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useToast } from '@/components/toast/toastContext'
import type { PracticeTestMilestone, TopicSummary } from '~types/learningPath'
import { learningApi, toApiError } from '../api'
import { afterTopicLabel } from './courseSkills'
import { reportApiError } from './reviewGate'
import { useApiResource } from './useApiResource'

export interface PracticeTests {
  milestones: PracticeTestMilestone[]
  /** Package of the test being handed out; every test waits for it, so a double click cannot start two attempts. */
  startingId: string | null
  start: (milestone: PracticeTestMilestone) => Promise<void>
}

/**
 * The practice tests a course places after some of its chặng. Their first result feeds the course's process score, so a
 * learner who never sees them loses that part of the score. The list is an extra: when it cannot be read the course
 * page still works, so an error gives an empty list.
 */
export function usePracticeTests(courseId: string, topics: TopicSummary[]): PracticeTests {
  const navigate = useNavigate()
  const { toast } = useToast()
  const resource = useApiResource(`practice-tests:${courseId}`, () => learningApi.listPracticeTests(courseId))
  const [startingId, setStartingId] = useState<string | null>(null)
  const inFlight = useRef(false)

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
        toast({ title: `Đề luyện chưa mở. Hoàn thành ${afterTopicLabel(topics, milestone)} trước.`, tone: 'error' })
        resource.reload()
      } else {
        toast({ title: `${error.message} Hãy thử lại.`, tone: 'error' })
      }
      inFlight.current = false
      setStartingId(null)
    }
  }

  return { milestones: resource.data ?? [], startingId, start }
}
