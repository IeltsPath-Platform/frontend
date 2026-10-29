import { BookmarkCheck, BookmarkPlus, Loader2, Volume2 } from 'lucide-react'
import { speak } from '@/features/flashcards/lib/speak'
import type { VocabularyCatalogItem, VocabularyCatalogSense } from '../api/notebookApi'
import { playPronunciation, senseMeaning, splitHighlight, type DictionaryLang } from '../lib/dictionary-search'

interface DictionaryPickListProps {
  items: readonly VocabularyCatalogItem[]
  keyword: string
  lang: DictionaryLang
  savedSenseIds: ReadonlySet<string>
  savingSenseId: string | null
  onSave: (sense: VocabularyCatalogSense, lemma: string) => void
  /** Caps the rows; the dictionary page holds the full result list. */
  max?: number
}

function Marked({ text, keyword }: { text: string; keyword: string }) {
  return <>{splitHighlight(text, keyword).map((part, i) => (part.match ? <mark key={i}>{part.text}</mark> : part.text))}</>
}

/** Compact dictionary rows, one per meaning, each with a save-to-notebook button. */
export function DictionaryPickList({ items, keyword, lang, savedSenseIds, savingSenseId, onSave, max = 8 }: DictionaryPickListProps) {
  const rows = items.flatMap((item) => item.senses.map((sense) => ({ item, sense }))).slice(0, max)
  return (
    <ul className="nb-pick">
      {rows.map(({ item, sense }, index) => {
        const saved = savedSenseIds.has(sense.id)
        const saving = savingSenseId === sense.id
        const meaning = senseMeaning(sense) || 'Chưa có nghĩa'
        return (
          <li key={sense.id} style={{ animationDelay: `${index * 30}ms` }} className={saved ? 'is-saved' : undefined}>
            <button type="button" className="nb-pick__audio" onClick={() => playPronunciation(item.lemma, item.pronunciationAudioReference, speak)} aria-label={`Nghe phát âm ${item.lemma}`}>
              <Volume2 size={15} aria-hidden="true" />
            </button>
            <span className="nb-pick__text">
              <b lang="en">{lang === 'EN' ? <Marked text={item.lemma} keyword={keyword} /> : item.lemma}</b>
              {sense.partOfSpeech && <i>{sense.partOfSpeech}</i>}
              <small>{lang === 'VI' ? <Marked text={meaning} keyword={keyword} /> : meaning}</small>
            </span>
            <button
              type="button"
              className="nb-pick__add"
              onClick={() => onSave(sense, item.lemma)}
              disabled={saved || saving}
              aria-label={saved ? `${item.lemma} đã có trong sổ tay` : `Thêm ${item.lemma} vào sổ tay`}
            >
              {saving ? <Loader2 size={15} className="vocab-spin" aria-hidden="true" /> : saved ? <BookmarkCheck size={15} aria-hidden="true" /> : <BookmarkPlus size={15} aria-hidden="true" />}
              <span>{saved ? 'Đã có' : 'Thêm'}</span>
            </button>
          </li>
        )
      })}
    </ul>
  )
}
