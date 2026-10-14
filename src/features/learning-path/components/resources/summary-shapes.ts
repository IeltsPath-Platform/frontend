/**
 * Reading the shape of a lesson summary written in Markdown.
 *
 * Nothing here knows about a particular lesson. A summary is split at its `##` headings, and each list is shown
 * the way its content is shaped: `**Term:** a, b, c` is a word group, `**Term**: meaning *"example"*` is a card,
 * short plain lines are a tick grid, and a numbered list is a set of steps. Anything else falls back to plain text.
 */

/** The small slice of react-markdown's syntax tree (hast) that this file reads. */
export interface HNode {
  type: string
  tagName?: string
  value?: string
  properties?: Record<string, unknown>
  children?: HNode[]
  position?: { start?: { line?: number } }
}

export interface SummarySection {
  title: string
  body: string
}

/** Splits at `#` and `##` headings, ignoring any that sit inside a code fence. Text before the first heading is `intro`. */
export function splitSections(markdown: string): { intro: string; sections: SummarySection[] } {
  const intro: string[] = []
  const sections: Array<{ title: string; lines: string[] }> = []
  let fenced = false

  for (const line of markdown.replace(/\r\n?/g, '\n').split('\n')) {
    if (/^\s*(```|~~~)/.test(line)) fenced = !fenced
    const heading = fenced ? null : /^#{1,2}\s+(.+?)\s*#*\s*$/.exec(line)
    if (heading) {
      sections.push({ title: heading[1]!, lines: [] })
    } else if (sections.length > 0) {
      sections[sections.length - 1]!.lines.push(line)
    } else {
      intro.push(line)
    }
  }

  return {
    intro: intro.join('\n').trim(),
    sections: sections.map(({ title, lines }) => ({ title, body: lines.join('\n').trim() })),
  }
}

/** Drops whitespace-only text between elements. */
export function meaningful(nodes: HNode[] = []): HNode[] {
  return nodes.filter((node) => !(node.type === 'text' && !(node.value ?? '').trim()))
}

export function textOf(node: HNode): string {
  if (node.type === 'text') return node.value ?? ''
  return (node.children ?? []).map(textOf).join('')
}

const wordCount = (text: string) => text.trim().split(/\s+/).filter(Boolean).length
const isEm = (node: HNode) => node.type === 'element' && node.tagName === 'em'
const isStrong = (node: HNode) => node.type === 'element' && node.tagName === 'strong'

export interface ListItem {
  /** The bold lead-in (`**Term**`), without its trailing colon. */
  lead: HNode[] | null
  /** Everything after the lead-in, without leading `:` or `=` and without the italic examples. */
  description: HNode[]
  /** Italic runs (`*"example"*`), as text. */
  examples: string[]
  /** The description as one string when it has no inline formatting. */
  plainDescription: string | null
  /** The whole item, for plain rendering. */
  content: HNode[]
}

function stripLeading(nodes: HNode[]): HNode[] {
  const [first, ...rest] = nodes
  if (!first || first.type !== 'text') return nodes
  const value = (first.value ?? '').replace(/^\s*[:：=–—-]+\s*/, '').replace(/^\s+/, '')
  return value ? [{ ...first, value }, ...rest] : rest
}

function stripTrailingColon(nodes: HNode[]): HNode[] {
  const last = nodes[nodes.length - 1]
  if (!last || last.type !== 'text') return nodes
  const value = (last.value ?? '').replace(/\s*[:：]\s*$/, '')
  return [...nodes.slice(0, -1), ...(value ? [{ ...last, value }] : [])]
}

export function parseItem(li: HNode): ListItem {
  let content = meaningful(li.children)
  // A "loose" list wraps each item's text in a paragraph.
  if (content.length === 1 && content[0]!.tagName === 'p') content = meaningful(content[0]!.children)

  let lead: HNode[] | null = null
  let rest = content
  if (content[0] && isStrong(content[0])) {
    lead = stripTrailingColon(content[0].children ?? [])
    rest = stripLeading(content.slice(1))
  }

  const examples = rest.filter(isEm).map((node) => textOf(node).trim()).filter(Boolean)
  const kept = rest.filter((node) => !isEm(node))
  const description = kept.map((node, index) =>
    index === kept.length - 1 && node.type === 'text' ? { ...node, value: (node.value ?? '').replace(/\s+$/, '') } : node,
  )
  const onlyText = description.every((node) => node.type === 'text')

  return {
    lead,
    description,
    examples,
    plainDescription: onlyText ? description.map(textOf).join('').trim() : null,
    content,
  }
}

const tokenize = (text: string) => text.split(/[,;、，]/).map((token) => token.trim()).filter(Boolean)
const looksLikeWords = (tokens: string[]) =>
  tokens.length >= 2 && tokens.every((token) => wordCount(token) <= 4 && !/[.!?]$/.test(token))

export type ListShape =
  | { kind: 'chips'; groups: Array<{ label: HNode[]; words: string[] }> }
  | { kind: 'cards'; items: ListItem[] }
  | { kind: 'checks'; items: ListItem[] }
  | { kind: 'bullets'; items: ListItem[] }

/** Decides how an unordered list is shown. `title` is the section heading, used only to break a tie for word lists. */
export function classifyList(items: ListItem[], title = ''): ListShape {
  if (items.length > 0 && items.every((item) => item.lead)) {
    const plain = items.every((item) => item.examples.length === 0 && item.plainDescription !== null)
    if (plain && items.every((item) => looksLikeWords(tokenize(item.plainDescription!)))) {
      return { kind: 'chips', groups: items.map((item) => ({ label: item.lead!, words: tokenize(item.plainDescription!) })) }
    }
    // A section called "Vocabulary" may end its word lines with a full stop; read them as words all the same.
    if (plain && /vocab|từ vựng|word/i.test(title)) {
      const groups = items.map((item) => ({ label: item.lead!, words: tokenize(item.plainDescription!.replace(/[.\s]+$/, '')) }))
      if (groups.every((group) => group.words.length >= 2)) return { kind: 'chips', groups }
    }
    return { kind: 'cards', items }
  }

  const plainLines = items.every(
    (item) =>
      !item.lead &&
      item.examples.length === 0 &&
      item.content.every((node) => node.type === 'text' || node.tagName === 'code') &&
      wordCount(item.content.map(textOf).join('')) <= 8,
  )
  if (plainLines && items.length >= 2) return { kind: 'checks', items }
  return { kind: 'bullets', items }
}

/** Items of a list node as parsed rows. */
export function listItems(list: HNode): ListItem[] {
  return meaningful(list.children)
    .filter((node) => node.type === 'element' && node.tagName === 'li')
    .map(parseItem)
}
