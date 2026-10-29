import { Link } from 'react-router-dom'
import { Bookmark, BookmarkCheck, ChevronRight, Layers, Volume2 } from 'lucide-react'
import { speak } from '@/features/flashcards/lib/speak'
import type { VocabularyCatalogItem, VocabularyCatalogSense } from '../api/notebookApi'
import { playPronunciation, senseMeaning, splitHighlight, type DictionaryLang } from '../lib/dictionary-search'

const MAX_SENSES = 2

interface DictionaryWordCardProps {
  item: VocabularyCatalogItem
  keyword: string
  lang: DictionaryLang
  savedSenseIds: ReadonlySet<string>
  savingSenseId: string | null
  index: number
  onSave: (sense: VocabularyCatalogSense, lemma: string) => void
  /** Shown for signed-in learners: puts this meaning into a flashcard deck. */
  onAddToDeck?: (sense: VocabularyCatalogSense, lemma: string) => void
  onOpen?: (item: VocabularyCatalogItem) => void
}

function Marked({ text, keyword }: { text: string; keyword: string }) {
  return <>{splitHighlight(text, keyword).map((part, i) => (part.match ? <mark key={i}>{part.text}</mark> : part.text))}</>
}

/**
 * A dictionary result. The whole card opens the word page through a stretched link; the audio, save and flashcard
 * buttons sit above that link so they keep their own action.
 */
export function DictionaryWordCard({ item, keyword, lang, savedSenseIds, savingSenseId, index, onSave, onAddToDeck, onOpen }: DictionaryWordCardProps) {
  const senses = item.senses.slice(0, MAX_SENSES)
  const more = item.senses.length - senses.length
  const firstSense = item.senses[0]
  const tags = [firstSense?.partOfSpeech, firstSense?.cefrLevel, item.academicWordList ? 'AWL' : null].filter(Boolean) as string[]

  return (
    <article className="dict-card" style={{ animationDelay: `${Math.min(index, 11) * 35}ms` }}>
      <Link to={`/vocabulary/${item.id}`} className="dict-card__link" onClick={() => onOpen?.(item)} aria-label={`Xem chi tiết từ ${item.lemma}`} />

      <header className="dict-card__top">
        <div className="dict-card__title">
          <h3 lang="en">{lang === 'EN' ? <Marked text={item.lemma} keyword={keyword} /> : item.lemma}</h3>
          {(item.ipa || item.ipaUk) && <p className="dict-card__ipa">{item.ipa || item.ipaUk}</p>}
        </div>
        <button type="button" className="dict-card__audio" onClick={() => playPronunciation(item.lemma, item.pronunciationAudioReference, speak)} aria-label={`Nghe phát âm từ ${item.lemma}`}>
          <Volume2 size={17} aria-hidden="true" />
        </button>
      </header>

      {tags.length > 0 && <div className="dict-card__tags">{tags.map((tag) => <span key={tag}>{tag}</span>)}</div>}

      <ul className="dict-card__senses">
        {senses.map((sense) => {
          const saved = savedSenseIds.has(sense.id)
          return (
            <li key={sense.id}>
              <p className="dict-card__meaning">
                {lang === 'VI' ? <Marked text={senseMeaning(sense) || 'Xem nghĩa trong chi tiết'} keyword={keyword} /> : senseMeaning(sense) || 'Xem nghĩa trong chi tiết'}
              </p>
              {sense.exampleSentence && <p className="dict-card__example" lang="en">“{sense.exampleSentence}”</p>}
              <div className="dict-card__actions">
                <button
                  type="button"
                  className={`dict-chip-btn${saved ? ' is-saved' : ''}`}
                  onClick={() => onSave(sense, item.lemma)}
                  disabled={savingSenseId === sense.id || saved}
                  aria-label={saved ? `Đã lưu từ ${item.lemma}` : `Lưu từ ${item.lemma} vào sổ tay`}
                >
                  {saved ? <BookmarkCheck size={14} aria-hidden="true" /> : <Bookmark size={14} aria-hidden="true" />}
                  {saved ? 'Đã lưu' : savingSenseId === sense.id ? 'Đang lưu…' : 'Lưu sổ tay'}
                </button>
                {onAddToDeck && (
                  <button type="button" className="dict-chip-btn is-deck" onClick={() => onAddToDeck(sense, item.lemma)} aria-label={`Thêm ${item.lemma} vào bộ flashcard`}>
                    <Layers size={14} aria-hidden="true" />Flashcard
                  </button>
                )}
              </div>
            </li>
          )
        })}
      </ul>

      <footer className="dict-card__foot">
        <span>{more > 0 ? `+${more} nghĩa khác` : 'Nhấn để xem chi tiết'}</span>
        <ChevronRight size={16} aria-hidden="true" />
      </footer>
    </article>
  )
}
