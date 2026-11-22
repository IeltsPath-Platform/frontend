/**
 * Turns a piece of feedback (a criterion's comment, the summary, the note to the learner) into paragraphs and numbered
 * lists, so a long text is not shown as one block.
 *
 * Feedback written with the current prompt already has its line breaks: a blank line between paragraphs and one numbered
 * line per change ("1. ...", "2. ..."). Feedback stored earlier is one long line; for that the text is split at the ends of
 * sentences and at "(1) ... (2) ..." enumerations. A short text is left as one paragraph.
 */

export type CommentBlock =
  | { kind: 'p'; text: string }
  | { kind: 'list'; items: string[] }

/** A line that starts a list item: "1.", "2)", "(3)", "-", "•". */
const ITEM_MARKER = /^\s*(?:\d{1,2}[.)]|\(\d{1,2}\)|[-•*])\s+/
/** The end of a sentence: a full stop, question or exclamation mark, then a capital letter (Vietnamese ones included). */
const SENTENCE_END = /(?<=[.!?])\s+(?=\p{Lu})/u
/** An enumeration inside one sentence: "(1)", "(2)". */
const INLINE_MARKER = /\s*\(\d{1,2}\)\s*/
/** A text shorter than this stays one paragraph: it is already easy to read. */
const SPLIT_FROM_CHARS = 260

export function commentBlocks(text: string): CommentBlock[] {
  const trimmed = text.trim()
  if (!trimmed) return []
  if (trimmed.includes('\n')) return fromLines(trimmed)
  if (trimmed.length < SPLIT_FROM_CHARS) return [{ kind: 'p', text: trimmed }]
  return fromSentences(trimmed)
}

/** The paragraph where a comment turns to what the learner should do: "Để lên band 6, ..." / "Để đạt Band 5.5 hoặc 6.0, ...". */
const NEXT_BAND = /^Để\s+(?:lên|đạt)\s+(?:mức\s+)?band\s+(\d(?:\.\d)?)\s*(?:hoặc\s+\d(?:\.\d)?)?\s*[,:.]?\s*/i

export interface CommentParts {
  /** What holds the learner at this band: the blocks before the turn. */
  diagnosis: CommentBlock[]
  /** What to do to reach the next band, and which band that is; null when the comment has no such paragraph. */
  next: { band: string; blocks: CommentBlock[] } | null
}

/**
 * Splits a comment at the paragraph that begins "Để lên band N": the part before is the diagnosis, the paragraph and what
 * follows it (its numbered steps) are the way to the next band. The words "Để lên band N," are dropped from that paragraph
 * because the page shows them as the heading of the box.
 */
export function splitComment(text: string): CommentParts {
  const blocks = commentBlocks(text)
  const at = blocks.findIndex((block) => block.kind === 'p' && NEXT_BAND.test(block.text))
  if (at === -1) return { diagnosis: blocks, next: null }
  const first = blocks[at] as { kind: 'p'; text: string }
  const band = NEXT_BAND.exec(first.text)![1]
  const rest = first.text.replace(NEXT_BAND, '')
  const opening: CommentBlock[] = rest ? [{ kind: 'p', text: rest.charAt(0).toUpperCase() + rest.slice(1) }] : []
  return { diagnosis: blocks.slice(0, at), next: { band, blocks: [...opening, ...blocks.slice(at + 1)] } }
}

/** The model's own layout: every non-empty line that is not a list item is a paragraph, consecutive items make one list. */
function fromLines(text: string): CommentBlock[] {
  const blocks: CommentBlock[] = []
  let items: string[] = []
  const closeList = () => {
    if (items.length > 0) blocks.push({ kind: 'list', items })
    items = []
  }
  for (const raw of text.split('\n')) {
    const line = raw.trim()
    if (line === '') { closeList(); continue }
    if (ITEM_MARKER.test(line)) { items.push(line.replace(ITEM_MARKER, '')); continue }
    closeList()
    blocks.push({ kind: 'p', text: line })
  }
  closeList()
  return blocks
}

/** One long line: a paragraph per sentence, and a sentence that enumerates "(1) ... (2) ..." becomes an intro and a list. */
function fromSentences(text: string): CommentBlock[] {
  const blocks: CommentBlock[] = []
  for (const sentence of text.split(SENTENCE_END)) {
    const parts = sentence.split(INLINE_MARKER)
    if (parts.length >= 3) { // an intro before "(1)" and at least two items
      const [intro, ...items] = parts
      if (intro.trim()) blocks.push({ kind: 'p', text: intro.trim() })
      blocks.push({ kind: 'list', items: items.map((item) => item.trim().replace(/[;,]\s*$/, '')).filter(Boolean) })
    } else if (sentence.trim()) {
      blocks.push({ kind: 'p', text: sentence.trim() })
    }
  }
  return blocks
}
