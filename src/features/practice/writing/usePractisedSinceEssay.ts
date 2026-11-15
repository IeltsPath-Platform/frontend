import { useEffect, useState } from 'react'
import { getPracticeSinceEssay, type PracticeSince } from '../history/submissionHistoryApi'

/**
 * What the learner practised on `knowledgePointIds` since essay `submissionId`, by point. Null until it is known, and also when
 * it cannot be read: the status is a help, so a failure leaves the list as it is and reports nothing. Coming back from a
 * practice set mounts the result page again, so the status is read again then.
 */
export function usePractisedSinceEssay(submissionId: string | undefined, knowledgePointIds: readonly string[]) {
  const ids = [...new Set(knowledgePointIds)].sort().join(',')
  const requestKey = submissionId && ids ? `${submissionId}|${ids}` : ''
  const [state, setState] = useState<{ key: string; byPoint: ReadonlyMap<string, PracticeSince> } | null>(null)

  useEffect(() => {
    if (!requestKey || !submissionId) return
    const controller = new AbortController()
    getPracticeSinceEssay(submissionId, ids.split(','), controller.signal).then(
      (list) => setState({ key: requestKey, byPoint: new Map(list.map((item) => [item.knowledgePointId, item] as const)) }),
      () => undefined,
    )
    return () => controller.abort()
  }, [requestKey, submissionId, ids])

  return state && state.key === requestKey ? state.byPoint : null
}
