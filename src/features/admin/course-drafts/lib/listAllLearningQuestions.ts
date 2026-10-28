import { listQuestions } from '../../questions/api/questionApi'
import type { QuestionPage } from '../../questions/types'

const PAGE_SIZE = 100
/** A bank larger than this many pages is not read in full; the rows past it keep a short id. */
const MAX_PAGES = 30

/**
 * Every published learning question, not just the first page. The generator picks questions from the whole bank, so a
 * draft can name one that sits on a later page; reading all pages lets each row show its type and text.
 */
export async function listAllLearningQuestions(signal?: AbortSignal): Promise<QuestionPage> {
  const filters = { status: 'PUBLISHED', purpose: 'LEARNING', size: PAGE_SIZE } as const
  const first = await listQuestions({ ...filters, page: 0 }, signal)
  const pages = Math.max(1, Math.min(first.totalPages ?? 1, MAX_PAGES))
  const rest = await Promise.all(Array.from({ length: pages - 1 }, (_, index) => listQuestions({ ...filters, page: index + 1 }, signal)))
  return { ...first, content: [first, ...rest].flatMap((page) => page.content) }
}
