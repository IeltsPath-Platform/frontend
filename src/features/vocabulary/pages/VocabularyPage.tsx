import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { ArrowLeftRight, ArrowRight, BookMarked, BookOpen, History, Lock, RotateCcw, Search, Sparkles, X } from 'lucide-react'
import { OwlHero } from '@/components/OwlHero'
import { useAuthSession } from '@/features/auth/authSession'
import { useToast } from '@/components/toast/toastContext'
import { DictionaryImportDialog } from '@/features/flashcards/components/DictionaryImportDialog'
import type { PickedSense } from '@/features/flashcards/lib/dictionary-import'
import {
  notebookApi,
  type LearningReportResponse,
  type NotebookSummaryResponse,
  type TopicsProgressResponse,
  type VocabularyCatalogSense,
  type VocabularyMapResponse,
  type VocabularyTopic,
  type WeeklyGoalResponse,
} from '../api/notebookApi'
import { CurrentLevelCard } from '../components/CurrentLevelCard'
import { CurrentTopicCard } from '../components/CurrentTopicCard'
import { WeeklyGoalCard } from '../components/WeeklyGoalCard'
import { VocabularyMapCard } from '../components/VocabularyMapCard'
import { ExploreSetsTabs } from '../components/ExploreSetsTabs'
import { DictionaryWordCard } from '../components/DictionaryWordCard'
import { VocabularyShell } from '../components/VocabularyShell'
import { senseMeaning, useDictionarySearch, type DictionaryLang } from '../lib/dictionary-search'
import '../vocabulary-notebook.css'
import '../dictionary.css'

const SEARCH_HISTORY_KEY = 'ieltspath_vocab_search_history'
/** Starter searches shown before the learner has a history: two English words and two Vietnamese meanings. */
const EXAMPLES: { text: string; lang: DictionaryLang }[] = [
  { text: 'sustainable', lang: 'EN' },
  { text: 'environment', lang: 'EN' },
  { text: 'bền vững', lang: 'VI' },
  { text: 'giáo dục', lang: 'VI' },
]
/** Words floating around the hero owl. */
const FLOATING_WORDS = ['sustainable', 'bền vững', 'habitat', 'innovation', 'đa dạng', 'mitigate']

function getStoredHistory(): string[] {
  try {
    const raw = localStorage.getItem(SEARCH_HISTORY_KEY)
    const parsed: unknown = raw ? JSON.parse(raw) : []
    return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === 'string') : []
  } catch {
    return []
  }
}

/** Remembers a finished search (opened a word or pressed Enter), not every half-typed prefix. */
function rememberSearch(term: string): string[] {
  const trimmed = term.trim()
  const next = [trimmed, ...getStoredHistory().filter((item) => item.toLowerCase() !== trimmed.toLowerCase())].slice(0, 6)
  if (!trimmed) return getStoredHistory()
  try {
    localStorage.setItem(SEARCH_HISTORY_KEY, JSON.stringify(next))
  } catch {
    // Private mode or full storage: history is a convenience only.
  }
  return next
}

export function VocabularyPage() {
  const session = useAuthSession()
  const navigate = useNavigate()
  const { toast } = useToast()
  const [params, setParams] = useSearchParams()
  const topicId = params.get('topicId')
  const urlLang: DictionaryLang = params.get('lang') === 'VI' ? 'VI' : 'EN'

  // The input keeps its own state so typing (and Vietnamese IMEs that rewrite characters) is never slowed by the URL;
  // the URL follows after a pause so going back from a word page restores the same results.
  const [query, setQuery] = useState(() => params.get('q') ?? '')
  const [lang, setLang] = useState<DictionaryLang>(urlLang)
  const [history, setHistory] = useState<string[]>(getStoredHistory)
  const urlTimer = useRef<number | undefined>(undefined)
  const inputRef = useRef<HTMLInputElement>(null)
  const resultsRef = useRef<HTMLElement>(null)

  const search = useDictionarySearch(query, lang, { size: 12, topicId })
  const [topics, setTopics] = useState<VocabularyTopic[]>([])
  const activeTopic = topicId ? topics.find((topic) => topic.id === topicId) : undefined

  const [savedSenseIds, setSavedSenseIds] = useState<Set<string>>(() => new Set())
  const [savingSenseId, setSavingSenseId] = useState<string | null>(null)
  const [importSenses, setImportSenses] = useState<PickedSense[] | null>(null)

  const [summary, setSummary] = useState<NotebookSummaryResponse | null>(null)
  const [learningReport, setLearningReport] = useState<LearningReportResponse | null>(null)
  const [topicsProgress, setTopicsProgress] = useState<TopicsProgressResponse | null>(null)
  const [mapData, setMapData] = useState<VocabularyMapResponse | null>(null)
  const [weeklyGoal, setWeeklyGoal] = useState<WeeklyGoalResponse | null>(null)

  useEffect(() => {
    const controller = new AbortController()
    notebookApi.getTopics(controller.signal).then(setTopics, () => undefined)
    return () => controller.abort()
  }, [])

  // "/" jumps to the search box from anywhere on the page, like most dictionaries.
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null
      if (event.key !== '/' || target?.closest('input, textarea, select, [contenteditable="true"]')) return
      event.preventDefault()
      inputRef.current?.focus()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  useEffect(() => () => window.clearTimeout(urlTimer.current), [])

  // A word saved as a guest is stored once the learner comes back signed in.
  useEffect(() => {
    if (!session.isLoggedIn) return
    let pendingSenseId: string | null = null
    try {
      pendingSenseId = sessionStorage.getItem('pendingSaveSenseId')
      if (pendingSenseId) sessionStorage.removeItem('pendingSaveSenseId')
    } catch {
      return
    }
    if (!pendingSenseId) return
    const senseId = pendingSenseId
    notebookApi.saveNotebookEntry(senseId).then(() => {
      setSavedSenseIds((prev) => new Set(prev).add(senseId))
      toast({ title: 'Đã lưu từ vào Sổ tay!', description: 'Từ vựng đã được thêm vào sổ tay cá nhân của bạn.', tone: 'success' })
    }, () => undefined)
  }, [session.isLoggedIn, toast])

  useEffect(() => {
    if (!session.isLoggedIn) return
    const controller = new AbortController()
    const quiet = () => undefined
    notebookApi.getNotebookSummary('Asia/Ho_Chi_Minh', controller.signal).then(setSummary, quiet)
    notebookApi.getLearningReport(controller.signal).then(setLearningReport, quiet)
    notebookApi.getTopicsProgress(undefined, controller.signal).then(setTopicsProgress, quiet)
    notebookApi.getVocabularyMap(undefined, controller.signal).then(setMapData, quiet)
    notebookApi.getWeeklyGoal('Asia/Ho_Chi_Minh', controller.signal).then(setWeeklyGoal, quiet)
    return () => controller.abort()
  }, [session.isLoggedIn])

  // Which of the shown meanings are already in the notebook; one request per new result page.
  const senseKey = search.items.flatMap((item) => item.senses.map((sense) => sense.id)).join(',')
  useEffect(() => {
    if (!session.isLoggedIn || !senseKey) return
    const controller = new AbortController()
    notebookApi.getSavedNotebookSenses(senseKey.split(','), controller.signal).then(
      (saved) => setSavedSenseIds((prev) => new Set([...prev, ...saved])),
      () => undefined,
    )
    return () => controller.abort()
  }, [senseKey, session.isLoggedIn])

  function syncUrl(nextQuery: string, nextLang: DictionaryLang) {
    window.clearTimeout(urlTimer.current)
    urlTimer.current = window.setTimeout(() => {
      setParams((prev) => {
        const next = new URLSearchParams(prev)
        if (nextQuery.trim()) next.set('q', nextQuery.trim())
        else next.delete('q')
        if (nextLang === 'VI') next.set('lang', 'VI')
        else next.delete('lang')
        return next
      }, { replace: true })
    }, 400)
  }

  function changeQuery(value: string) {
    setQuery(value)
    syncUrl(value, lang)
  }

  function changeLang(next: DictionaryLang) {
    setLang(next)
    syncUrl(query, next)
    inputRef.current?.focus()
  }

  function runExample(text: string, exampleLang: DictionaryLang) {
    setLang(exampleLang)
    setQuery(text)
    syncUrl(text, exampleLang)
    setHistory(rememberSearch(text))
  }

  function clearTopic() {
    setParams((prev) => {
      const next = new URLSearchParams(prev)
      next.delete('topicId')
      return next
    }, { replace: true })
  }

  async function handleSaveSense(sense: VocabularyCatalogSense, lemma: string) {
    if (!session.isLoggedIn) {
      try {
        sessionStorage.setItem('pendingSaveSenseId', sense.id)
      } catch {
        // The learner can still save after signing in.
      }
      navigate(`/login?returnTo=${encodeURIComponent(window.location.pathname + window.location.search)}`)
      return
    }
    setSavingSenseId(sense.id)
    try {
      await notebookApi.saveNotebookEntry(sense.id)
      setSavedSenseIds((prev) => new Set(prev).add(sense.id))
      toast({ title: `Đã lưu “${lemma}” vào sổ tay`, description: senseMeaning(sense) || undefined, tone: 'success' })
    } catch {
      toast({ title: 'Không thể lưu từ', description: 'Vui lòng thử lại sau.', tone: 'error' })
    } finally {
      setSavingSenseId(null)
    }
  }

  const showingResults = search.active
  const autoSwitched = search.lang === 'VI' && lang === 'EN'

  return (
    <VocabularyShell skipLabel="Chuyển đến nội dung chính">
      <div className="dict">
        <section className="dict-hero" aria-labelledby="dict-title">
          <div className="dict-hero__copy">
            <p className="dict-eyebrow"><Sparkles size={14} aria-hidden="true" />IELTS SPACE DICTIONARY</p>
            <h1 id="dict-title">Từ điển học theo chủ đề</h1>
            <p className="dict-hero__lead">
              Tra từ Anh – Việt và Việt – Anh, nghe phát âm, lưu vào Sổ tay để ôn ngắt quãng hoặc đưa thẳng vào bộ Flashcard.
            </p>
            <div className="dict-hero__meta">
              <span><BookOpen size={16} aria-hidden="true" />{topics.length > 0 ? `${topics.length} chủ đề IELTS` : 'Kho từ vựng học thuật'}</span>
              {session.isLoggedIn ? (
                <Link to="/vocabulary/notebook" className="dict-hero__link"><BookMarked size={16} aria-hidden="true" />Sổ tay của tôi<ArrowRight size={15} aria-hidden="true" /></Link>
              ) : (
                <Link to="/login?returnTo=/vocabulary" className="dict-hero__link is-warm">Đăng nhập để lưu từ<ArrowRight size={15} aria-hidden="true" /></Link>
              )}
            </div>
          </div>
          <div className="dict-hero__art" aria-hidden="true">
            {FLOATING_WORDS.map((word, index) => (
              <span key={word} className={`dict-float dict-float--${index + 1}`}>{word}</span>
            ))}
            <OwlHero poses={['wave', 'idea', 'cheer']} size="md" />
          </div>
        </section>

        <div className="dict-search" role="search">
          <div className="dict-search__bar">
            <div className="dict-search__lang" role="group" aria-label="Chiều tra từ">
              <button type="button" aria-pressed={lang === 'EN'} onClick={() => changeLang('EN')}>Anh → Việt</button>
              <button type="button" className="dict-search__swap" onClick={() => changeLang(lang === 'EN' ? 'VI' : 'EN')} aria-label="Đổi chiều tra từ">
                <ArrowLeftRight size={15} aria-hidden="true" />
              </button>
              <button type="button" aria-pressed={lang === 'VI'} onClick={() => changeLang('VI')}>Việt → Anh</button>
            </div>
            <label className="dict-search__field">
              <Search size={20} aria-hidden="true" />
              <input
                ref={inputRef}
                type="search"
                value={query}
                onChange={(event) => changeQuery(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') {
                    setHistory(rememberSearch(query))
                    resultsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
                  }
                  if (event.key === 'Escape') changeQuery('')
                }}
                placeholder={lang === 'VI' ? 'Nhập nghĩa tiếng Việt, ví dụ “bền vững”…' : 'Nhập từ tiếng Anh, ví dụ “sustainable”…'}
                aria-label={lang === 'VI' ? 'Tìm từ theo nghĩa tiếng Việt' : 'Tìm từ tiếng Anh'}
                autoComplete="off"
                spellCheck={false}
              />
              {query ? (
                <button type="button" className="dict-search__clear" onClick={() => { changeQuery(''); inputRef.current?.focus() }} aria-label="Xóa từ khóa tìm kiếm">
                  <X size={16} aria-hidden="true" />
                </button>
              ) : (
                <kbd className="dict-search__kbd" aria-hidden="true">/</kbd>
              )}
            </label>
          </div>

          {!query && (
            <div className="dict-search__chips">
              {history.length > 0 ? (
                <>
                  <span><History size={14} aria-hidden="true" />Gần đây</span>
                  {history.map((term) => (
                    <button key={term} type="button" onClick={() => runExample(term, lang)}>{term}</button>
                  ))}
                </>
              ) : (
                <>
                  <span><Sparkles size={14} aria-hidden="true" />Thử tra</span>
                  {EXAMPLES.map((example) => (
                    <button key={example.text} type="button" onClick={() => runExample(example.text, example.lang)}>
                      {example.text}<small>{example.lang === 'VI' ? 'VI' : 'EN'}</small>
                    </button>
                  ))}
                </>
              )}
            </div>
          )}
        </div>

        {showingResults && (
          <section className="dict-results" ref={resultsRef} aria-live="polite" aria-busy={search.loading}>
            <div className="dict-results__head">
              <h2>
                {search.loading && search.items.length === 0
                  ? 'Đang tìm…'
                  : search.query
                    ? <>{search.total} kết quả cho <q>{search.query}</q></>
                    : <>{search.total} từ trong chủ đề</>}
              </h2>
              <div className="dict-results__chips">
                {activeTopic && (
                  <button type="button" className="dict-pill is-topic" onClick={clearTopic} aria-label="Bỏ lọc chủ đề">
                    Chủ đề: {activeTopic.nameVi || activeTopic.name}<X size={13} aria-hidden="true" />
                  </button>
                )}
                {search.query && <span className="dict-pill">{search.lang === 'VI' ? 'Việt → Anh' : 'Anh → Việt'}</span>}
                {search.loading && <span className="dict-spinner" role="status" aria-label="Đang tải kết quả" />}
              </div>
            </div>
            {autoSwitched && <p className="dict-note">Bạn gõ có dấu nên mình tìm theo nghĩa tiếng Việt nhé.</p>}

            {search.error ? (
              <div className="dict-empty is-error" role="alert">
                <p>Không tải được kết quả. Vui lòng thử lại.</p>
                <button type="button" className="dict-btn" onClick={search.retry}><RotateCcw size={15} aria-hidden="true" />Thử lại</button>
              </div>
            ) : !search.loading && search.items.length === 0 ? (
              <div className="dict-empty">
                <OwlHero pose="confused" size="xs" decor={false} />
                <h3>Chưa tìm thấy “{search.query}”</h3>
                <p>
                  {search.lang === 'EN'
                    ? 'Nếu bạn đang gõ nghĩa tiếng Việt, hãy chuyển sang Việt → Anh.'
                    : 'Hãy gõ tiếng Việt có dấu, ví dụ “môi trường”, hoặc thử Anh → Việt.'}
                </p>
                <button type="button" className="dict-btn" onClick={() => changeLang(search.lang === 'EN' ? 'VI' : 'EN')}>
                  <ArrowLeftRight size={15} aria-hidden="true" />Tra {search.lang === 'EN' ? 'Việt → Anh' : 'Anh → Việt'}
                </button>
              </div>
            ) : (
              <>
                <div className="dict-grid">
                  {search.items.map((item, index) => (
                    <DictionaryWordCard
                      key={item.id}
                      item={item}
                      index={index}
                      keyword={search.query}
                      lang={search.lang}
                      savedSenseIds={savedSenseIds}
                      savingSenseId={savingSenseId}
                      onSave={(sense, lemma) => void handleSaveSense(sense, lemma)}
                      onAddToDeck={session.isLoggedIn
                        ? (sense, lemma) => setImportSenses([{ senseId: sense.id, lemma, meaning: senseMeaning(sense) }])
                        : undefined}
                      onOpen={() => setHistory(rememberSearch(search.query))}
                    />
                  ))}
                </div>
                {search.items.length < search.total && (
                  <button type="button" className="dict-more" onClick={search.loadMore} disabled={search.loadingMore}>
                    {search.loadingMore ? 'Đang tải thêm…' : `Xem thêm (${search.items.length}/${search.total})`}
                  </button>
                )}
              </>
            )}
          </section>
        )}

        {session.isLoggedIn ? (
          <div className="dict-dashboard">
            <div className="dict-dashboard__row">
              <CurrentLevelCard summary={summary} report={learningReport} />
              <div className="dict-dashboard__side">
                <CurrentTopicCard currentTopic={topicsProgress?.current ?? null} />
                <WeeklyGoalCard initialGoal={weeklyGoal} onGoalUpdated={setWeeklyGoal} />
              </div>
            </div>
            <VocabularyMapCard mapData={mapData} />
          </div>
        ) : (
          <div className="dict-guest">
            <span className="dict-guest__icon"><Lock size={20} aria-hidden="true" /></span>
            <div>
              <h3>Đăng nhập để mở khóa tiến độ học cá nhân</h3>
              <p>Theo dõi trình độ CEFR, mục tiêu tuần và bản đồ từ vựng 6 cấp độ của bạn.</p>
            </div>
            <Link to="/login?returnTo=/vocabulary" className="dict-btn">Đăng nhập ngay</Link>
          </div>
        )}

        <ExploreSetsTabs />
      </div>

      {importSenses && (
        <DictionaryImportDialog
          initialSenses={importSenses}
          initialTab="words"
          onClose={() => setImportSenses(null)}
          onImported={(_deckId, added, failed) => {
            // The learner stays on the dictionary to keep looking up words; the deck is one click away in Flashcard.
            if (!failed) setSavedSenseIds((prev) => new Set([...prev, ...importSenses.map((sense) => sense.senseId)]))
            setImportSenses(null)
            toast({
              title: `Đã thêm ${added} thẻ vào Flashcard`,
              description: failed ? `${failed} từ chưa thêm được, hãy thử lại.` : 'Từ cũng đã có trong Sổ tay để ôn ngắt quãng.',
              tone: failed ? 'info' : 'success',
            })
          }}
        />
      )}
    </VocabularyShell>
  )
}
