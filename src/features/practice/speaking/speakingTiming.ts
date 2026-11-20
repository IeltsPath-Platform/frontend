/**
 * Measures, in the browser, how long the learner waits for a Speaking grade, in the pieces the learner lives through, and
 * writes one line per submission to the console: `[speaking-timing] {...}`. Nothing is stored or sent anywhere, and the line
 * holds no answer text. Together with the server's log lines (`Speaking submission graded`, `Speaking grade released`) it
 * shows what the learner waited for and what part of that the server took.
 *
 * The pieces, in order, all in milliseconds from the moment the learner pressed send:
 * - `openMs`: the server opens the submission (it checks the points first);
 * - `uploadMs`: every recording is converted to WAV and uploaded, one after the other;
 * - `completeMs`: the server is told the last recording is in;
 * - `gradingMs`: from the submission being queued until this page first sees the grade is ready (the server's analysis and
 *   model calls, plus up to one polling interval before the page notices);
 * - `releaseMs`: from seeing the grade is ready until the page has released it (the settle request);
 * - `totalMs`: all of it.
 */

interface Run {
  sentAt: number
  recordings: number
  opened?: number
  uploaded?: number
  completed?: number
  ready?: number
  polls: number
}

export interface SpeakingTimingSummary {
  submissionId: string
  recordings: number
  openMs: number | null
  uploadMs: number | null
  completeMs: number | null
  gradingMs: number | null
  releaseMs: number | null
  totalMs: number
  polls: number
}

const runs = new Map<string, Run>()

/** The clock of every mark; one place so a test can set it. */
export function speakingTimingNow(): number {
  return performance.now()
}

/** The submission exists: from here the marks belong to it. `sentAt` was taken when the learner pressed send. */
export function beginSpeakingTiming(submissionId: string, sentAt: number, recordings: number): void {
  runs.set(submissionId, { sentAt, recordings, opened: speakingTimingNow(), polls: 0 })
}

export function markSpeakingTiming(submissionId: string, phase: 'uploaded' | 'completed'): void {
  const run = runs.get(submissionId)
  if (run) run[phase] = speakingTimingNow()
}

/** One more look at the submission's state. */
export function noteSpeakingPoll(submissionId: string): void {
  const run = runs.get(submissionId)
  if (run) run.polls += 1
}

/** The page sees that the grade is ready on the server (payment pending or already released); only the first time counts. */
export function markSpeakingGradeReady(submissionId: string): void {
  const run = runs.get(submissionId)
  if (run && run.ready === undefined) run.ready = speakingTimingNow()
}

const span = (from: number | undefined, to: number | undefined) => (from === undefined || to === undefined ? null : Math.round(to - from))

/**
 * The grade is released and on screen: writes the line and forgets the submission, so a second call does nothing. A
 * submission this page did not send (the learner came back to it later) has no marks and writes nothing.
 */
export function finishSpeakingTiming(submissionId: string): SpeakingTimingSummary | null {
  const run = runs.get(submissionId)
  if (!run) return null
  runs.delete(submissionId)
  const end = speakingTimingNow()
  const ready = run.ready ?? end
  const summary: SpeakingTimingSummary = {
    submissionId,
    recordings: run.recordings,
    openMs: span(run.sentAt, run.opened),
    uploadMs: span(run.opened, run.uploaded),
    completeMs: span(run.uploaded, run.completed),
    gradingMs: span(run.completed, ready),
    releaseMs: span(ready, end),
    totalMs: Math.round(end - run.sentAt),
    polls: run.polls,
  }
  console.info(`[speaking-timing] ${JSON.stringify(summary)}`)
  return summary
}
