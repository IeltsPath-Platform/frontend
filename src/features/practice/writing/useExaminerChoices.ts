import { useEffect, useState } from 'react'
import { getFullExaminers, listExaminers } from './examinerApi'
import type { Examiner } from './examinerApi'

export type ExaminerChoices = { status: 'loading' } | { status: 'error' } | { status: 'ready'; examiners: Examiner[]; full: Set<string> }

/**
 * The examiners who take new work and which of them are full today. Read again whenever {@code refreshKey} changes, so
 * after a refusal an examiner who just filled up shows as full.
 */
export function useExaminerChoices(refreshKey: string): ExaminerChoices {
  const [loaded, setLoaded] = useState<ExaminerChoices>({ status: 'loading' })

  useEffect(() => {
    const controller = new AbortController()
    void (async () => {
      try {
        const examiners = await listExaminers(controller.signal)
        const full = await getFullExaminers(examiners.map((item) => item.id), controller.signal).catch(() => new Set<string>())
        if (!controller.signal.aborted) setLoaded({ status: 'ready', examiners, full })
      } catch {
        if (!controller.signal.aborted) setLoaded({ status: 'error' })
      }
    })()
    return () => controller.abort()
  }, [refreshKey])

  return loaded
}
