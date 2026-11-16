import { useCallback, useEffect, useState } from 'react'
import { notebookApi } from '@/features/vocabulary/api/notebookApi'

/**
 * Saving the senses of a looked-up word into the learner's notebook with one tap. It also finds out which of the shown senses
 * are already there, so they read "saved" at once. A failure to find that only leaves the buttons as "save"; a failure to
 * save is reported for that sense and nothing is marked saved.
 */
export function useSenseSaves(senseIds: string[]) {
  const [saved, setSaved] = useState<ReadonlySet<string>>(new Set())
  const [saving, setSaving] = useState<ReadonlySet<string>>(new Set())
  const [failed, setFailed] = useState<string | null>(null)
  const key = senseIds.join(',')

  useEffect(() => {
    if (!key) return
    const controller = new AbortController()
    notebookApi.getSavedNotebookSenses(key.split(','), controller.signal)
      .then((already) => { if (!controller.signal.aborted && already.length > 0) setSaved((current) => new Set([...current, ...already])) })
      .catch(() => undefined)
    return () => controller.abort()
  }, [key])

  const save = useCallback(async (senseId: string) => {
    setFailed(null)
    setSaving((current) => new Set(current).add(senseId))
    try {
      await notebookApi.saveNotebookEntry(senseId)
      setSaved((current) => new Set(current).add(senseId))
    } catch {
      setFailed(senseId)
    } finally {
      setSaving((current) => {
        const next = new Set(current)
        next.delete(senseId)
        return next
      })
    }
  }, [])

  return { saved, saving, failed, save }
}
