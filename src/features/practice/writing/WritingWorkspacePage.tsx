import { Navigate, useParams, useSearchParams } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { ApiErrorState, PageSkeleton } from '@/features/learning-path/components/PageState'
import { useApiResource } from '@/features/learning-path/lib/useApiResource'
import { WritingExamPage } from './WritingExamPage'
import { WritingPracticePage } from './WritingPracticePage'
import { getWritingTask } from './writingApi'
import { isEntitlementUnavailable, isPremiumRequired } from '../lib/premiumErrors'
import { PremiumUpgradeDialog } from '../components/PremiumUpgradeDialog'
import { useToast } from '@/components/toast/toastContext'
import '@/features/learning-path/learning-path.css'
import '../reading/reading-practice.css'
import '../reading/reading-workspace.css'
import './writing-workspace.css'

const CATALOG_PATH = '/practice-tests?skill=writing'

/** Loads the task from the library and opens the screen the learner chose: practice or the exam. */
export function WritingWorkspacePage() {
  const { packageVersionId = '', sectionId = '' } = useParams()
  const [params] = useSearchParams()
  const exam = params.get('mode') === 'exam'
  const resource = useApiResource(`writing-task:${packageVersionId}:${sectionId}`, () => getWritingTask(packageVersionId, sectionId))
  const [dismissedError, setDismissedError] = useState<unknown>(null)
  const { toast } = useToast()
  useEffect(() => {
    if (resource.status !== 'error') return
    if (!isPremiumRequired(resource.error) && isEntitlementUnavailable(resource.error)) toast({ title: resource.error.message, tone: 'error' })
  }, [resource.status, resource.error, toast])

  if (!packageVersionId || !sectionId) return <Navigate replace to={CATALOG_PATH} />
  if (resource.status === 'loading') return <PageSkeleton label="Đang tải đề Writing…" variant="article" />
  if (resource.status === 'error' && resource.error) return <><ApiErrorState error={resource.error} onRetry={resource.reload} />
    <PremiumUpgradeDialog open={isPremiumRequired(resource.error) && dismissedError !== resource.error} onClose={() => setDismissedError(resource.error)} /></>
  const task = resource.data
  if (!task) return null

  return exam ? <WritingExamPage key={task.sectionId} task={task} /> : <WritingPracticePage key={task.sectionId} task={task} />
}
