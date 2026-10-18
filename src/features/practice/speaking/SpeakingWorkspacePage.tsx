import { Navigate, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { ApiErrorState, LoadingState } from '@/features/learning-path/components/PageState'
import { useApiResource } from '@/features/learning-path/lib/useApiResource'
import { SpeakingPage } from '../pages/SpeakingPage'
import { getSpeakingTask } from './speakingApi'
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

  return <SpeakingPage key={task.sectionId} task={task} nextPartPath={nextPartPath} onExit={() => navigate(CATALOG_PATH)} />
}
