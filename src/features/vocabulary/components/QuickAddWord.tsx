import { useState } from 'react'
import { Plus, Search, X } from 'lucide-react'
import { useDictionarySearch, type DictionaryLang } from '../lib/dictionary-search'
import { useNotebookSaver } from '../lib/use-notebook-saver'
import { DictionaryPickList } from './DictionaryPickList'

interface QuickAddWordProps {
  onWordAdded?: (senseId: string) => void
}

/**
 * Looks a word up in the dictionary (English word or Vietnamese meaning) and saves it straight into the notebook.
 * Results flow inside the card instead of a floating dropdown, so nothing is clipped or overflows the layout.
 */
export function QuickAddWord({ onWordAdded }: QuickAddWordProps) {
  const [query, setQuery] = useState('')
  const [lang, setLang] = useState<DictionaryLang>('EN')
  const search = useDictionarySearch(query, lang, { size: 6 })
  const saver = useNotebookSaver(search.items, onWordAdded)

  return (
    <section className="nb-quick" aria-labelledby="nb-quick-title">
      <div className="nb-quick__head">
        <span className="nb-quick__icon" aria-hidden="true"><Plus size={18} /></span>
        <div>
          <h2 id="nb-quick-title">Thêm từ nhanh</h2>
          <p>Tra trong từ điển rồi lưu ngay vào sổ tay.</p>
        </div>
        <div className="nb-lang" role="group" aria-label="Chiều tra từ">
          <button type="button" aria-pressed={lang === 'EN'} onClick={() => setLang('EN')}>EN</button>
          <button type="button" aria-pressed={lang === 'VI'} onClick={() => setLang('VI')}>VI</button>
        </div>
      </div>

      <label className="nb-input">
        <Search size={17} aria-hidden="true" />
        <input
          type="text"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          onKeyDown={(event) => { if (event.key === 'Escape') setQuery('') }}
          placeholder={lang === 'VI' ? 'Nhập nghĩa tiếng Việt, ví dụ “bền vững”' : 'Nhập từ tiếng Anh cần thêm…'}
          aria-label="Tìm từ để thêm vào sổ tay"
          autoComplete="off"
          spellCheck={false}
        />
        {query && <button type="button" onClick={() => setQuery('')} aria-label="Xóa từ khóa"><X size={15} /></button>}
      </label>

      {search.active && (
        <div className="nb-quick__results" aria-live="polite">
          {search.loading && search.items.length === 0 && <p className="nb-hint"><span className="nb-dot-loader" aria-hidden="true" />Đang tìm trong từ điển…</p>}
          {search.error && <p className="nb-hint is-error">Không tìm được, vui lòng thử lại.</p>}
          {!search.loading && !search.error && search.items.length === 0 && (
            <p className="nb-hint">Không có “{search.query}” trong từ điển{search.lang === 'EN' ? '. Gõ nghĩa tiếng Việt? Chọn VI.' : '. Hãy gõ có dấu.'}</p>
          )}
          {search.items.length > 0 && (
            <DictionaryPickList items={search.items} keyword={search.query} lang={search.lang} max={6}
              savedSenseIds={saver.savedSenseIds} savingSenseId={saver.savingSenseId} onSave={(sense, lemma) => void saver.save(sense, lemma)} />
          )}
        </div>
      )}
    </section>
  )
}
