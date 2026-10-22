/** Narrowest the dragged column may get, and the room that always stays for the other one (px). */
export const MIN_COLUMN = 260
export const MIN_OTHER_COLUMN = 420

/** Keeps a dragged column between its minimum and what leaves the other column its own minimum. */
export function clampColumn(width: number, containerWidth: number) {
  return Math.round(Math.min(Math.max(width, MIN_COLUMN), Math.max(MIN_COLUMN, containerWidth - MIN_OTHER_COLUMN)))
}
