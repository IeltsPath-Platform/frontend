export type Ease = (t: number) => number

export const ease = {
  linear: (t: number) => t,
  outCubic: (t: number) => 1 - (1 - t) ** 3,
  inCubic: (t: number) => t ** 3,
  inOutCubic: (t: number) => (t < 0.5 ? 4 * t ** 3 : 1 - (-2 * t + 2) ** 3 / 2),
  outBack: (t: number) => {
    const c1 = 1.70158
    const c3 = c1 + 1
    return 1 + c3 * (t - 1) ** 3 + c1 * (t - 1) ** 2
  },
} satisfies Record<string, Ease>

type Running = {
  start: number
  duration: number
  update: (t: number) => void
  ease: Ease
  resolve: () => void
}

/** Frame-driven tweens; `tick` is called from the scene's render loop with seconds elapsed. */
export class Tweens {
  private running = new Set<Running>()
  private now = 0
  speed = 1

  run(durationMs: number, update: (t: number) => void, easing: Ease = ease.inOutCubic): Promise<void> {
    const duration = Math.max(0.001, (durationMs / 1000) * this.speed)
    return new Promise((resolve) => {
      this.running.add({ start: this.now, duration, update, ease: easing, resolve })
    })
  }

  wait(durationMs: number) {
    return this.run(durationMs, () => undefined, ease.linear)
  }

  tick(now: number) {
    this.now = now
    for (const item of this.running) {
      const raw = Math.min(1, (now - item.start) / item.duration)
      item.update(item.ease(raw))
      if (raw >= 1) {
        this.running.delete(item)
        item.resolve()
      }
    }
  }

  /** Jump every running tween to its end, e.g. before starting a new round. */
  finishAll() {
    for (const item of this.running) {
      item.update(item.ease(1))
      item.resolve()
    }
    this.running.clear()
  }
}

export const lerp = (from: number, to: number, t: number) => from + (to - from) * t
