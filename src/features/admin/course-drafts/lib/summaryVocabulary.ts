export interface SummaryWord { lemma: string; meaning?: string | null }

const HAS_SECTION = /^##\s+Vocabulary Core\s*$/m
const cell = (text: string) => text.trim().replace(/\s+/g, ' ').replaceAll('|', '\\|')

/**
 * The summary as the learner will read it once the course is approved: the author's text followed by a "Vocabulary
 * Core" table of the lesson's words. It mirrors what approval adds on the server: nothing when the text already has the
 * section or the lesson has no words, one row per word whatever its case, and a dash for a missing meaning.
 */
export function withVocabularyCore(markdown: string | null | undefined, words: readonly SummaryWord[]): string {
  const text = markdown ?? ''
  if (HAS_SECTION.test(text)) return text
  const rows = new Map<string, SummaryWord>()
  for (const word of words) {
    const lemma = word.lemma.trim()
    if (!lemma) continue
    const kept = rows.get(lemma.toLowerCase())
    if (!kept) rows.set(lemma.toLowerCase(), { lemma, meaning: word.meaning })
    else if (!kept.meaning?.trim()) kept.meaning = word.meaning
  }
  if (rows.size === 0) return text
  const table = ['## Vocabulary Core', '', '| Từ | Nghĩa |', '| --- | --- |',
    ...[...rows.values()].map((word) => `| ${cell(word.lemma)} | ${word.meaning?.trim() ? cell(word.meaning) : '—'} |`)].join('\n')
  return text.trim() ? `${text.trim()}\n\n${table}` : table
}
