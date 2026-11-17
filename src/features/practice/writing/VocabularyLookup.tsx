import { useEffect, useRef, type FormEvent } from 'react'
import { BookmarkCheck, BookmarkPlus, ExternalLink, Loader2, Search, Volume2 } from 'lucide-react'
import { Link } from 'react-router-dom'
import type { VocabularyCatalogItem, VocabularyCatalogSense } from '@/features/vocabulary/api/notebookApi'
import { LOOKUP_MAX_CHARS, LOOKUP_TABS, lookupUrl } from '@/features/learning-path/placement/dictionaryLookup'
import { LOOKUP_MIN_CHARS, useVocabularyLookup } from './useVocabularyLookup'
import './writing-workspace.css'

/** A word shows its first senses only; the learner can open the notebook for the rest. */
const SENSES_SHOWN = 2

const NOTEBOOK_PATH = '/vocabulary/notebook'

/** Plays one recording at a time; a recording that cannot be loaded or played is ignored. */
function usePlayer() {
  const playing = useRef<HTMLAudioElement | null>(null)
  useEffect(() => () => { playing.current?.pause() }, [])
  return (url: string) => {
    playing.current?.pause()
    const recording = new Audio(url)
    playing.current = recording
    void recording.play().catch(() => undefined)
  }
}

function Pronunciation({ item, play }: { item: VocabularyCatalogItem; play: (url: string) => void }) {
  const uk = item.audioUkReference ?? null
  const us = item.audioUsReference ?? null
  const any = item.pronunciationAudioReference ?? null
  if (!uk && !us && !any) return null
  return (
    <span className="ww-dict-audio">
      {uk ? <button aria-label={`Nghe giọng Anh của ${item.lemma}`} onClick={() => play(uk)} type="button"><Volume2 aria-hidden="true" size={12} />UK</button> : null}
      {us ? <button aria-label={`Nghe giọng Mỹ của ${item.lemma}`} onClick={() => play(us)} type="button"><Volume2 aria-hidden="true" size={12} />US</button> : null}
      {!uk && !us && any ? <button aria-label={`Nghe phát âm của ${item.lemma}`} onClick={() => play(any)} type="button"><Volume2 aria-hidden="true" size={12} />Nghe</button> : null}
    </span>
  )
}

function Sense({ item, sense, saved, saving, onSave }: {
  item: VocabularyCatalogItem
  sense: VocabularyCatalogSense
  saved: boolean
  saving: boolean
  onSave: (senseId: string) => void
}) {
  const meaning = sense.vietnameseMeaning || sense.englishDefinition
  return (
    <li className="ww-dict-sense">
      <div className="ww-dict-sense__text">
        {sense.partOfSpeech ? <em className="ww-dict-pos">{sense.partOfSpeech.toLowerCase()}</em> : null}
        <span>{meaning}</span>
        {sense.exampleSentence ? <q className="ww-dict-example">{sense.exampleSentence}</q> : null}
      </div>
      <button
        aria-label={saved ? `Đã lưu "${item.lemma}" vào sổ từ` : `Lưu "${item.lemma}" (${meaning ?? 'nghĩa này'}) vào sổ từ`}
        className={`ww-dict-save${saved ? ' is-saved' : ''}`} disabled={saved || saving} onClick={() => onSave(sense.id)} type="button"
      >
        {saving ? <Loader2 aria-hidden="true" className="ww-spin" size={12} /> : saved ? <BookmarkCheck aria-hidden="true" size={12} /> : <BookmarkPlus aria-hidden="true" size={12} />}
        {saved ? 'Đã lưu' : 'Lưu vào sổ'}
      </button>
    </li>
  )
}

/**
 * Looks a word up in the vocabulary library of the app, in both directions, while the learner writes. English looks the word
 * up by its spelling and Vietnamese by its meaning; each result shows how it sounds, what it means and an example, and a
 * sense can be saved into the learner's notebook with one tap. A word the library lacks points to Wiktionary instead.
 * It fills the height of whatever holds it: the results scroll and the search box stays at the bottom.
 */
export function VocabularyLookup() {
  const lookup = useVocabularyLookup()
  const play = usePlayer()
  const { direction } = lookup
  const tab = LOOKUP_TABS.find((candidate) => candidate.id === direction) ?? LOOKUP_TABS[0]
  const typed = lookup.query.trim()

  function submit(event: FormEvent) {
    event.preventDefault()
    if (typed.length >= LOOKUP_MIN_CHARS) lookup.search()
  }

  return (
    <div className="ww-vocab">
      <div className="ww-dict-tabs" role="tablist" aria-label="Chiều tra từ">
        {LOOKUP_TABS.map((candidate) => (
          <button aria-selected={candidate.id === direction} key={candidate.id} onClick={() => lookup.setDirection(candidate.id)} role="tab" type="button">
            {candidate.label}
          </button>
        ))}
      </div>

      <div className="ww-dictionary-body" aria-live="polite" aria-busy={lookup.status === 'loading'}>
        {lookup.status === 'idle' ? (
          <p className="ww-muted">{lookup.tooShort && typed.length > 0 ? `Nhập thêm ít nhất ${LOOKUP_MIN_CHARS} ký tự để tra.` : 'Nhập từ hoặc cụm từ cần tra ở ô bên dưới. Kết quả hiện ngay ở đây, bài viết của bạn không bị gián đoạn.'}</p>
        ) : null}
        {lookup.status === 'loading' ? <p className="ww-muted ww-dict-loading"><Loader2 aria-hidden="true" className="ww-spin" size={14} />Đang tra…</p> : null}
        {lookup.status === 'error' ? <p className="ww-error" role="alert">Chưa tra được lúc này. Kiểm tra kết nối rồi bấm “Tra từ vựng” để thử lại.</p> : null}
        {lookup.status === 'done' && lookup.items.length === 0 ? (
          <div className="ww-dict-empty">
            <p className="ww-muted">Chưa có “{lookup.searched}” trong từ điển của IELTS Path.</p>
            <a href={lookupUrl(direction, lookup.searched)} rel="noopener noreferrer" target="_blank">Tra trên Wiktionary <ExternalLink aria-hidden="true" size={12} /></a>
          </div>
        ) : null}
        {lookup.status === 'done' && lookup.items.length > 0 ? (
          <ul className="ww-dict-results">
            {lookup.items.map((item) => (
              <li className="ww-dict-word" key={item.id}>
                <header>
                  <strong>{item.lemma}</strong>
                  {item.ipaUs ?? item.ipaUk ?? item.ipa ? <span className="ww-dict-ipa">/{(item.ipaUs ?? item.ipaUk ?? item.ipa)?.replace(/^\/|\/$/g, '')}/</span> : null}
                  <Pronunciation item={item} play={play} />
                </header>
                <ul>
                  {item.senses.slice(0, SENSES_SHOWN).map((sense) => (
                    <Sense item={item} key={sense.id} onSave={(id) => void lookup.save(id)} saved={lookup.saved.has(sense.id)} saving={lookup.saving.has(sense.id)} sense={sense} />
                  ))}
                </ul>
              </li>
            ))}
          </ul>
        ) : null}
        {lookup.saveError ? <p className="ww-error" role="alert">{lookup.saveError}</p> : null}
        {lookup.saved.size > 0 ? <p className="ww-muted"><Link target="_blank" to={NOTEBOOK_PATH}>Mở sổ từ vựng</Link></p> : null}
        {lookup.history.length > 0 ? (
          <div className="ww-dict-history">
            <span className="ww-muted">Đã tra</span>
            <ul aria-label="Các từ đã tra">
              {lookup.history.map((entry) => (
                <li key={`${entry.direction}:${entry.term}`}><button onClick={() => lookup.choose(entry)} type="button">{entry.term}</button></li>
              ))}
            </ul>
          </div>
        ) : null}
      </div>

      <form className="ww-lookup" onSubmit={submit}>
        <input aria-label="Từ cần tra" maxLength={LOOKUP_MAX_CHARS} onChange={(event) => lookup.change(event.target.value)} placeholder={tab.placeholder} value={lookup.query} />
        <div className="ww-lookup-foot">
          <span>{lookup.query.length}/{LOOKUP_MAX_CHARS} ký tự</span>
          <button disabled={typed.length < LOOKUP_MIN_CHARS} type="submit"><Search aria-hidden="true" size={12} /> Tra từ vựng</button>
        </div>
      </form>
    </div>
  )
}
