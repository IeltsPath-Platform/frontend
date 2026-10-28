import type { NotebookEntryResponse } from '../api/notebookApi'

export type ReviewMode =
  | 'FLASHCARD'
  | 'MEANING_GUESS'
  | 'TYPING'
  | 'DICTATION'
  | 'FILL_IN_BLANK'
  | 'SENTENCE_WRITING'
  | 'MIXED'
  | 'flashcard'
  | 'meaning'
  | 'typing'
  | 'dictation'
  | 'fill-in-blank'
  | 'sentence'
  | 'mixed'

export type QuizMode = ReviewMode

export interface QuizQuestion {
  id: string
  flashcardId: string
  entry: NotebookEntryResponse
  mode: ReviewMode
  /** Options for multiple choice (MEANING_GUESS) */
  choices?: string[]
  correctChoiceIndex?: number
  /** Masked sentence for FILL_IN_BLANK */
  maskedSentence?: string
}

export function normalizeMode(mode: ReviewMode | QuizMode): ReviewMode {
  const upper = String(mode).toUpperCase()
  if (upper === 'MEANING' || upper === 'MEANING_GUESS') return 'MEANING_GUESS'
  if (upper === 'FLASHCARD') return 'FLASHCARD'
  if (upper === 'TYPING') return 'TYPING'
  if (upper === 'DICTATION') return 'DICTATION'
  if (upper === 'FILL-IN-BLANK' || upper === 'FILL_IN_BLANK') return 'FILL_IN_BLANK'
  if (upper === 'SENTENCE' || upper === 'SENTENCE_WRITING') return 'SENTENCE_WRITING'
  return 'MIXED'
}

/** Normalizes text for lenient checking (trim, lowercase, removes punctuation) */
export function normalizeAnswer(input: string): string {
  return input
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // remove diacritics if any
    .replace(/[.,/#!$%^&*;:{}=\-_`~()?'"“”]/g, '')
    .replace(/\s+/g, ' ')
}

/** Checks whether user typed lemma matches target lemma */
export function isLemmaCorrect(typed: string, targetLemma: string): boolean {
  const normTyped = normalizeAnswer(typed)
  const normTarget = normalizeAnswer(targetLemma)
  return normTyped.length > 0 && normTyped === normTarget
}

/** Replaces the lemma in an example sentence with a blank */
export function maskLemmaInSentence(sentence: string | null | undefined, lemma: string): string {
  if (!sentence || !lemma) return '______'
  const escaped = lemma.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&')
  const regex = new RegExp(`\\b${escaped}\\b`, 'gi')
  const masked = sentence.replace(regex, '______')
  // Fallback if not matched by word boundary (e.g. inflections)
  if (masked === sentence) {
    const rawRegex = new RegExp(escaped, 'gi')
    return sentence.replace(rawRegex, '______')
  }
  return masked
}

/** Selects 3 random distractors from other entries for multiple-choice */
export function generateDistractors(
  correctMeaning: string,
  allEntries: readonly NotebookEntryResponse[],
  targetCount = 3
): string[] {
  const otherMeanings = allEntries
    .map((e) => e.vietnameseMeaning || e.englishDefinition || '')
    .filter((m) => m && m !== correctMeaning)

  // Shuffle and deduplicate
  const unique = Array.from(new Set(otherMeanings))
  for (let i = unique.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    const temp = unique[i]!
    unique[i] = unique[j]!
    unique[j] = temp
  }

  const selected = unique.slice(0, targetCount)
  // Fillers if not enough unique entries
  const fallbackFillers = ['bền vững, duy trì lâu dài', 'hệ sinh thái tự nhiên', 'đa dạng sinh học', 'có thể tái tạo']
  let fillerIdx = 0
  while (selected.length < targetCount && fillerIdx < fallbackFillers.length) {
    const f = fallbackFillers[fillerIdx++]!
    if (f !== correctMeaning && !selected.includes(f)) {
      selected.push(f)
    }
  }

  return selected
}

/** Builds choices array (with correct answer randomly placed) */
export function buildMultipleChoices(
  correctMeaning: string,
  distractors: string[]
): { choices: string[]; correctIndex: number } {
  const choices = [correctMeaning, ...distractors.slice(0, 3)]
  // Shuffle choices
  for (let i = choices.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    const temp = choices[i]!
    choices[i] = choices[j]!
    choices[j] = temp
  }
  return {
    choices,
    correctIndex: choices.indexOf(correctMeaning),
  }
}

/** Resolves the effective mode when in MIXED mode */
export function resolveMixedMode(entry: NotebookEntryResponse): ReviewMode {
  if (entry.level === 'UNKNOWN') {
    return Math.random() > 0.5 ? 'FLASHCARD' : 'MEANING_GUESS'
  }
  if (entry.level === 'FAMILIAR') {
    return Math.random() > 0.5 ? 'MEANING_GUESS' : 'FILL_IN_BLANK'
  }
  // LEARNING / MASTERED
  const advancedModes: ReviewMode[] = ['TYPING', 'FILL_IN_BLANK', 'DICTATION']
  return advancedModes[Math.floor(Math.random() * advancedModes.length)] ?? 'TYPING'
}

/** Generates QuizQuestion for a given entry and chosen mode */
export function createQuizQuestion(
  entry: NotebookEntryResponse,
  mode: ReviewMode | QuizMode,
  allEntries: readonly NotebookEntryResponse[]
): QuizQuestion {
  const normMode = normalizeMode(mode)
  const resolvedMode = normMode === 'MIXED' ? resolveMixedMode(entry) : normMode
  const meaning = entry.vietnameseMeaning || entry.englishDefinition || entry.lemma

  if (resolvedMode === 'MEANING_GUESS') {
    const distractors = generateDistractors(meaning, allEntries)
    const { choices, correctIndex } = buildMultipleChoices(meaning, distractors)
    return {
      id: entry.flashcardId,
      flashcardId: entry.flashcardId,
      entry,
      mode: resolvedMode,
      choices,
      correctChoiceIndex: correctIndex,
    }
  }

  if (resolvedMode === 'FILL_IN_BLANK') {
    const masked = maskLemmaInSentence(entry.exampleSentence, entry.lemma)
    return {
      id: entry.flashcardId,
      flashcardId: entry.flashcardId,
      entry,
      mode: resolvedMode,
      maskedSentence: masked,
    }
  }

  return {
    id: entry.flashcardId,
    flashcardId: entry.flashcardId,
    entry,
    mode: resolvedMode,
  }
}

/** Builds quiz questions for a collection of entries */
export function buildQuizQuestions(
  entries: readonly NotebookEntryResponse[],
  mode: ReviewMode | QuizMode = 'FLASHCARD'
): QuizQuestion[] {
  return entries.map((entry) => createQuizQuestion(entry, mode, entries))
}

/** Builds mixed mode quiz questions for a collection of entries */
export function buildMixedModeQuestions(
  entries: readonly NotebookEntryResponse[]
): QuizQuestion[] {
  return entries.map((entry) => createQuizQuestion(entry, 'MIXED', entries))
}

