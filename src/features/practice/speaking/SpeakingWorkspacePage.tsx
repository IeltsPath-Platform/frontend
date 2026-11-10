import { Fragment } from 'react'
import { Navigate, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { ApiErrorState, LoadingState } from '@/features/learning-path/components/PageState'
import { useApiResource } from '@/features/learning-path/lib/useApiResource'
import { SpeakingPage } from '../pages/SpeakingPage'
import { getSpeakingTask } from './speakingApi'
import { clearSession } from './speakingSession'
import { StudyActivityTracker } from '@/features/study-time/StudyActivityTracker'
import { usePracticeSession } from '@/features/study-time/usePracticeSession'
import '@/features/learning-path/learning-path.css'
import '../reading/reading-practice.css'

const CATALOG_PATH = '/practice-tests?skill=speaking'
const ID = /^[0-9a-f-]{36}$/i

/** Loads one Speaking part from the library. A full test passes its parts in order, so each part can lead to the next. */
export function SpeakingWorkspacePage() {
  const { packageVersionId = '', sectionId = '' } = useParams()
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const resource = useApiResource(`speaking-task:${packageVersionId}:${sectionId}`, () => getSpeakingTask(packageVersionId, sectionId))
  const practiceSessionId = usePracticeSession('SPEAKING', resource.status === 'success' && !!resource.data)

  if (!packageVersionId || !sectionId) return <Navigate replace to={CATALOG_PATH} />
  if (resource.status === 'loading') return <LoadingState label="Đang tải đề Speaking…" />
  if (resource.status === 'error' && resource.error) return <ApiErrorState error={resource.error} onRetry={resource.reload} />
  const task = resource.data
  if (!task) return null

  const parts = (params.get('parts') ?? '').split(',').filter((id) => ID.test(id))
  const next = parts[parts.indexOf(sectionId) + 1]
  const nextPartPath = parts.includes(sectionId) && next
    ? `/practice/speaking/tasks/${packageVersionId}/${next}?parts=${parts.join(',')}`
    : null
  // The review lists every part of the test; a single part is a test of one.
  const reviewParts = parts.includes(sectionId) ? parts : [sectionId]
  const reviewPath = `/practice/speaking/review/${packageVersionId}?parts=${reviewParts.join(',')}`
  const question = Number(params.get('q'))

  return (
    <Fragment>
    {practiceSessionId && <StudyActivityTracker sourceType="SPEAKING" sourceId={practiceSessionId} enabled />}
    <SpeakingPage
      key={task.sectionId}
      task={task}
      nextPartPath={nextPartPath}
      initialIndex={Number.isInteger(question) && question > 0 ? question : 0}
      timed={!params.has('q')}
      onFinish={() => navigate(reviewPath)}
      onExit={() => { clearSession(packageVersionId); navigate(CATALOG_PATH) }}
    />
    </Fragment>
  )
}
