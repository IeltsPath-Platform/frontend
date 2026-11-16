import type { TrailItem } from '../components/LearnTrail'

/**
 * Breadcrumbs of the pages that live under "Lịch sử nộp bài" in the menu. The menu is the source: "Trang chủ" (`/home`) holds
 * "Lịch sử nộp bài" (`/submission-history`), so a page opened from that list reads Trang chủ › Lịch sử nộp bài › the page, and
 * lights that item in the navbar. Where the learner came from only decides which tab of the list the middle step returns to.
 * It is carried in the address (`?from=`) so it survives a reload and a trip to a practice set; only paths of this app that
 * name that list are accepted, anything else is ignored and the middle step opens the list as it is.
 */
export const HOME_PATH = '/home'
export const HISTORY_PATH = '/submission-history'
export const HISTORY_LABEL = 'Lịch sử nộp bài'

const PARAM = 'from'

/** The old address of the teacher list is the same page. */
const ORIGINS: readonly string[] = [HISTORY_PATH, '/writing-reviews']

export interface ResultOrigin {
  /** The list to return to, with its tab and filters. */
  to: string
}

/** The address of a result page, remembering the list it was opened from. */
export function withOrigin(path: string, from: string) {
  return `${path}?${PARAM}=${encodeURIComponent(from)}`
}

/** The list a result page was opened from, or null when the address names none this app knows. */
export function readOrigin(search: string): ResultOrigin | null {
  const from = new URLSearchParams(search).get(PARAM)
  if (!from || !from.startsWith('/') || from.startsWith('//') || from.includes('\\')) return null
  const known = ORIGINS.some((prefix) => from === prefix || from.startsWith(`${prefix}?`) || from.startsWith(`${prefix}/`))
  return known ? { to: from } : null
}

/** Lịch sử nộp bài (the tab the learner came from) › the pages in between › the current page; the trail adds the house. */
export function historyTrail(current: string, origin: ResultOrigin | null, between: TrailItem[] = []): TrailItem[] {
  return [
    { label: HISTORY_LABEL, to: origin?.to ?? HISTORY_PATH },
    ...between,
    { label: current },
  ]
}
