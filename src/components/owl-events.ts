import type { GamificationSummary } from '~types/learningPath'

type Listener = (summary: GamificationSummary) => void

const listeners = new Set<Listener>()

/** Tells the owl what a submission earned and cost. Called from the one place that announces rewards. */
export function publishGamification(summary: GamificationSummary) {
  listeners.forEach((listener) => listener(summary))
}

export function subscribeGamification(listener: Listener) {
  listeners.add(listener)
  return () => { listeners.delete(listener) }
}
