import { Link, Navigate, useParams, useSearchParams } from 'react-router-dom'
import { ApiErrorState, LoadingState } from '@/features/learning-path/components/PageState'
import { useApiResource } from '@/features/learning-path/lib/useApiResource'
import { WritingFreePage } from './WritingFreePage'
import { WritingGuidedPage } from './WritingGuidedPage'
import { getWritingTask } from './writingApi'
import type { WritingMode } from './writingApi'
import '@/features/learning-path/learning-path.css'
import '../reading/reading-practice.css'
import '../reading/reading-workspace.css'
import './writing-workspace.css'

const CATALOG_PATH = '/practice-tests?skill=writing'

/** Loads the task from the library and opens the mode the learner chose. */
export function WritingWorkspacePage() {
  const { packageVersionId = '', sectionId = '' } = useParams()
  const [params] = useSearchParams()
  const mode: WritingMode = params.get('mode') === 'guided' ? 'guided' : 'free'
  const resource = useApiResource(`writing-task:${packageVersionId}:${sectionId}`, () => getWritingTask(packageVersionId, sectionId))

  if (!packageVersionId || !sectionId) return <Navigate replace to={CATALOG_PATH} />
  if (resource.status === 'loading') return <LoadingState label="Đang tải đề Writing…" />
  if (resource.status === 'error' && resource.error) return <ApiErrorState error={resource.error} onRetry={resource.reload} />
  const task = resource.data
  if (!task) return null

  if (mode === 'guided') {
    if (!task.guideSteps || task.guideSteps.length === 0) {
      return <main className="reading-state reading-empty"><h1>Đề này chưa có hướng dẫn từng bước</h1><Link to={`/practice/writing/tasks/${packageVersionId}/${sectionId}?mode=free`}>Viết tự do</Link></main>
    }
    return <WritingGuidedPage key={task.sectionId} task={task} steps={task.guideSteps} />
  }
  return <WritingFreePage key={task.sectionId} task={task} />
}
