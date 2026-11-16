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

type Signal = () => void

const depletedListeners = new Set<Signal>()
const changedListeners = new Set<Signal>()

/** The learner ran out of hearts, or tried something that needs one. The owl answers with the popup that sells hearts. */
export function publishHeartsDepleted() {
  depletedListeners.forEach((listener) => listener())
}

export function subscribeHeartsDepleted(listener: Signal) {
  depletedListeners.add(listener)
  return () => { depletedListeners.delete(listener) }
}

/** The hearts were refilled, so whatever shows them or is blocked by them should read them again. */
export function publishHeartsChanged() {
  changedListeners.forEach((listener) => listener())
}

export function subscribeHeartsChanged(listener: Signal) {
  changedListeners.add(listener)
  return () => { changedListeners.delete(listener) }
}
