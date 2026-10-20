/** How the video and the answer card are arranged on the player page (wide screens only). */
export type PlayerLayout = 'compact' | 'theater' | 'stacked'

export const PLAYER_LAYOUTS: readonly { value: PlayerLayout; label: string; hint: string }[] = [
  { value: 'compact', label: 'Thu gọn', hint: 'Video và danh sách câu bên trái, ô gõ bên phải' },
  { value: 'theater', label: 'Rạp chiếu', hint: 'Video và ô gõ bên trái, danh sách câu bên phải' },
  { value: 'stacked', label: 'Xếp dọc', hint: 'Video ở trên, ô gõ ở giữa, các câu ở dưới' },
]

const STORAGE_KEY = 'video-dictation.layout'

function isPlayerLayout(value: unknown): value is PlayerLayout {
  return PLAYER_LAYOUTS.some((layout) => layout.value === value)
}

/** The layout the learner picked last time; storage may be blocked or hold junk, so fall back to compact. */
export function readStoredLayout(): PlayerLayout {
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY)
    return isPlayerLayout(stored) ? stored : 'compact'
  } catch {
    return 'compact'
  }
}

export function storeLayout(layout: PlayerLayout) {
  try {
    window.localStorage.setItem(STORAGE_KEY, layout)
  } catch {
    // Remembering the choice is a convenience only.
  }
}

/** The layouts with two columns, whose divider the learner can drag. */
export type ResizableLayout = Extract<PlayerLayout, 'compact' | 'theater'>

export type ColumnWidths = Record<ResizableLayout, number | null>

const columnKey = (layout: ResizableLayout) => `video-dictation.column.${layout}`

/** The width in px the learner gave the side column of this layout, or null for the default width. */
export function readStoredColumn(layout: ResizableLayout): number | null {
  try {
    const value = Number(window.localStorage.getItem(columnKey(layout)))
    return Number.isFinite(value) && value > 0 ? value : null
  } catch {
    return null
  }
}

export function storeColumn(layout: ResizableLayout, width: number | null) {
  try {
    if (width === null) window.localStorage.removeItem(columnKey(layout))
    else window.localStorage.setItem(columnKey(layout), String(Math.round(width)))
  } catch {
    // Remembering the width is a convenience only.
  }
}
