import { useEffect, useRef, useState } from 'react'
import type { PointerEvent as ReactPointerEvent } from 'react'
import { OwlConfetti } from './OwlConfetti'
import { OWL_POSE_IMAGES, prefersReducedMotion } from './owlPoses'
import type { OwlPose } from './owlPoses'
import styles from './OwlHero.module.css'

export type OwlHeroSize = 'xs' | 'sm' | 'md' | 'lg'
/** `calm` floats and breathes, `walk` waddles in place, `hop` keeps jumping for joy. */
export type OwlHeroMotion = 'calm' | 'walk' | 'hop'

export interface OwlHeroProps {
  /** The pose to show; ignored when `poses` has entries. */
  pose?: OwlPose
  /** Poses to cycle through, crossfading from one to the next every `cycleMs`. */
  poses?: readonly OwlPose[]
  /** Extra poses kept mounted so switching `pose` from outside crossfades at once instead of waiting on a download. */
  frames?: readonly OwlPose[]
  cycleMs?: number
  size?: OwlHeroSize
  /** Where the owl slides in from when it mounts. */
  enter?: 'up' | 'left' | 'right'
  motion?: OwlHeroMotion
  /** The glow, orbit ring and sparkles around the owl. */
  decor?: boolean
  /** A click makes the owl hop; with this it also bursts confetti. */
  burstOnClick?: boolean
  /** Each new value bursts confetti once, for good news. */
  celebrateKey?: string | number | null
  /** Accessible description; empty keeps the owl decorative. */
  alt?: string
  className?: string
}

const HOP_FRAMES: Keyframe[] = [
  { transform: 'translateY(0) scale(1, 1)' },
  { transform: 'translateY(0) scale(1.08, .9)', offset: .18 },
  { transform: 'translateY(-22%) scale(.95, 1.06) rotate(-4deg)', offset: .5 },
  { transform: 'translateY(0) scale(1.06, .93) rotate(2deg)', offset: .78 },
  { transform: 'translateY(0) scale(1, 1)' },
]

/** Index of the pose to show; it advances on a timer when there is more than one pose and motion is allowed. */
function usePoseIndex(count: number, cycleMs: number) {
  const [index, setIndex] = useState(0)

  useEffect(() => {
    if (count < 2 || prefersReducedMotion()) return undefined
    const timer = window.setInterval(() => setIndex((current) => (current + 1) % count), cycleMs)
    return () => window.clearInterval(timer)
  }, [count, cycleMs])

  return count > 0 ? index % count : 0
}

/**
 * The owl hero with its own motion: it slides in, floats, breathes and tilts its head on a loop, leans toward the
 * mouse, wiggles on hover and hops on click. All motion is transform/opacity and stops under reduced motion.
 */
export function OwlHero({
  pose = 'cheer',
  poses,
  frames: extraFrames = [],
  cycleMs = 5200,
  size = 'md',
  enter = 'up',
  motion = 'calm',
  decor = true,
  burstOnClick = true,
  celebrateKey = null,
  alt = '',
  className,
}: OwlHeroProps) {
  const list = poses && poses.length > 0 ? poses : [pose]
  const active = list[usePoseIndex(list.length, cycleMs)]
  const frames = [...new Set([...list, ...extraFrames])]
  const rootRef = useRef<HTMLSpanElement>(null)
  const reactRef = useRef<HTMLSpanElement>(null)
  const [burst, setBurst] = useState(0)

  const lean = (event: ReactPointerEvent<HTMLSpanElement>) => {
    const root = rootRef.current
    if (!root || event.pointerType !== 'mouse') return
    const box = root.getBoundingClientRect()
    root.style.setProperty('--lean-x', ((event.clientX - box.left) / box.width - .5).toFixed(3))
    root.style.setProperty('--lean-y', ((event.clientY - box.top) / box.height - .5).toFixed(3))
  }

  const straighten = () => {
    rootRef.current?.style.setProperty('--lean-x', '0')
    rootRef.current?.style.setProperty('--lean-y', '0')
  }

  const hop = () => {
    if (prefersReducedMotion()) return
    reactRef.current?.animate?.(HOP_FRAMES, { duration: 720, easing: 'cubic-bezier(.3, .7, .4, 1)' })
    if (burstOnClick) setBurst((count) => count + 1)
  }

  return (
    <span
      aria-hidden={alt ? undefined : true}
      aria-label={alt || undefined}
      className={[styles.root, styles[size], className].filter(Boolean).join(' ')}
      data-enter={enter}
      data-motion={motion}
      onClick={hop}
      onPointerLeave={straighten}
      onPointerMove={lean}
      ref={rootRef}
      role={alt ? 'img' : undefined}
    >
      {decor ? (
        <>
          <span className={styles.halo} />
          <span className={styles.orbit}><span className={styles.planet} /></span>
          <span className={`${styles.spark} ${styles.sparkA}`} />
          <span className={`${styles.spark} ${styles.sparkB}`} />
          <span className={`${styles.spark} ${styles.sparkC}`} />
        </>
      ) : null}
      <span className={styles.shadow} />
      <span className={styles.stage}>
        <span className={styles.float}>
          <span className={styles.react} ref={reactRef}>
            <span className={styles.lean}>
              <span className={styles.sway}>
                <span className={styles.body}>
                  {frames.map((key) => (
                    <img
                      alt=""
                      className={`${styles.frame}${key === active ? ` ${styles.visible}` : ''}`}
                      decoding="async"
                      draggable={false}
                      key={key}
                      src={OWL_POSE_IMAGES[key]}
                    />
                  ))}
                </span>
              </span>
            </span>
          </span>
        </span>
      </span>
      {celebrateKey !== null ? <OwlConfetti key={`celebrate-${celebrateKey}`} /> : null}
      {burst > 0 ? <OwlConfetti key={`burst-${burst}`} /> : null}
    </span>
  )
}
