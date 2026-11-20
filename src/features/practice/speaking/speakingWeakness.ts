/**
 * Lays out one weakness ("Cần cải thiện") so it can be read at a glance instead of as one long paragraph.
 *
 * The grader is asked to write each weakness as: a title (the kind of mistake and how often), the wrong words in quotes, then
 * "Sửa:" with the corrected words, "Quy tắc:" with the rule and "Luyện:" with an exercise. Feedback stored before that form
 * was asked for is looser ("Title: detail", or "Title (ví dụ: 'he live', 'he work')"). This splits what it can find and
 * turns every quoted piece into a chip. Nothing is dropped or reordered: the pieces are shown in the order they were written,
 * and a text with nothing to split is returned as the body alone.
 */

/** A piece of a line: plain words, or words that were in quotes (shown as a chip). */
export type WeaknessToken = { kind: 'text'; text: string } | { kind: 'quote'; text: string }

export interface WeaknessView {
  /** What kind of mistake and how often; empty when the text has no place to cut a title from. */
  title: string
  /** The rest of the first part: the wrong words and what is wrong with them (all of the text when there is no title). */
  body: WeaknessToken[]
  fix: WeaknessToken[]
  rule: WeaknessToken[]
  practice: WeaknessToken[]
}

const LABEL = /(?<![\p{L}])(Sửa|Quy tắc|Luyện tập|Cách luyện|Luyện)\s*:\s*/gu
const DOUBLE_QUOTED = /"([^"]+)"|“([^”]+)”/g
/** 'he live': a single quote that opens after a space or bracket and closes before one, so the apostrophe in "don't" is left alone. */
const SINGLE_QUOTED = /(?<![\p{L}\p{N}])'([^']+)'(?![\p{L}\p{N}])/gu

/**
 * The words between two quotes without the punctuation that only separated them: a leading stop, comma, colon or closing
 * bracket, a trailing comma or an opening "(ví dụ:" that only introduced the quotes.
 */
const tidy = (words: string) => words
  .replace(/\(\s*(?:ví dụ|vd|e\.g\.)\s*:?\s*$/i, '')
  .replace(/^[\s.,;:)]+/, '')
  .replace(/[\s,;]+$/, '')

/** Plain words and quoted words, in order; a quote's own quotation marks and the commas between quotes are dropped. */
export function tokenize(text: string): WeaknessToken[] {
  // Double quotes are the form the grader is asked for; single quotes only mark a quote in text that has no double ones,
  // because there a hint such as (cần 'quickly') is not a quote of the learner's words.
  const quoted = /["“]/.test(text) ? DOUBLE_QUOTED : SINGLE_QUOTED
  const tokens: WeaknessToken[] = []
  let from = 0
  for (const match of text.matchAll(quoted)) {
    const start = match.index ?? 0
    const before = tidy(text.slice(from, start))
    if (before) tokens.push({ kind: 'text', text: before })
    tokens.push({ kind: 'quote', text: (match[1] ?? match[2]).trim() })
    from = start + match[0].length
  }
  const after = tidy(text.slice(from))
  if (after) tokens.push({ kind: 'text', text: after })
  return tokens
}

/**
 * Splits the first part into its title and the rest. The title ends at the colon that comes before the first quote; failing
 * that, at an opening bracket ("... ngôi thứ ba số ít (ví dụ: ...)") or at the end of the first sentence.
 */
function splitTitle(head: string): { title: string; rest: string } {
  const firstQuote = head.search(/["“]/)
  const before = firstQuote === -1 ? head : head.slice(0, firstQuote)
  const colon = before.indexOf(':')
  const bracket = before.indexOf('(')
  if (bracket > 0 && (colon === -1 || bracket < colon)) return { title: head.slice(0, bracket).trim(), rest: head.slice(bracket).trim() }
  if (colon > 0) return { title: head.slice(0, colon).trim(), rest: head.slice(colon + 1).trim() }
  const sentence = head.search(/(?<=[.!?])\s/)
  if (sentence > 0) return { title: head.slice(0, sentence).trim(), rest: head.slice(sentence).trim() }
  return { title: '', rest: head.trim() }
}

export function parseWeakness(text: string): WeaknessView {
  const flat = text.replace(/\s+/g, ' ').trim()
  const labels = [...flat.matchAll(LABEL)]

  const sections: Record<'fix' | 'rule' | 'practice', string> = { fix: '', rule: '', practice: '' }
  labels.forEach((label, index) => {
    const start = (label.index ?? 0) + label[0].length
    const end = index + 1 < labels.length ? labels[index + 1].index ?? flat.length : flat.length
    const key = label[1] === 'Sửa' ? 'fix' : label[1] === 'Quy tắc' ? 'rule' : 'practice'
    if (!sections[key]) sections[key] = flat.slice(start, end).trim()
  })

  const { title, rest } = splitTitle(flat.slice(0, labels[0]?.index ?? flat.length).trim())
  return {
    title,
    body: tokenize(rest),
    fix: tokenize(sections.fix),
    rule: tokenize(sections.rule),
    practice: tokenize(sections.practice),
  }
}
