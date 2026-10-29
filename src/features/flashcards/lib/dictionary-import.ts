import { HttpError } from '@/lib/httpClient'
import { notebookApi, type VocabularyCatalogItem } from '@/features/vocabulary/api/notebookApi'
import { flashcardApi, runLimited } from '../api/flashcardApi'

/** One dictionary meaning picked to become a flashcard. */
export interface PickedSense {
  senseId: string
  lemma: string
  meaning: string
}

/** The catalog caps a page at 50 words; a topic import reads at most this many words. */
export const TOPIC_IMPORT_CAP = 200

/** The meaning of `item` that belongs to `topicId`, else its first meaning; null when the word has none. */
export function pickTopicSense(item: VocabularyCatalogItem, topicId: string | null): PickedSense | null {
  const sense = item.senses.find((candidate) => topicId && candidate.topicId === topicId) ?? item.senses[0]
  if (!sense) return null
  return { senseId: sense.id, lemma: item.lemma, meaning: sense.vietnameseMeaning || sense.englishDefinition || '' }
}

/** Every word of a dictionary topic (up to {@link TOPIC_IMPORT_CAP}), one meaning each. */
export async function loadTopicSenses(topicId: string, signal?: AbortSignal): Promise<PickedSense[]> {
  const picked: PickedSense[] = []
  for (let page = 0; picked.length < TOPIC_IMPORT_CAP; page++) {
    const result = await notebookApi.getCatalogVocabulary({ topicId, page, size: 50 }, signal)
    for (const item of result.items ?? []) {
      const sense = pickTopicSense(item, topicId)
      if (sense) picked.push(sense)
    }
    if ((result.items ?? []).length === 0 || (page + 1) * 50 >= result.total) break
  }
  return picked.slice(0, TOPIC_IMPORT_CAP)
}

export interface ImportOutcome {
  added: number
  failed: PickedSense[]
}

/**
 * Adds dictionary meanings to a deck. Each meaning goes through the notebook endpoint, which returns the learner's
 * one card for that meaning (creating it the first time), so a word already saved is reused instead of duplicated and
 * keeps its review history; that card is then linked to the deck. A word already in the deck counts as added.
 */
export async function importSensesToDeck(
  deckId: string,
  senses: readonly PickedSense[],
  onProgress?: (done: number) => void,
): Promise<ImportOutcome> {
  let done = 0
  const failed: PickedSense[] = []
  await runLimited(senses, 4, async (sense) => {
    try {
      const entry = await notebookApi.saveNotebookEntry(sense.senseId)
      try {
        await flashcardApi.addToDeck(deckId, entry.flashcardId)
      } catch (reason) {
        if (!(reason instanceof HttpError && reason.status === 409)) throw reason
      }
    } catch {
      failed.push(sense)
    } finally {
      done += 1
      onProgress?.(done)
    }
  })
  return { added: senses.length - failed.length, failed }
}
