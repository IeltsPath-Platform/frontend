import { useCallback, useEffect, useRef, useState } from 'react'
import { notebookApi, type VocabularyCatalogItem } from '@/features/vocabulary/api/notebookApi'
import { LOOKUP_MAX_CHARS, type LookupDirection } from '@/features/learning-path/placement/dictionaryLookup'

/** How many words a lookup shows, and how long the learner may stop typing before the lookup runs. */
export const LOOKUP_RESULTS = 5
export const LOOKUP_DEBOUNCE_MS = 300
/** A shorter text finds too much to be useful, so nothing runs for it. */
export const LOOKUP_MIN_CHARS = 2
const HISTORY_SIZE = 6

export type LookupStatus = 'idle' | 'loading' | 'done' | 'error'

export interface LookupHistoryEntry {
  direction: LookupDirection
  term: string
}

/** The side of the library to search: English looks the word up by its spelling, Vietnamese by its meaning. */
const languageOf = (direction: LookupDirection) => (direction === 'vi-en' ? 'VI' : 'EN')

/**
 * Looks words up in the vocabulary library while the learner writes. The lookup waits for a pause in typing (or runs at
 * once when the learner asks), drops a lookup that a newer one has replaced, and lets the learner save a sense into the
 * notebook with one tap. Nothing the learner types is kept anywhere but in this hook.
 */
export function useVocabularyLookup() {
  const [direction, setDirection] = useState<LookupDirection>('en-vi')
  const [query, setQuery] = useState('')
  /** The last lookup that finished, with the text and direction it was for; a lookup still running has no result yet. */
  const [result, setResult] = useState<{ key: string; status: 'done' | 'error'; items: VocabularyCatalogItem[]; term: string } | null>(null)
  const [history, setHistory] = useState<LookupHistoryEntry[]>([])
  const [saved, setSaved] = useState<ReadonlySet<string>>(new Set())
  const [saving, setSaving] = useState<ReadonlySet<string>>(new Set())
  const [saveError, setSaveError] = useState<string | null>(null)
  /** Bumped by "search now" so the effect runs without waiting. */
  const [asked, setAsked] = useState(0)
  const immediate = useRef(false)

  const text = query.trim()
  const key = `${direction}:${text}`

  useEffect(() => {
    if (text.length < LOOKUP_MIN_CHARS) return
    const controller = new AbortController()
    const wait = immediate.current ? 0 : LOOKUP_DEBOUNCE_MS
    immediate.current = false
    const timer = window.setTimeout(() => void run(controller.signal), wait)

    async function run(signal: AbortSignal) {
      try {
        const page = await notebookApi.getCatalogVocabulary({ q: text, lang: languageOf(direction), size: LOOKUP_RESULTS }, signal)
        if (signal.aborted) return
        const found = page.items.slice(0, LOOKUP_RESULTS)
        setResult({ key, status: 'done', items: found, term: text })
        setHistory((current) => [{ direction, term: text }, ...current.filter((entry) => entry.term !== text || entry.direction !== direction)].slice(0, HISTORY_SIZE))
        await markSaved(found, signal)
      } catch {
        if (signal.aborted) return
        setResult({ key, status: 'error', items: [], term: text })
      }
    }

    /** Which of the shown senses are already in the notebook; a failure only leaves the buttons as "save". */
    async function markSaved(found: VocabularyCatalogItem[], signal: AbortSignal) {
      const ids = found.flatMap((item) => item.senses.map((sense) => sense.id))
      if (ids.length === 0) return
      try {
        const already = await notebookApi.getSavedNotebookSenses(ids, signal)
        if (!signal.aborted && already.length > 0) setSaved((current) => new Set([...current, ...already]))
      } catch {
        /* the buttons stay "save"; saving again tells the learner it is already there */
      }
    }

    return () => {
      controller.abort()
      window.clearTimeout(timer)
    }
  }, [text, direction, key, asked])

  const change = useCallback((value: string) => setQuery(value.slice(0, LOOKUP_MAX_CHARS)), [])
  const search = useCallback(() => {
    immediate.current = true
    setAsked((count) => count + 1)
  }, [])
  const choose = useCallback((entry: LookupHistoryEntry) => {
    immediate.current = true
    setDirection(entry.direction)
    setQuery(entry.term)
    setAsked((count) => count + 1)
  }, [])

  const save = useCallback(async (senseId: string) => {
    setSaveError(null)
    setSaving((current) => new Set(current).add(senseId))
    try {
      await notebookApi.saveNotebookEntry(senseId)
      setSaved((current) => new Set(current).add(senseId))
    } catch {
      setSaveError('Chưa lưu được từ này vào sổ. Bạn thử lại nhé.')
    } finally {
      setSaving((current) => {
        const next = new Set(current)
        next.delete(senseId)
        return next
      })
    }
  }, [])

  const tooShort = text.length < LOOKUP_MIN_CHARS
  const settled = result && result.key === key ? result : null
  // Too short to search: the prompt. Otherwise the result for exactly this text and direction, or "loading" until it arrives.
  const status: LookupStatus = tooShort ? 'idle' : settled ? settled.status : 'loading'
  return {
    direction, setDirection, query, change, search, history, choose, saved, saving, save, saveError, tooShort, status,
    items: settled?.items ?? [],
    searched: settled?.term ?? '',
  }
}
