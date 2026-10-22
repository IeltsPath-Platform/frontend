import type { CardDraft, Flashcard } from '../api/flashcardApi'

export const MIN_CARDS = 2

export interface EditorImage { key: string | null; url: string | null }

/** One row of the deck editor; `card` is set for rows loaded from an existing deck. */
export interface EditorRow {
  rowId: string
  card?: Flashcard
  originalIndex?: number
  front: string
  back: string
  example: string
  image: EditorImage
}

export const emptyRow = (): EditorRow => ({ rowId: crypto.randomUUID(), front: '', back: '', example: '', image: { key: null, url: null } })

/**
 * `sortOrder` is the stored position; older links have none, so they count as moved and get one on the next save
 * (the API sorts missing positions last, which would otherwise push them behind newly added cards).
 */
export const rowFromCard = (card: Flashcard, sortOrder: number | null): EditorRow => ({
  rowId: card.id, card, originalIndex: sortOrder ?? -1, front: card.front, back: card.back,
  example: card.exampleSentence ?? '', image: { key: card.imageKey ?? null, url: card.imageUrl ?? null },
})

const isBlank = (row: EditorRow) => !row.front.trim() && !row.back.trim() && !row.example.trim() && !row.image.key

export const toDraft = (row: EditorRow): CardDraft => ({
  front: row.front.trim(), back: row.back.trim(), exampleSentence: row.example.trim() || null, imageKey: row.image.key,
})

export interface EditorValidation { rowErrors: Record<string, string>; formError: string; filled: EditorRow[] }

/** Blank rows are skipped; a row with only one side filled is an error, as is a deck with fewer than two cards. */
export function validateRows(title: string, rows: readonly EditorRow[]): EditorValidation {
  const rowErrors: Record<string, string> = {}
  const filled: EditorRow[] = []
  for (const row of rows) {
    if (isBlank(row)) continue
    if (!row.front.trim()) rowErrors[row.rowId] = 'Nhập thuật ngữ cho thẻ này.'
    else if (!row.back.trim()) rowErrors[row.rowId] = 'Nhập định nghĩa cho thẻ này.'
    else filled.push(row)
  }
  let formError = ''
  if (!title.trim()) formError = 'Nhập tiêu đề để tạo học phần.'
  else if (Object.keys(rowErrors).length) formError = 'Một số thẻ còn thiếu nội dung.'
  else if (filled.length < MIN_CARDS) formError = `Cần ít nhất ${MIN_CARDS} thẻ có đủ thuật ngữ và định nghĩa.`
  return { rowErrors, formError, filled }
}

export interface SavePlan {
  create: { row: EditorRow; index: number }[]
  update: { row: EditorRow; card: Flashcard }[]
  /** Existing cards whose position changed: the deck link is re-created with the new sort order. */
  reorder: { card: Flashcard; index: number }[]
  remove: Flashcard[]
}

const changed = (row: EditorRow, card: Flashcard) => {
  const draft = toDraft(row)
  return draft.front !== card.front || draft.back !== card.back
    || (draft.exampleSentence ?? null) !== (card.exampleSentence ?? null) || draft.imageKey !== (card.imageKey ?? null)
}

/** Diffs the edited rows against the cards originally loaded so only real changes hit the API. */
export function planSave(filled: readonly EditorRow[], original: readonly Flashcard[]): SavePlan {
  const kept = new Set<string>()
  const plan: SavePlan = { create: [], update: [], reorder: [], remove: [] }
  filled.forEach((row, index) => {
    if (!row.card) { plan.create.push({ row, index }); return }
    kept.add(row.card.id)
    if (changed(row, row.card)) plan.update.push({ row, card: row.card })
    if (row.originalIndex !== index) plan.reorder.push({ card: row.card, index })
  })
  plan.remove = original.filter((card) => !kept.has(card.id))
  return plan
}
