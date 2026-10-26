import { useEffect, useRef, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { X } from 'lucide-react'
import celebrate from '@/assets/owl/owl-celebrate.png'
import idle from '@/assets/owl/owl-idle.png'
import stepLeft from '@/assets/owl/owl-step-left.png'
import stepRight from '@/assets/owl/owl-step-right.png'
import wait from '@/assets/owl/owl-wait.png'
import styles from './OwlMascot.module.css'
import { useAuthSession } from '@/features/auth/authSession'
import { OwlPanel } from './OwlPanel'
import type { OwlTab } from './owl-messages'
import { useOwlData } from './useOwlData'
import { useOwlSuggestions } from './useOwlSuggestions'
import { useSuggestionReminder } from './useSuggestionReminder'

type Pose = 'idle' | 'right' | 'left' | 'celebrate' | 'wait'

const POSES: Record<Pose, string> = { idle, right: stepRight, left: stepLeft, celebrate, wait }

/** One loop of the animation: the pose to show and for how long (ms). */
const TIMELINE: ReadonlyArray<readonly [Pose, number]> = [
  ['idle', 4200],
  ['right', 260], ['left', 260], ['right', 260], ['left', 260], ['right', 260], ['left', 260],
  ['celebrate', 900],
  ['idle', 3000],
  ['wait', 1800],
]

/** The first bubble shows after this delay, each bubble stays this long, then the next one comes after the pause. */
const FIRST_BUBBLE_MS = 4000
const BUBBLE_VISIBLE_MS = 9000
const BUBBLE_PAUSE_MS = 25_000
/** News from a submission stays this long. */
const ANNOUNCEMENT_MS = 7000

/** Screens where the learner is mid-exam; the owl keeps quiet there. */
const QUIET_ROUTES = [/^\/learn\/placement/, /^\/learn\/tests\//, /^\/learn\/practice\//, /^\/practice\//, /^\/games\/matches\//]

/** The course list already shows today's suggestions as a strip, so the owl does not nudge about them there. */
const COURSE_LIST_ROUTE = /^\/learn\/?$/

/** Whether the user asked the OS to reduce motion; the owl then stays still. */
function prefersReducedMotion() {
  return typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
}

/** Cycles through the poses of the owl; a still owl when the user prefers reduced motion. */
function useOwlPose(): Pose {
  const [pose, setPose] = useState<Pose>('idle')

  useEffect(() => {
    if (prefersReducedMotion()) return undefined
    let step = 0
    let timer: number
    const advance = () => {
      const [next, duration] = TIMELINE[step % TIMELINE.length]
      setPose(next)
      step += 1
      timer = window.setTimeout(advance, duration)
    }
    advance()
    return () => window.clearTimeout(timer)
  }, [])

  return pose
}

/** Index of the message to show now, or `null` while the bubble is hidden. Messages come one after another. */
function useBubbleIndex(count: number, enabled: boolean): number | null {
  const [index, setIndex] = useState<number | null>(null)

  useEffect(() => {
    if (count === 0 || !enabled) return undefined
    let shown = 0
    let timer: number
    const show = () => {
      setIndex(shown % count)
      shown += 1
      timer = window.setTimeout(hide, BUBBLE_VISIBLE_MS)
    }
    const hide = () => {
      setIndex(null)
      timer = window.setTimeout(show, BUBBLE_PAUSE_MS)
    }
    timer = window.setTimeout(show, FIRST_BUBBLE_MS)
    return () => {
      window.clearTimeout(timer)
      setIndex(null)
    }
  }, [count, enabled])

  return count > 0 && enabled ? index : null
}

/**
 * The owl mascot, fixed in the bottom-right corner of every page.
 * For a signed-in learner it speaks in a bubble about today's quests and the badges about to unlock, cheers when a
 * submission levels them up or completes a quest or badge, and warns when hearts run low. Once a day, away from the
 * course list, it also offers the optional suggestions. Clicking the owl or a bubble opens a detail panel with
 * quests, badges and suggestions. A signed-out visitor gets a still decoration that takes no clicks.
 */
export function OwlMascot() {
  const pose = useOwlPose()
  const { isLoggedIn } = useAuthSession()
  const { snapshot, messages, announcements, dismissAnnouncement } = useOwlData()
  const { state: suggestions, load: loadSuggestions } = useOwlSuggestions(isLoggedIn)
  const { pathname } = useLocation()
  const rootRef = useRef<HTMLDivElement>(null)
  const [silenced, setSilenced] = useState(false)
  const [open, setOpen] = useState(false)
  const [tab, setTab] = useState<OwlTab>('quests')

  const quietRoute = QUIET_ROUTES.some((route) => route.test(pathname))
  const { reminder, dismissReminder } = useSuggestionReminder({
    enabled: isLoggedIn && !quietRoute && !COURSE_LIST_ROUTE.test(pathname),
    suggestions,
    load: loadSuggestions,
  })
  const announcement = !quietRoute && !open ? announcements[0] ?? null : null
  const suggestionNudge = !quietRoute && !open && !announcement ? reminder : null
  const reminderIndex = useBubbleIndex(messages.length, !quietRoute && !silenced && !open && !announcement && !suggestionNudge)
  const message = announcement ?? suggestionNudge ?? (reminderIndex === null ? null : messages[reminderIndex] ?? null)
  // Good news makes the owl cheer and a warning makes it wait, whatever the loop is doing.
  const shownPose: Pose = message?.mood === 'celebrate' ? 'celebrate' : message?.mood === 'warn' ? 'wait' : pose

  useEffect(() => {
    if (!announcement) return undefined
    const timer = window.setTimeout(dismissAnnouncement, ANNOUNCEMENT_MS)
    return () => window.clearTimeout(timer)
  }, [announcement, dismissAnnouncement])

  useEffect(() => {
    if (!open) return undefined
    const onKey = (event: KeyboardEvent) => { if (event.key === 'Escape') setOpen(false) }
    const onPointer = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false)
    }
    document.addEventListener('keydown', onKey)
    document.addEventListener('pointerdown', onPointer)
    return () => {
      document.removeEventListener('keydown', onKey)
      document.removeEventListener('pointerdown', onPointer)
    }
  }, [open])

  // The tab loads its own data the moment it is shown, so an idle owl never asks for it.
  useEffect(() => {
    if (open && tab === 'suggestions') loadSuggestions()
  }, [open, tab, loadSuggestions])

  const openPanel = (next: OwlTab) => {
    setTab(next)
    setOpen(true)
    if (announcement) dismissAnnouncement()
    if (suggestionNudge) dismissReminder()
  }

  const frames = (Object.keys(POSES) as Pose[]).map((key) => (
    <img
      alt=""
      className={`${styles.frame}${key === shownPose ? ` ${styles.visible}` : ''}`}
      draggable={false}
      key={key}
      src={POSES[key]}
    />
  ))

  return (
    <div className={styles.root} data-pose={shownPose} ref={rootRef}>
      {open && isLoggedIn ? (
        <OwlPanel
          onClose={() => setOpen(false)}
          onRetrySuggestions={loadSuggestions}
          onTab={setTab}
          snapshot={snapshot}
          suggestions={suggestions}
          tab={tab}
        />
      ) : message ? (
        <div className={`${styles.bubble} ${styles[message.mood]}`} role="status">
          <button className={styles.bubbleText} onClick={() => openPanel(message.tab)} type="button">{message.text}</button>
          <button
            aria-label="Đóng lời nhắn của cú"
            className={styles.bubbleClose}
            onClick={announcement ? dismissAnnouncement : suggestionNudge ? dismissReminder : () => setSilenced(true)}
            type="button"
          >
            <X aria-hidden="true" size={14} />
          </button>
        </div>
      ) : null}
      {isLoggedIn ? (
        <button
          aria-expanded={open}
          aria-label="Nhiệm vụ, huy hiệu và gợi ý của bạn"
          className={`${styles.owl} ${styles.owlButton}`}
          onClick={() => (open ? setOpen(false) : openPanel('quests'))}
          type="button"
        >
          <span className={styles.body}>{frames}</span>
          <span className={styles.shadow} />
        </button>
      ) : (
        <div aria-hidden="true" className={styles.owl}>
          <div className={styles.body}>{frames}</div>
          <span className={styles.shadow} />
        </div>
      )}
    </div>
  )
}
