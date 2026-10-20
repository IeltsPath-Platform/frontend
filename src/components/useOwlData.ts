import { useCallback, useEffect, useRef, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { learningApi } from '@/features/learning-path/api'
import { useAuthSession } from '@/features/auth/authSession'
import { subscribeGamification } from './owl-events'
import { buildAnnouncements, buildOwlMessages, type OwlMessage, type OwlSnapshot } from './owl-messages'

/** Data is refetched on navigation at most this often, so the owl follows the learner's progress. */
const REFRESH_MS = 60_000

const EMPTY: OwlSnapshot = { progress: null, hearts: null, quests: null, badges: null }

/** Loads every part on its own; a part that fails keeps what the owl knew, since the owl is only decoration. */
async function fetchSnapshot(previous: OwlSnapshot): Promise<OwlSnapshot> {
  const [progress, hearts, quests, badges] = await Promise.allSettled([
    learningApi.getProgress(),
    learningApi.getHearts(),
    learningApi.getQuests(),
    learningApi.getBadges(),
  ])
  return {
    progress: progress.status === 'fulfilled' ? progress.value : previous.progress,
    hearts: hearts.status === 'fulfilled' ? hearts.value : previous.hearts,
    quests: quests.status === 'fulfilled' ? quests.value : previous.quests,
    badges: badges.status === 'fulfilled' ? badges.value : previous.badges,
  }
}

export interface OwlData {
  snapshot: OwlSnapshot
  /** Today's reminders: the quests of the day and the badges about to unlock. */
  messages: OwlMessage[]
  /** News from submissions, oldest first. The owl shows the first and calls `dismiss` when it is done. */
  announcements: OwlMessage[]
  dismissAnnouncement: () => void
}

/**
 * What the owl knows and has to say for the signed-in learner. It loads on sign-in and on navigation, and reloads
 * after every submission that earned or cost something, comparing before and after to find what is new.
 */
export function useOwlData(): OwlData {
  const { isLoggedIn, hydrated } = useAuthSession()
  const { pathname } = useLocation()
  const [snapshot, setSnapshot] = useState<OwlSnapshot>(EMPTY)
  const [announcements, setAnnouncements] = useState<OwlMessage[]>([])
  const known = useRef<OwlSnapshot>(EMPTY)
  const lastFetch = useRef(0)

  const apply = useCallback((next: OwlSnapshot) => {
    known.current = next
    setSnapshot(next)
  }, [])

  useEffect(() => {
    if (!hydrated) return undefined
    if (!isLoggedIn) {
      known.current = EMPTY
      lastFetch.current = 0
      return undefined
    }
    if (Date.now() - lastFetch.current < REFRESH_MS) return undefined
    lastFetch.current = Date.now()
    let active = true
    let settled = false
    fetchSnapshot(known.current).then((next) => {
      settled = true
      if (active) apply(next)
    })
    return () => {
      active = false
      // A request dropped by navigating away must not block the next fetch.
      if (!settled) lastFetch.current = 0
    }
  }, [apply, hydrated, isLoggedIn, pathname])

  useEffect(() => {
    if (!isLoggedIn) return undefined
    return subscribeGamification((summary) => {
      const before = known.current
      fetchSnapshot(before).then((after) => {
        lastFetch.current = Date.now()
        apply(after)
        const news = buildAnnouncements(before, after, summary)
        if (news.length > 0) setAnnouncements((queue) => [...queue, ...news])
      })
    })
  }, [apply, isLoggedIn])

  const dismissAnnouncement = useCallback(() => setAnnouncements((queue) => queue.slice(1)), [])

  // A signed-out visitor never sees what the previous account's data said.
  if (!isLoggedIn) return { snapshot: EMPTY, messages: [], announcements: [], dismissAnnouncement }
  return {
    snapshot,
    messages: buildOwlMessages(snapshot.quests, snapshot.badges),
    announcements,
    dismissAnnouncement,
  }
}
