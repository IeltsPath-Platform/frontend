import { apiRequest } from '@/lib/httpClient'

/** Library GET /api/content/vocabulary/senses response. */
export interface VocabularySenseCard {
  senseId: string
  vocabularyItemId: string
  lemma: string
  ipa: string | null
  pronunciationAudioReference: string | null
  partOfSpeech: string
  englishDefinition: string | null
  vietnameseMeaning: string | null
  exampleSentence: string | null
  imageUrl: string | null
}

const MAX_SENSE_IDS = 100

/** Reads each sense once, in lesson order; missing or inactive senses have no card. */
export async function getLessonVocabularySenses(
  senseIds: readonly string[],
  signal?: AbortSignal,
): Promise<VocabularySenseCard[]> {
  const ids = [...new Set(senseIds)]
  if (ids.length === 0) return []

  const batches: Array<Promise<VocabularySenseCard[]>> = []
  for (let start = 0; start < ids.length; start += MAX_SENSE_IDS) {
    const query = new URLSearchParams({ ids: ids.slice(start, start + MAX_SENSE_IDS).join(',') })
    batches.push(apiRequest<VocabularySenseCard[]>(`/api/content/vocabulary/senses?${query}`, { auth: true, signal }))
  }

  const cards = (await Promise.all(batches)).flat()
  const byId = new Map(cards.map((card) => [card.senseId, card]))
  return ids.flatMap((id) => {
    const card = byId.get(id)
    return card ? [card] : []
  })
}
