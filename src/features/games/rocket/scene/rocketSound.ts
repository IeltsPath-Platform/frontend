/** Tiny synthesized cues; there are no audio assets for the Rocket game yet. */

type Cue = 'launch' | 'correct' | 'wrong'

let context: AudioContext | null = null

function audio() {
  if (typeof window === 'undefined' || !('AudioContext' in window)) return null
  context ??= new AudioContext()
  if (context.state === 'suspended') void context.resume()
  return context
}

function tone(ctx: AudioContext, frequency: number, start: number, duration: number, type: OscillatorType, gain = 0.12, slideTo?: number) {
  const osc = ctx.createOscillator()
  const amp = ctx.createGain()
  osc.type = type
  osc.frequency.setValueAtTime(frequency, start)
  if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, start + duration)
  amp.gain.setValueAtTime(0.0001, start)
  amp.gain.exponentialRampToValueAtTime(gain, start + 0.02)
  amp.gain.exponentialRampToValueAtTime(0.0001, start + duration)
  osc.connect(amp).connect(ctx.destination)
  osc.start(start)
  osc.stop(start + duration + 0.05)
}

export function playCue(cue: Cue) {
  try {
    const ctx = audio()
    if (!ctx) return
    const now = ctx.currentTime
    if (cue === 'launch') tone(ctx, 180, now, 0.55, 'sawtooth', 0.05, 520)
    if (cue === 'correct') {
      tone(ctx, 660, now, 0.18, 'triangle')
      tone(ctx, 990, now + 0.12, 0.3, 'triangle')
    }
    if (cue === 'wrong') tone(ctx, 220, now, 0.45, 'square', 0.06, 110)
  } catch {
    // Audio is decorative; ignore browsers that block it.
  }
}
