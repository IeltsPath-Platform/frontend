import { useEffect, useRef, useState } from 'react'
import { OwlHero, type OwlHeroMotion, type OwlHeroSize } from '@/components/OwlHero'
import { prefersReducedMotion, type OwlPose } from '@/components/owlPoses'
import type { OwlEffect } from '../lib/owl-reactions'
import '../owl-coach.css'

const COACH_FRAMES: readonly OwlPose[] = ['cheer', 'confident', 'party', 'cool', 'idea', 'confused', 'tired', 'wave', 'desk', 'laptop']

/** Glyphs and particle count of each effect; positions are spread evenly around the owl. */
const EFFECT_PARTICLES: Partial<Record<OwlEffect, { glyphs: string[]; count: number }>> = {
  stars: { glyphs: ['⭐', '✨', '🌟'], count: 9 },
  confetti: { glyphs: ['🎉', '✨', '⭐', '🎊'], count: 12 },
  fire: { glyphs: ['🔥', '⭐', '✨'], count: 10 },
  hearts: { glyphs: ['💖', '💛', '💙'], count: 8 },
  idea: { glyphs: ['💡'], count: 1 },
  question: { glyphs: ['❓', '❔'], count: 3 },
  sweat: { glyphs: ['💧'], count: 2 },
  zzz: { glyphs: ['💤'], count: 3 },
}

const JUMP: Keyframe[] = [
  { transform: 'translateY(0) scale(1)' },
  { transform: 'translateY(4%) scale(1.06, .92)', offset: .15 },
  { transform: 'translateY(-14%) scale(.96, 1.06) rotate(-5deg)', offset: .45 },
  { transform: 'translateY(0) scale(1.04, .96) rotate(3deg)', offset: .75 },
  { transform: 'translateY(0) scale(1)' },
]
const BODY_FRAMES: Partial<Record<OwlEffect, Keyframe[]>> = {
  stars: JUMP,
  confetti: JUMP,
  fire: JUMP,
  hearts: [{ transform: 'scale(1)' }, { transform: 'scale(1.1)', offset: .3 }, { transform: 'scale(.97)', offset: .6 }, { transform: 'scale(1)' }],
  shake: [{ transform: 'rotate(0)' }, { transform: 'rotate(-7deg)', offset: .2 }, { transform: 'rotate(6deg)', offset: .4 }, { transform: 'rotate(-4deg)', offset: .6 }, { transform: 'rotate(2deg)', offset: .8 }, { transform: 'rotate(0)' }],
  idea: [{ transform: 'translateY(0) rotate(0)' }, { transform: 'translateY(-4%) rotate(-6deg)', offset: .4 }, { transform: 'translateY(0) rotate(0)' }],
  question: [{ transform: 'rotate(0)' }, { transform: 'rotate(-12deg)', offset: .35 }, { transform: 'rotate(-12deg)', offset: .7 }, { transform: 'rotate(0)' }],
  sweat: [{ transform: 'translateY(0)' }, { transform: 'translateY(5%) scale(1.02, .96)', offset: .5 }, { transform: 'translateY(0)' }],
  wave: [{ transform: 'rotate(0)' }, { transform: 'rotate(5deg)', offset: .25 }, { transform: 'rotate(-5deg)', offset: .5 }, { transform: 'rotate(3deg)', offset: .75 }, { transform: 'rotate(0)' }],
  zzz: [{ transform: 'translateY(0)' }, { transform: 'translateY(3%) rotate(4deg)', offset: .5 }, { transform: 'translateY(0)' }],
}

/** Characters revealed per tick of the typing effect. */
const TYPE_STEP = 2
const TYPE_INTERVAL_MS = 24

export interface OwlCoachProps {
  pose?: OwlPose
  motion?: OwlHeroMotion
  celebrateKey?: string | number | null
  message?: string | null
  tone?: 'success' | 'warning' | 'info'
  /** Effect played around the owl; it replays whenever `message` changes. */
  effect?: OwlEffect | null
  /** Current run of correct answers; a flame badge shows from 2. */
  streak?: number
  size?: OwlHeroSize
  autoHideMs?: number
  className?: string
}

/** Reveals `text` a few characters at a time; reduced motion shows it at once. */
function useTypedText(text: string | null | undefined) {
  const [shown, setShown] = useState(0)
  const [source, setSource] = useState(text)
  if (text !== source) { setSource(text); setShown(0) }
  useEffect(() => {
    if (!text || prefersReducedMotion()) return undefined
    const timer = window.setInterval(() => setShown((count) => {
      if (count + TYPE_STEP >= text.length) window.clearInterval(timer)
      return Math.min(text.length, count + TYPE_STEP)
    }), TYPE_INTERVAL_MS)
    return () => window.clearInterval(timer)
  }, [text])
  if (!text) return ''
  return prefersReducedMotion() ? text : text.slice(0, shown)
}

export function OwlCoach({
  pose = 'confident',
  motion = 'calm',
  celebrateKey = null,
  message = null,
  tone = 'info',
  effect = null,
  streak = 0,
  size = 'md',
  autoHideMs = 6000,
  className = '',
}: OwlCoachProps) {
  const [prevMessage, setPrevMessage] = useState(message)
  const [hidden, setHidden] = useState(false)
  const [play, setPlay] = useState(0)

  // A new message re-shows the bubble and replays the effect.
  if (message !== prevMessage) {
    setPrevMessage(message)
    setHidden(false)
    setPlay((value) => value + 1)
  }

  useEffect(() => {
    if (!message || autoHideMs <= 0) return undefined
    const timer = window.setTimeout(() => setHidden(true), autoHideMs)
    return () => window.clearTimeout(timer)
  }, [message, autoHideMs])

  // Body language on top of OwlHero's own motion: a head shake for misses, a nod for near misses, a jump for wins.
  const heroRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const frames = effect ? BODY_FRAMES[effect] : undefined
    if (!play || !frames || !heroRef.current?.animate || prefersReducedMotion()) return undefined
    const animation = heroRef.current.animate(frames, { duration: 700, easing: 'cubic-bezier(.2,.8,.2,1)' })
    return () => animation.cancel()
  }, [play, effect])

  const typed = useTypedText(message)
  const visible = Boolean(message) && !hidden
  const particles = effect ? EFFECT_PARTICLES[effect] : undefined
  const showPlusOne = effect === 'stars' || effect === 'fire' || effect === 'confetti' || effect === 'hearts'

  return (
    <aside className={`owl-coach is-${tone} is-${size} ${visible ? 'is-talking' : ''} ${className}`.trim()} aria-label="Cú cố vấn học tập">
      <div className="owl-coach-bubble" role="status" aria-live="polite" aria-atomic="true" data-visible={visible ? 'true' : 'false'}>
        {message && <>
          <span className="sr-only">{message}</span>
          <p aria-hidden="true">{typed}<span className="owl-coach-caret" /></p>
        </>}
      </div>

      <div ref={heroRef} className="owl-coach-hero">
        <OwlHero pose={pose} motion={motion} size={size} decor={false} celebrateKey={celebrateKey} frames={COACH_FRAMES} alt="" />
        {/* Keyed by `play` so the particles restart for every new message without remounting the owl. */}
        {particles && (
          <span key={`fx-${play}`} className={`owl-coach-particles fx-${effect}`} aria-hidden="true">
            {Array.from({ length: particles.count }, (_, index) => (
              <i key={index} style={{
                ['--angle' as string]: `${(360 / particles.count) * index + (index % 2 ? 12 : -8)}deg`,
                ['--delay' as string]: `${index * 45}ms`,
                ['--distance' as string]: `${4.5 + (index % 3) * 1.4}rem`,
              }}>{particles.glyphs[index % particles.glyphs.length]}</i>
            ))}
          </span>
        )}
        {showPlusOne && <span key={`plus-${play}`} className="owl-coach-plus" aria-hidden="true">+1</span>}
        {streak >= 2 && <span key={`streak-${streak}`} className="owl-coach-streak" aria-label={`Chuỗi ${streak} câu đúng`}>🔥 {streak}</span>}
      </div>
    </aside>
  )
}
