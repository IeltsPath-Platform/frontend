import { useEffect, useState } from 'react'
import { getFullExaminers, listExaminers } from './examinerApi'
import type { Examiner } from './examinerApi'

export type ExaminerChoices =
  | { status: 'loading' }
  | { status: 'error' }
  | { status: 'ready'; examiners: Examiner[]; full: Set<string>; backlog: Set<string> }

/**
 * The examiners who take new work and which of them cannot take more now: full today, or held back by late jobs. Read again
 * whenever {@code refreshKey} changes, so after a refusal an examiner who just filled up shows as unavailable.
 */
export function useExaminerChoices(refreshKey: string): ExaminerChoices {
  const [loaded, setLoaded] = useState<ExaminerChoices>({ status: 'loading' })

  useEffect(() => {
    const controller = new AbortController()
    void (async () => {
      try {
        const examiners = await listExaminers(controller.signal)
        const { full, backlog } = await getFullExaminers(examiners.map((item) => item.id), controller.signal)
          .catch(() => ({ full: new Set<string>(), backlog: new Set<string>() }))
        if (!controller.signal.aborted) setLoaded({ status: 'ready', examiners, full, backlog })
      } catch {
        if (!controller.signal.aborted) setLoaded({ status: 'error' })
      }
    })()
    return () => controller.abort()
  }, [refreshKey])

  return loaded
}
