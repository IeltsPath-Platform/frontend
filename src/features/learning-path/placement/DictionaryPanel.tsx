import { useState, type FormEvent } from 'react'
import { BookA, ExternalLink } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'

import { LOOKUP_MAX_CHARS, LOOKUP_TABS, lookupUrl, type LookupDirection } from './dictionaryLookup'

/** Side panel for looking words up while writing. Results open on Wiktionary; the searches made so far stay listed. */
export function DictionaryPanel() {
  const [direction, setDirection] = useState<LookupDirection>('vi-en')
  const [term, setTerm] = useState('')
  const [history, setHistory] = useState<Array<{ direction: LookupDirection; term: string }>>([])
  const tab = LOOKUP_TABS.find((candidate) => candidate.id === direction) ?? LOOKUP_TABS[0]

  function search(event: FormEvent) {
    event.preventDefault()
    const value = term.trim()
    if (!value) return
    window.open(lookupUrl(direction, value), '_blank', 'noopener,noreferrer')
    setHistory((previous) => [{ direction, term: value }, ...previous.filter((entry) => entry.term !== value || entry.direction !== direction)].slice(0, 12))
  }

  return (
    <aside className="pl-dict" aria-label="Tra từ vựng">
      <header className="pl-panel__head">
        <span className="pl-dict__title"><BookA aria-hidden="true" size={20} />Tra từ vựng</span>
      </header>
      <div className="pl-dict__results">
        {history.length === 0 ? (
          <p className="pl-dict__empty">Nhập từ cần tra bên dưới. Kết quả mở ở tab mới nên bài viết của bạn không bị gián đoạn.</p>
        ) : (
          <ul>
            {history.map((entry) => (
              <li key={`${entry.direction}-${entry.term}`}>
                <a href={lookupUrl(entry.direction, entry.term)} rel="noopener noreferrer" target="_blank">
                  <strong>{entry.term}</strong>
                  <small>{entry.direction === 'vi-en' ? 'Việt → Anh' : 'Anh → Việt'}</small>
                  <ExternalLink aria-hidden="true" size={14} />
                </a>
              </li>
            ))}
          </ul>
        )}
      </div>
      <form className="pl-dict__form" onSubmit={search}>
        <div className="pl-dict__tabs" role="tablist">
          {LOOKUP_TABS.map((candidate) => (
            <button aria-selected={candidate.id === direction} className="pl-dict__tab" key={candidate.id}
              onClick={() => setDirection(candidate.id)} role="tab" type="button">{candidate.label}</button>
          ))}
        </div>
        <Textarea aria-label={tab.label} className="pl-dict__input" maxLength={LOOKUP_MAX_CHARS} onChange={(event) => setTerm(event.target.value)}
          onKeyDown={(event) => { if (event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); event.currentTarget.form?.requestSubmit() } }}
          placeholder={tab.placeholder} rows={2} value={term} />
        <div className="pl-dict__foot">
          <span>{term.length}/{LOOKUP_MAX_CHARS} ký tự</span>
          <Button className="pl-btn pl-btn--accent pl-btn--sm" disabled={!term.trim()} type="submit">Tra từ vựng</Button>
        </div>
      </form>
    </aside>
  )
}
