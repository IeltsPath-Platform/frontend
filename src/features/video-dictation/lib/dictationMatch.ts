/** Share of the sentence's words (0-100) a learner must type for the sentence to count as passed. */
export const PASS_THRESHOLD_PERCENT = 90
/** Attempts a learner gets on one sentence before the answer is shown. */
export const MAX_ATTEMPTS = 5

export interface TypedWord {
  /** The word as the learner typed it (punctuation kept), for display. */
  text: string
  /** Whether it matches a word of the sentence in order. */
  correct: boolean
}

export interface DictationMatch {
  /** 0-100, two decimals: correct words ÷ the longer of the sentence and the typed text. */
  accuracyPercent: number
  correct: boolean
  referenceWords: number
  matchedWords: number
  /** Words of the sentence the learner left out. */
  missingWords: number
  typed: TypedWord[]
}

interface Token {
  text: string
  norm: string
}

/** Case, punctuation and typographic apostrophes do not matter; hyphens split words. */
function normalizeWord(word: string) {
  return word.toLowerCase().replace(/[‘’`´]/g, "'").replace(/[^\p{L}\p{N}']/gu, '').replace(/^'+|'+$/g, '')
}

function tokenize(text: string): Token[] {
  return text
    .replace(/[-–—]/g, ' ')
    .split(/\s+/)
    .map((word) => ({ text: word, norm: normalizeWord(word) }))
    .filter((token) => token.norm.length > 0)
}

/** The words of the sentence as they are written (punctuation kept), split the way matching splits them. */
export function sentenceWords(sentence: string): string[] {
  return tokenize(sentence).map((token) => token.text)
}

/** Number of words in the sentence, as counted for matching. */
export function countWords(sentence: string) {
  return tokenize(sentence).length
}

/** Compares what the learner typed with the sentence, word by word, keeping the order (longest common subsequence). */
export function matchDictation(reference: string, typedText: string): DictationMatch {
  const ref = tokenize(reference)
  const typed = tokenize(typedText)
  const table: number[][] = Array.from({ length: ref.length + 1 }, () => new Array<number>(typed.length + 1).fill(0))
  for (let i = 1; i <= ref.length; i += 1) {
    for (let j = 1; j <= typed.length; j += 1) {
      table[i][j] = ref[i - 1].norm === typed[j - 1].norm ? table[i - 1][j - 1] + 1 : Math.max(table[i - 1][j], table[i][j - 1])
    }
  }

  const matchedTyped = new Set<number>()
  for (let i = ref.length, j = typed.length; i > 0 && j > 0;) {
    if (ref[i - 1].norm === typed[j - 1].norm) {
      matchedTyped.add(j - 1)
      i -= 1
      j -= 1
    } else if (table[i - 1][j] >= table[i][j - 1]) i -= 1
    else j -= 1
  }

  const matched = table[ref.length][typed.length]
  const longest = Math.max(ref.length, typed.length)
  const accuracyPercent = longest === 0 ? 0 : Math.round((matched / longest) * 10000) / 100
  return {
    accuracyPercent,
    correct: ref.length > 0 && accuracyPercent >= PASS_THRESHOLD_PERCENT,
    referenceWords: ref.length,
    matchedWords: matched,
    missingWords: ref.length - matched,
    typed: typed.map((token, index) => ({ text: token.text, correct: matchedTyped.has(index) })),
  }
}
