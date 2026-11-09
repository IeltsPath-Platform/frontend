export interface ActiveInterval { startOffsetMs: number; endOffsetMs: number }

export const SESSION_IN_USE_RETRY_DELAYS_MS = [250, 750] as const;

/** Time without any input after which a tab stops counting, unless audio is playing or a recording is running. */
export const DEFAULT_IDLE_MS = 120_000
/** Reading and writing screens go quiet for longer while the learner thinks, so they get a longer boundary. */
export const LONG_FORM_IDLE_MS = 300_000

/** Monotonic offsets; sleeping tabs and time after the idle boundary are never backfilled. */
export class ActiveIntervals {
  private intervals: ActiveInterval[] = []
  private previous: number
  private lastActivity: number
  private idleMs: number
  constructor(startOffset: number, idleMs: number = DEFAULT_IDLE_MS) { this.previous = startOffset; this.lastActivity = startOffset; this.idleMs = idleMs }
  activity(offset: number) { this.lastActivity = offset }
  sample(offset: number, visible: boolean, mediaActive: boolean) {
    const start = this.previous
    this.previous = offset
    if (!visible || offset <= start || offset - start > 5000) return
    const end = mediaActive ? offset : Math.min(offset, this.lastActivity + this.idleMs)
    if (end <= start) return
    const last = this.intervals.at(-1)
    if (last?.endOffsetMs === start) last.endOffsetMs = end
    else if (this.intervals.length < 16) this.intervals.push({ startOffsetMs: start, endOffsetMs: end })
  }
  take(): ActiveInterval[] { const intervals = this.intervals; this.intervals = []; return intervals }
}
