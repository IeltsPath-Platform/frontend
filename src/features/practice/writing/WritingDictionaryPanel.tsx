import { VocabularyLookup } from './VocabularyLookup'

/** Area D of the Writing workspace: the vocabulary lookup in its own card beside the essay. */
export function WritingDictionaryPanel() {
  return (
    <aside className="ww-card ww-dictionary" aria-label="Tra từ vựng">
      <header className="ww-card-head"><strong>Tra từ vựng</strong></header>
      <VocabularyLookup />
    </aside>
  )
}
