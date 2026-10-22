import { useEffect, useImperativeHandle, useRef } from 'react'
import type { Ref } from 'react'
import jump from '@/assets/owl/nav-owl-jump.webp'
import stand from '@/assets/owl/nav-owl-stand.webp'
import stepLeft from '@/assets/owl/nav-owl-step-left.webp'
import stepRight from '@/assets/owl/nav-owl-step-right.webp'
import wait from '@/assets/owl/nav-owl-wait.webp'
import { prefersReducedMotion } from './owlPoses'
import styles from './NavOwl.module.css'

export interface NavOwlHandle {
  /** Walks the owl to stand centred on `x` (px from the left of the nav links); the first owl ever just appears. */
  moveTo: (x: number) => void
  hide: () => void
}

type NavOwlState = 'stand' | 'walk' | 'jump' | 'wait'

const FRAMES: ReadonlyArray<readonly [string, string]> = [
  [styles.stand, stand],
  [styles.stepLeft, stepLeft],
  [styles.stepRight, stepRight],
  [styles.jump, jump],
  [styles.wait, wait],
]

/** Walking speed: a short hop takes the minimum, a long walk never takes longer than the maximum. */
const MIN_WALK_MS = 420
const MAX_WALK_MS = 1100
const MS_PER_PX = 1.4
const JUMP_MS = 680
/** While standing, the owl turns around to wait every so often. */
const IDLE_EVERY_MS = 6500
const WAIT_MS = 1700

/**
 * Where the owl last stood. Every page mounts its own navbar, so a new owl starts from here and walks from the
 * previous page's item to the new one instead of popping up.
 */
let lastX: number | null = null

/**
 * The mini owl walking along the main navigation to the selected item: it steps foot by foot on the way, jumps for
 * joy on arrival and sometimes turns around while it waits. Driven through the DOM because it follows layout
 * measurements, like the sliding highlight it rides on.
 */
export function NavOwl({ ref }: { ref?: Ref<NavOwlHandle> }) {
  const rootRef = useRef<HTMLSpanElement>(null)
  const xRef = useRef<number | null>(null)
  const timerRef = useRef<number | undefined>(undefined)

  const setState = (state: NavOwlState) => {
    if (rootRef.current) rootRef.current.dataset.state = state
  }

  useImperativeHandle(ref, () => ({
    moveTo(x) {
      const root = rootRef.current
      if (!root) return
      // Re-measuring the same target (a ResizeObserver firing on observe, a re-render) must not cut a walk short.
      if (xRef.current !== null && Math.abs(x - xRef.current) < 2) {
        root.style.opacity = '1'
        return
      }
      const jumpTo = (target: number) => {
        root.style.transition = 'none'
        root.style.opacity = '1'
        root.style.transform = `translateX(${target}px)`
        void root.offsetWidth
        root.style.transition = ''
      }
      const isNewOwl = xRef.current === null
      const from = xRef.current ?? lastX
      xRef.current = x
      lastX = x
      window.clearTimeout(timerRef.current)
      if (from === null || prefersReducedMotion() || Math.abs(x - from) < 2) {
        jumpTo(x)
        setState('stand')
        return
      }
      // A new page's owl appears where the previous page's owl stood, already visible, and walks on from there.
      if (isNewOwl) jumpTo(from)
      root.style.opacity = '1'
      const duration = Math.round(Math.min(MAX_WALK_MS, Math.max(MIN_WALK_MS, Math.abs(x - from) * MS_PER_PX)))
      root.dataset.dir = x > from ? 'right' : 'left'
      root.style.transitionDuration = `${duration}ms`
      root.style.transform = `translateX(${x}px)`
      setState('walk')
      timerRef.current = window.setTimeout(() => {
        setState('jump')
        timerRef.current = window.setTimeout(() => setState('stand'), JUMP_MS)
      }, duration)
    },
    hide() {
      if (rootRef.current) rootRef.current.style.opacity = '0'
    },
  }), [])

  useEffect(() => {
    if (prefersReducedMotion()) return undefined
    const idle = window.setInterval(() => {
      if (rootRef.current?.dataset.state !== 'stand') return
      setState('wait')
      timerRef.current = window.setTimeout(() => setState('stand'), WAIT_MS)
    }, IDLE_EVERY_MS)
    return () => {
      window.clearInterval(idle)
      window.clearTimeout(timerRef.current)
    }
  }, [])

  return (
    <span aria-hidden="true" className={styles.root} data-state="stand" ref={rootRef}>
      <span className={styles.body}>
        {FRAMES.map(([className, src]) => (
          <img alt="" className={`${styles.frame} ${className}`} decoding="async" draggable={false} key={src} src={src} />
        ))}
      </span>
      <span className={styles.shadow} />
    </span>
  )
}
