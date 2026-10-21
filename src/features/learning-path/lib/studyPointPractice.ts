import type { NavigateFunction } from 'react-router-dom'
import type { EssayStudyPoint } from '~types/learningPath'
import { learningApi, toApiError } from '../api'
import { reportApiError } from './reviewGate'
import { freePracticePath, type FreePracticeNavigationState } from './routes'

/** Starts free practice on a study point's knowledge point; a refusal is reported and rethrown. */
export async function startStudyPointPractice(point: EssayStudyPoint, backTo: string, navigate: NavigateFunction) {
  if (!point.knowledgePointId) return
  try {
    const attempt = await learningApi.startFreePractice(point.knowledgePointId)
    navigate(freePracticePath(attempt.attemptId), {
      state: {
        freePractice: {
          pointName: point.name ?? point.title ?? 'Bộ luyện tự do',
          pointCode: point.code ?? '',
          backTo,
        },
      } satisfies FreePracticeNavigationState,
    })
  } catch (reason) {
    const error = toApiError(reason)
    reportApiError(error)
    throw error
  }
}
