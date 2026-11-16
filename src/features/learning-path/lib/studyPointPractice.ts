import type { NavigateFunction } from 'react-router-dom'
import type { EssayStudyPoint } from '~types/learningPath'
import { learningApi, toApiError } from '../api'
import { reportApiError } from './reviewGate'
import { practiceTargetOf } from '../components/essayCriteria'
import { freePracticePath, type FreePracticeNavigationState } from './routes'

/**
 * Starts free practice on a study point's knowledge point; a refusal is reported and rethrown. `backLabel` names the screen
 * `backTo` leads to, for the way back from the practice page.
 */
export async function startStudyPointPractice(point: EssayStudyPoint, backTo: string, navigate: NavigateFunction, backLabel?: string) {
  const target = practiceTargetOf(point)
  if (!target) return
  try {
    const attempt = await learningApi.startFreePractice(target)
    navigate(freePracticePath(attempt.attemptId), {
      state: {
        freePractice: {
          pointName: point.name ?? point.title ?? 'Bộ luyện tự do',
          pointCode: point.code ?? '',
          backTo,
          ...(backLabel ? { backLabel } : {}),
        },
      } satisfies FreePracticeNavigationState,
    })
  } catch (reason) {
    const error = toApiError(reason)
    reportApiError(error)
    throw error
  }
}
