import type { AttemptStructure, Passage, Question, QuestionOption, SectionSnapshot } from '~types/learningPath'

export interface TestItem {
  id: string
  sortOrder: number
  /** `null` when the snapshot is a kind this client cannot render yet. */
  question: Question | null
}

export interface TestSection {
  id: string
  sortOrder: number
  snapshot: SectionSnapshot | null
  items: TestItem[]
}

function parseJson(raw: string | null): unknown {
  if (raw === null) return null
  try {
    return JSON.parse(raw)
  } catch {
    return null
  }
}

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null

function toPassage(value: unknown): Passage | null {
  if (!isRecord(value) || typeof value.title !== 'string' || !Array.isArray(value.paragraphs)) return null
  const paragraphs = value.paragraphs.filter((paragraph): paragraph is Passage['paragraphs'][number] =>
    isRecord(paragraph) && typeof paragraph.text === 'string' && (paragraph.label === null || typeof paragraph.label === 'string'))
  return { title: value.title, paragraphs }
}

function toSectionSnapshot(raw: string): SectionSnapshot | null {
  const value = parseJson(raw)
  if (!isRecord(value) || typeof value.title !== 'string') return null
  const passage = toPassage(value.passage)
  if (!passage) return null
  return { title: value.title, instructions: typeof value.instructions === 'string' ? value.instructions : '', passage }
}

function toOptions(value: unknown): QuestionOption[] | null | undefined {
  if (value === null) return null
  if (!Array.isArray(value)) return undefined
  const options = value.filter((option): option is QuestionOption =>
    isRecord(option) && typeof option.value === 'string' && typeof option.label === 'string')
  return options.length === value.length ? options : undefined
}

function toQuestion(itemId: string, raw: string): Question | null {
  const value = parseJson(raw)
  if (!isRecord(value) || typeof value.number !== 'number' || typeof value.prompt !== 'string') return null
  const options = toOptions(value.options)
  if (options === undefined) return null
  return { id: itemId, number: value.number, prompt: value.prompt, options }
}

export function parseAttemptStructure(structure: AttemptStructure): TestSection[] {
  return [...structure.sections]
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map((section) => ({
      id: section.id,
      sortOrder: section.sortOrder,
      snapshot: toSectionSnapshot(section.snapshot),
      items: [...section.items]
        .sort((a, b) => a.sortOrder - b.sortOrder)
        .map((item) => ({ id: item.id, sortOrder: item.sortOrder, question: toQuestion(item.id, item.questionSnapshot) })),
    }))
}
