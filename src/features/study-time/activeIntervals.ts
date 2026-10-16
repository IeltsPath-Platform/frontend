export interface ActiveInterval { startOffsetMs: number; endOffsetMs: number }

export const SESSION_IN_USE_RETRY_DELAYS_MS = [250, 750] as const;

/** Monotonic offsets; sleeping tabs and time after the idle boundary are never backfilled. */
export class ActiveIntervals {
  private intervals: ActiveInterval[] = []
  private previous: number
  private lastActivity: number
  constructor(startOffset: number) { this.previous = startOffset; this.lastActivity = startOffset }
  activity(offset: number) { this.lastActivity = offset }
  sample(offset: number, visible: boolean, mediaActive: boolean) {
    const start = this.previous
    this.previous = offset
    if (!visible || offset <= start || offset - start > 5000) return
    const end = mediaActive ? offset : Math.min(offset, this.lastActivity + 120_000)
    if (end <= start) return
    const last = this.intervals.at(-1)
    if (last?.endOffsetMs === start) last.endOffsetMs = end
    else if (this.intervals.length < 16) this.intervals.push({ startOffsetMs: start, endOffsetMs: end })
  }
  take(): ActiveInterval[] { const intervals = this.intervals; this.intervals = []; return intervals }
}
