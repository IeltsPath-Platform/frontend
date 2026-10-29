import { useEffect, useState } from 'react'
import { notebookApi, type VocabularyCatalogItem } from '../api/notebookApi'

export type DictionaryLang = 'EN' | 'VI'

/** Letters that only exist in Vietnamese; English lemmas never contain them. */
const VIETNAMESE_LETTERS = /[àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ]/i

/**
 * The language a query is written in. The catalog searches lemmas for EN and Vietnamese meanings for VI, so a query
 * with Vietnamese letters is always searched as VI even when the learner left the toggle on English.
 */
export function resolveSearchLang(query: string, preferred: DictionaryLang): DictionaryLang {
  return VIETNAMESE_LETTERS.test(query) ? 'VI' : preferred
}

export interface DictionarySearchState {
  items: VocabularyCatalogItem[]
  total: number
  loading: boolean
  error: boolean
  /** The language the shown results were searched in. */
  lang: DictionaryLang
  /** The trimmed query the shown results belong to; empty while idle. */
  query: string
  /** Whether a search is active at all (a query or a topic filter). */
  active: boolean
  loadingMore: boolean
  loadMore: () => void
  retry: () => void
}

interface SearchOptions {
  size?: number
  /** Restricts results to one dictionary topic; a topic alone (no text) lists that topic's words. */
  topicId?: string | null
  delayMs?: number
}

interface SearchResult {
  key: string
  items: VocabularyCatalogItem[]
  total: number
  page: number
  error: boolean
}

/**
 * Debounced search of the public dictionary catalog. Typing keeps the raw text; only a pause sends a request, and a
 * newer query aborts the older one so results never arrive out of order. `loading` is derived: the stored result
 * belongs to an older search until the new one answers, so no state is set synchronously inside the effect.
 */
export function useDictionarySearch(query: string, preferred: DictionaryLang, options: SearchOptions = {}): DictionarySearchState {
  const { size = 12, topicId = null, delayMs = 300 } = options
  const trimmed = query.trim()
  const lang = resolveSearchLang(trimmed, preferred)
  const active = Boolean(trimmed || topicId)
  const [result, setResult] = useState<SearchResult | null>(null)
  const [loadingMore, setLoadingMore] = useState(false)
  const [attempt, setAttempt] = useState(0)
  const key = `${lang}|${topicId ?? ''}|${trimmed}|${attempt}`

  useEffect(() => {
    if (!active) return undefined
    const controller = new AbortController()
    const timer = window.setTimeout(() => {
      notebookApi
        .getCatalogVocabulary({ q: trimmed, lang, topicId: topicId ?? undefined, page: 0, size }, controller.signal)
        .then((page) => setResult({ key, items: page.items ?? [], total: page.total ?? 0, page: 0, error: false }))
        .catch((reason: unknown) => {
          if ((reason as { name?: string })?.name === 'AbortError') return
          setResult({ key, items: [], total: 0, page: 0, error: true })
        })
    }, trimmed ? delayMs : 0)
    return () => {
      window.clearTimeout(timer)
      controller.abort()
    }
  }, [active, key, trimmed, lang, topicId, size, delayMs])

  const loadMore = () => {
    if (!result || result.key !== key || loadingMore || result.items.length >= result.total) return
    const next = result.page + 1
    setLoadingMore(true)
    notebookApi
      .getCatalogVocabulary({ q: trimmed, lang, topicId: topicId ?? undefined, page: next, size })
      .then((page) => setResult((current) => (current && current.key === key
        ? { ...current, items: [...current.items, ...(page.items ?? [])], page: next }
        : current)))
      .catch(() => undefined)
      .finally(() => setLoadingMore(false))
  }
  const retry = () => setAttempt((value) => value + 1)

  const base = { lang, query: trimmed, active, loadingMore, loadMore, retry }
  if (!active) return { ...base, items: [], total: 0, loading: false, error: false }
  const current = result !== null && result.key === key
  // While a new search is pending the previous results stay visible, so the list does not flash empty on each key.
  return { ...base, items: result?.items ?? [], total: result?.total ?? 0, error: current && result.error, loading: !current }
}

/** The best meaning to show for a sense: Vietnamese first, then the English definition. */
export function senseMeaning(sense: { vietnameseMeaning: string | null; englishDefinition: string | null }) {
  return sense.vietnameseMeaning || sense.englishDefinition || ''
}

/** Plays the recorded pronunciation when it is a full URL, otherwise falls back to speech synthesis. */
export function playPronunciation(lemma: string, audioRef: string | null | undefined, speak: (text: string) => void) {
  if (audioRef && audioRef.startsWith('https://')) {
    new Audio(audioRef).play().catch(() => speak(lemma))
  } else {
    speak(lemma)
  }
}

/** Splits `text` around case-insensitive matches of `keyword` so the page can mark them; no match gives one part. */
export function splitHighlight(text: string, keyword: string): { text: string; match: boolean }[] {
  const needle = keyword.trim().toLowerCase()
  if (!needle) return [{ text, match: false }]
  const parts: { text: string; match: boolean }[] = []
  const haystack = text.toLowerCase()
  let from = 0
  for (let at = haystack.indexOf(needle); at !== -1; at = haystack.indexOf(needle, from)) {
    if (at > from) parts.push({ text: text.slice(from, at), match: false })
    parts.push({ text: text.slice(at, at + needle.length), match: true })
    from = at + needle.length
  }
  if (from < text.length) parts.push({ text: text.slice(from), match: false })
  return parts
}
