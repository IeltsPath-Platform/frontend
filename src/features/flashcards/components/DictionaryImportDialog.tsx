import { useEffect, useMemo, useState, type DragEvent } from 'react'
import { BookOpenText, Check, GripVertical, Layers, Plus, Search, Sparkles, Trash2, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { notebookApi, type VocabularyTopic } from '@/features/vocabulary/api/notebookApi'
import { senseMeaning, useDictionarySearch, type DictionaryLang } from '@/features/vocabulary/lib/dictionary-search'
import { flashcardApi, flashcardErrorMessage, type FlashcardDeck } from '../api/flashcardApi'
import { importSensesToDeck, loadTopicSenses, TOPIC_IMPORT_CAP, type PickedSense } from '../lib/dictionary-import'
import '../flashcards.css'
import '../dictionary-import.css'

type Tab = 'topic' | 'words'
const DRAG_TYPE = 'application/x-ieltspath-sense'

interface DictionaryImportDialogProps {
  /** Locks the target to this deck (adding from a deck page); otherwise the learner picks or creates one. */
  deckId?: string
  /** Meanings already picked, e.g. the word the learner was looking at in the dictionary. */
  initialSenses?: PickedSense[]
  initialTab?: Tab
  onClose: () => void
  /** `failed` counts words that could not be added (the rest were). */
  onImported: (deckId: string, added: number, failed: number) => void
}

/**
 * Pulls dictionary words into a flashcard deck, either a whole topic at once or word by word (click "+" or drag a
 * word into the tray). Cards are the learner's notebook cards for those meanings, so nothing is duplicated.
 */
export function DictionaryImportDialog({ deckId, initialSenses = [], initialTab, onClose, onImported }: DictionaryImportDialogProps) {
  const [tab, setTab] = useState<Tab>(initialTab ?? (initialSenses.length ? 'words' : 'topic'))
  const [picked, setPicked] = useState<Map<string, PickedSense>>(() => new Map(initialSenses.map((sense) => [sense.senseId, sense])))
  const [decks, setDecks] = useState<FlashcardDeck[] | null>(null)
  const [target, setTarget] = useState<string>(deckId ?? '')
  const [newDeckName, setNewDeckName] = useState('')
  const [busy, setBusy] = useState(false)
  const [progress, setProgress] = useState(0)
  const [error, setError] = useState('')
  const [dragOver, setDragOver] = useState(false)

  useEffect(() => {
    let live = true
    flashcardApi.listDecks(0, 100).then((page) => {
      if (!live) return
      setDecks(page.items)
      // Without a fixed deck the first existing one is suggested; with none the learner creates one.
      setTarget((current) => current || page.items[0]?.id || 'new')
    }, () => { if (live) { setDecks([]); setTarget((current) => current || 'new') } })
    return () => { live = false }
  }, [])

  const toggle = (sense: PickedSense) => setPicked((current) => {
    const next = new Map(current)
    if (next.has(sense.senseId)) next.delete(sense.senseId)
    else next.set(sense.senseId, sense)
    return next
  })
  const add = (senses: readonly PickedSense[]) => setPicked((current) => {
    const next = new Map(current)
    senses.forEach((sense) => next.set(sense.senseId, sense))
    return next
  })
  const remove = (senses: readonly PickedSense[]) => setPicked((current) => {
    const next = new Map(current)
    senses.forEach((sense) => next.delete(sense.senseId))
    return next
  })

  function onDrop(event: DragEvent) {
    event.preventDefault()
    setDragOver(false)
    try {
      const sense = JSON.parse(event.dataTransfer.getData(DRAG_TYPE)) as PickedSense
      if (sense?.senseId) add([sense])
    } catch {
      // Not one of our words; ignore the drop.
    }
  }

  const lockedDeck = deckId ? decks?.find((deck) => deck.id === deckId) : undefined
  const creating = !deckId && target === 'new'
  const selected = [...picked.values()]
  const canImport = selected.length > 0 && !busy && (creating ? newDeckName.trim().length > 0 : Boolean(target))

  async function submit() {
    if (!canImport) return
    setBusy(true); setError(''); setProgress(0)
    try {
      const destination = creating
        ? (await flashcardApi.createDeck({ name: newDeckName.trim(), description: 'Nhập từ Từ điển IELTSPath', coverImageKey: null })).id
        : target
      const outcome = await importSensesToDeck(destination, selected, setProgress)
      if (outcome.added === 0) {
        setError('Không thêm được từ nào. Vui lòng thử lại.')
        setBusy(false)
        return
      }
      onImported(destination, outcome.added, outcome.failed.length)
    } catch (reason) {
      setError(flashcardErrorMessage(reason))
      setBusy(false)
    }
  }

  return (
    <Dialog open onOpenChange={(open) => { if (!open && !busy) onClose() }}>
      <DialogContent className="flashcard-dialog dict-import">
        <DialogHeader className="dict-import__head">
          <DialogTitle>
            <Sparkles size={20} aria-hidden="true" />
            Thêm từ từ điển vào Flashcard
          </DialogTitle>
          <DialogDescription>
            Chọn cả chủ đề hoặc kéo từng từ vào khay. Từ cũng được lưu vào Sổ tay để ôn ngắt quãng chung một lịch.
          </DialogDescription>
        </DialogHeader>

        <div role="tablist" aria-label="Cách chọn từ" className="dict-import__tabs">
          <button type="button" role="tab" aria-selected={tab === 'topic'} onClick={() => setTab('topic')}>
            <Layers size={15} aria-hidden="true" />Theo chủ đề
          </button>
          <button type="button" role="tab" aria-selected={tab === 'words'} onClick={() => setTab('words')}>
            <BookOpenText size={15} aria-hidden="true" />Từng từ
          </button>
        </div>

        <div className="dict-import__body">
          <div className="dict-import__source">
            {tab === 'topic'
              ? <TopicPicker picked={picked} onToggle={toggle} onAdd={add} onRemove={remove} onTopicName={(name) => setNewDeckName((current) => current || name)} />
              : <WordPicker picked={picked} onToggle={toggle} />}
          </div>

          <div
            className={`dict-import__tray${dragOver ? ' is-over' : ''}`}
            onDragOver={(event) => { if (event.dataTransfer.types.includes(DRAG_TYPE)) { event.preventDefault(); setDragOver(true) } }}
            onDragLeave={() => setDragOver(false)}
            onDrop={onDrop}
            aria-label="Khay từ sẽ thêm"
          >
            <div className="dict-import__tray-head">
              <strong>Khay thẻ <span>{selected.length}</span></strong>
              {selected.length > 0 && <button type="button" onClick={() => setPicked(new Map())}><Trash2 size={13} aria-hidden="true" />Xóa hết</button>}
            </div>
            {selected.length === 0 ? (
              <p className="dict-import__tray-empty"><GripVertical size={18} aria-hidden="true" />Kéo thả từ vào đây hoặc nhấn “+”</p>
            ) : (
              <ul className="dict-import__tray-list">
                {selected.map((sense) => (
                  <li key={sense.senseId}>
                    <span><b lang="en">{sense.lemma}</b><small>{sense.meaning}</small></span>
                    <button type="button" aria-label={`Bỏ ${sense.lemma} khỏi khay`} onClick={() => toggle(sense)}><X size={14} /></button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        <div className="dict-import__target">
          {deckId ? (
            <p>Thêm vào học phần <b>{lockedDeck?.name ?? '…'}</b></p>
          ) : (
            <>
              <label className="flashcard-field">
                <span className="flashcard-field-label">Thêm vào</span>
                <select className="flashcard-select" value={target} onChange={(event) => setTarget(event.target.value)} disabled={decks === null}>
                  {decks?.map((deck) => <option key={deck.id} value={deck.id}>{deck.name}</option>)}
                  <option value="new">+ Tạo học phần mới</option>
                </select>
              </label>
              {creating && (
                <label className="flashcard-field">
                  <span className="flashcard-field-label">Tên học phần mới</span>
                  <input className="flashcard-select" value={newDeckName} maxLength={120} placeholder="Ví dụ: Environment – Band 6.5"
                    onChange={(event) => setNewDeckName(event.target.value)} />
                </label>
              )}
            </>
          )}
        </div>

        {busy && (
          <div className="dict-import__progress" role="status" aria-label={`Đã thêm ${progress}/${selected.length}`}>
            <i style={{ inlineSize: `${selected.length ? (progress / selected.length) * 100 : 0}%` }} />
          </div>
        )}
        {error && <p role="alert" className="flashcard-error">{error}</p>}

        <div className="flashcard-form-actions">
          <Button type="button" variant="outline" disabled={busy} onClick={onClose}>Hủy</Button>
          <Button type="button" disabled={!canImport} onClick={() => void submit()}>
            {busy ? `Đang thêm ${progress}/${selected.length}…` : <><Plus />Thêm {selected.length} thẻ</>}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

interface PickerProps {
  picked: Map<string, PickedSense>
  onToggle: (sense: PickedSense) => void
}

function TopicPicker({ picked, onToggle, onAdd, onRemove, onTopicName }: PickerProps & {
  onAdd: (senses: readonly PickedSense[]) => void
  onRemove: (senses: readonly PickedSense[]) => void
  onTopicName: (name: string) => void
}) {
  const [topics, setTopics] = useState<VocabularyTopic[] | null>(null)
  const [topic, setTopic] = useState<VocabularyTopic | null>(null)
  const [words, setWords] = useState<{ topicId: string; senses: PickedSense[] } | null>(null)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    const controller = new AbortController()
    notebookApi.getTopics(controller.signal).then(setTopics, () => setTopics([]))
    return () => controller.abort()
  }, [])

  useEffect(() => {
    if (!topic) return undefined
    const controller = new AbortController()
    loadTopicSenses(topic.id, controller.signal).then(
      (senses) => setWords({ topicId: topic.id, senses }),
      (reason: unknown) => { if ((reason as { name?: string })?.name !== 'AbortError') setFailed(true) },
    )
    return () => controller.abort()
  }, [topic])

  const list = words && topic && words.topicId === topic.id ? words.senses : null
  const allPicked = Boolean(list?.length) && list!.every((sense) => picked.has(sense.senseId))

  function choose(next: VocabularyTopic) {
    setFailed(false)
    setTopic(next)
    onTopicName(next.nameVi || next.name)
  }

  if (!topic) {
    return (
      <div className="dict-import__topics">
        {topics === null && <p className="flashcard-hint">Đang tải chủ đề…</p>}
        {topics?.length === 0 && <p className="flashcard-hint">Chưa có chủ đề trong từ điển.</p>}
        {topics?.map((item, index) => (
          <button key={item.id} type="button" className="dict-import__topic" style={{ animationDelay: `${index * 30}ms` }} onClick={() => choose(item)}>
            <strong>{item.nameVi || item.name}</strong>
            <small>{item.name} · {item.wordCount} từ</small>
          </button>
        ))}
      </div>
    )
  }

  return (
    <div className="dict-import__words">
      <div className="dict-import__words-head">
        <button type="button" className="dict-import__back" onClick={() => setTopic(null)}>← Chủ đề</button>
        <strong>{topic.nameVi || topic.name}</strong>
        {list && list.length > 0 && (
          <button type="button" className="dict-import__all" onClick={() => (allPicked ? onRemove(list) : onAdd(list))}>
            {allPicked ? 'Bỏ chọn tất cả' : `Chọn tất cả ${list.length}`}
          </button>
        )}
      </div>
      {failed && <p role="alert" className="flashcard-error">Không tải được từ của chủ đề này.</p>}
      {!list && !failed && <p className="flashcard-hint">Đang tải từ vựng…</p>}
      {list?.length === 0 && <p className="flashcard-hint">Chủ đề này chưa có từ.</p>}
      {list && topic.wordCount > TOPIC_IMPORT_CAP && <p className="flashcard-hint">Hiển thị {TOPIC_IMPORT_CAP} từ đầu của chủ đề.</p>}
      {list && <SenseList senses={list} picked={picked} onToggle={onToggle} />}
    </div>
  )
}

function WordPicker({ picked, onToggle }: PickerProps) {
  const [query, setQuery] = useState('')
  const [lang, setLang] = useState<DictionaryLang>('EN')
  const search = useDictionarySearch(query, lang, { size: 20 })
  const senses = useMemo(() => search.items.flatMap((item) => item.senses.map((sense) => ({
    senseId: sense.id, lemma: item.lemma, meaning: senseMeaning(sense),
  }))), [search.items])

  return (
    <div className="dict-import__words">
      <div className="dict-import__search">
        <div className="dict-lang" role="group" aria-label="Chiều tra từ">
          <button type="button" aria-pressed={lang === 'EN'} onClick={() => setLang('EN')}>Anh → Việt</button>
          <button type="button" aria-pressed={lang === 'VI'} onClick={() => setLang('VI')}>Việt → Anh</button>
        </div>
        <label className="flashcards-search">
          <Search size={16} aria-hidden="true" />
          <input autoFocus value={query} onChange={(event) => setQuery(event.target.value)}
            placeholder={lang === 'VI' ? 'Nhập nghĩa tiếng Việt, ví dụ “bền vững”' : 'Nhập từ tiếng Anh, ví dụ “sustainable”'}
            aria-label="Tìm từ trong từ điển" />
        </label>
      </div>
      {!search.active && <p className="flashcard-hint">Gõ để tìm, rồi nhấn “+” hoặc kéo từ sang khay bên cạnh.</p>}
      {search.active && search.loading && senses.length === 0 && <p className="flashcard-hint">Đang tìm…</p>}
      {search.error && <p role="alert" className="flashcard-error">Không tìm được từ. Vui lòng thử lại.</p>}
      {search.active && !search.loading && !search.error && senses.length === 0 && (
        <p className="flashcard-hint">Không có từ phù hợp{search.lang === 'EN' ? '. Thử “Việt → Anh” nếu bạn gõ nghĩa tiếng Việt.' : ' (nhập có dấu để tìm nghĩa tiếng Việt).'}</p>
      )}
      {senses.length > 0 && <SenseList senses={senses} picked={picked} onToggle={onToggle} draggable />}
    </div>
  )
}

function SenseList({ senses, picked, onToggle, draggable = false }: PickerProps & { senses: PickedSense[]; draggable?: boolean }) {
  return (
    <ul className="dict-import__list">
      {senses.map((sense, index) => {
        const isPicked = picked.has(sense.senseId)
        return (
          <li
            key={sense.senseId}
            className={isPicked ? 'is-picked' : undefined}
            style={{ animationDelay: `${Math.min(index, 12) * 25}ms` }}
            draggable={draggable}
            onDragStart={draggable ? (event) => {
              event.dataTransfer.setData(DRAG_TYPE, JSON.stringify(sense))
              event.dataTransfer.effectAllowed = 'copy'
            } : undefined}
          >
            {draggable && <GripVertical size={14} className="dict-import__grip" aria-hidden="true" />}
            <span><b lang="en">{sense.lemma}</b><small>{sense.meaning}</small></span>
            <button type="button" aria-pressed={isPicked} aria-label={isPicked ? `Bỏ chọn ${sense.lemma}` : `Chọn ${sense.lemma}`} onClick={() => onToggle(sense)}>
              {isPicked ? <Check size={15} /> : <Plus size={15} />}
            </button>
          </li>
        )
      })}
    </ul>
  )
}
