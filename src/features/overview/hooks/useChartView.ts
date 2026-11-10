import { useState } from 'react'
import { useAuthSession } from '@/features/auth/authSession'

interface ChartView<T> {
  key: string
  data: T
}

/** Keep an explicitly pending chart in place, without retaining data across account or scope changes. */
export function useChartView<T>(key: string, data: T | null, pending: boolean, scope = '') {
  const { email, isLoggedIn } = useAuthSession()
  const owner = JSON.stringify([isLoggedIn, email, scope])
  const [snapshot, setSnapshot] = useState<{ owner: string; view: ChartView<T> } | null>(null)
  const current: ChartView<T> | null = data === null ? null : { key, data }
  if (current && (snapshot?.owner !== owner || snapshot.view.key !== key || snapshot.view.data !== data)) {
    setSnapshot({ owner, view: current })
  } else if (snapshot && snapshot.owner !== owner) {
    setSnapshot(null)
  }
  const view = current ?? (pending && snapshot?.owner === owner ? snapshot.view : null)
  return { view, updating: current === null && view !== null }
}
