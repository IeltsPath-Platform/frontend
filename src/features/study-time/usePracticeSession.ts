import { useEffect, useState } from 'react'
import { openPracticeSession, type PracticeSessionKind } from './practiceSessionApi'

export function usePracticeSession(kind: PracticeSessionKind, enabled: boolean): string | null {
  const [requestId] = useState(() => crypto.randomUUID())
  const [id, setId] = useState<string | null>(null)

  useEffect(() => {
    if (!enabled) return
    const controller = new AbortController()
    void openPracticeSession(requestId, kind, controller.signal)
      .then((session) => { if (!controller.signal.aborted) setId(session.id) })
      .catch(() => { if (!controller.signal.aborted) setId(null) })
    return () => controller.abort()
  }, [enabled, kind, requestId])

  return id
}
