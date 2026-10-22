import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, ArrowLeftRight, FileUp, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { SiteNavbar } from '@/components/SiteNavbar'
import { useToast } from '@/components/toast/toastContext'
import {
  flashcardApi, flashcardErrorMessage, loadAllDeckItems, parseBulkCards, runLimited, type Flashcard, type FlashcardDeck,
} from '../api/flashcardApi'
import { CardRowEditor } from '../components/CardRowEditor'
import { ImagePicker } from '../components/ImagePicker'
import { emptyRow, planSave, rowFromCard, toDraft, validateRows, type EditorImage, type EditorRow } from '../lib/deckEditor'
import '../flashcards.css'

const TOPIC_SUGGESTIONS = ['Environment', 'Education', 'Technology', 'Health', 'Work & Career', 'Travel', 'Crime', 'Media']
const CONCURRENCY = 4

/** Full-page editor for a deck and all its cards, used for both "/flashcards/decks/new" and ".../:deckId/edit". */
export function DeckEditorPage() {
  const { deckId } = useParams()
  const editing = Boolean(deckId)
  const navigate = useNavigate()
  const { toast } = useToast()
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [cover, setCover] = useState<EditorImage>({ key: null, url: null })
  const [rows, setRows] = useState<EditorRow[]>(() => [emptyRow(), emptyRow(), emptyRow()])
  const [original, setOriginal] = useState<Flashcard[]>([])
  const [loading, setLoading] = useState(editing)
  const [reload, setReload] = useState(0)
  const [uploads, setUploads] = useState(0)
  const [saving, setSaving] = useState(false)
  const [progress, setProgress] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState('')
  const [importOpen, setImportOpen] = useState(false)
  const [importText, setImportText] = useState('')
  const dirty = useRef(false)

  useEffect(() => {
    if (!deckId) return
    let live = true
    Promise.all([flashcardApi.getDeck(deckId), loadAllDeckItems(deckId)])
      .then(async ([deck, items]) => {
        // Deck items are summaries; the editor needs full cards (image key, source fields) to update them.
        const cards = await runLimited(items, 6, (item) => flashcardApi.getCard(item.flashcardId))
        if (!live) return
        setTitle(deck.name); setDescription(deck.description ?? '')
        setCover({ key: deck.coverImageKey ?? null, url: deck.coverImageUrl ?? null })
        setOriginal(cards)
        setRows(cards.length ? cards.map((card, index) => rowFromCard(card, items[index].sortOrder)) : [emptyRow(), emptyRow()])
        setLoading(false); dirty.current = false
      })
      .catch((reason) => { if (live) { setError(flashcardErrorMessage(reason)); setLoading(false) } })
    return () => { live = false }
  }, [deckId, reload])

  useEffect(() => {
    const warn = (event: BeforeUnloadEvent) => { if (dirty.current) event.preventDefault() }
    window.addEventListener('beforeunload', warn)
    return () => window.removeEventListener('beforeunload', warn)
  }, [])

  const touch = () => { dirty.current = true }
  const updateRow = (rowId: string, patch: Partial<EditorRow>) => { touch(); setRows((list) => list.map((row) => row.rowId === rowId ? { ...row, ...patch } : row)) }
  const addRow = () => { touch(); setRows((list) => [...list, emptyRow()]) }
  const removeRow = (rowId: string) => { touch(); setRows((list) => list.length > 1 ? list.filter((row) => row.rowId !== rowId) : list) }
  const moveRow = (index: number, offset: -1 | 1) => {
    touch()
    setRows((list) => {
      const next = [...list]
      const target = index + offset
      if (target < 0 || target >= next.length) return list
      ;[next[index], next[target]] = [next[target], next[index]]
      return next
    })
  }
  const swapSides = () => { touch(); setRows((list) => list.map((row) => ({ ...row, front: row.back, back: row.front }))) }
  const onUploadBusy = (busy: boolean) => setUploads((count) => Math.max(0, count + (busy ? 1 : -1)))

  function importRows() {
    const parsed = parseBulkCards(importText)
    if (!parsed.length) return
    touch()
    setRows((list) => {
      const kept = list.filter((row) => row.card || row.front.trim() || row.back.trim() || row.example.trim() || row.image.key)
      return [...kept, ...parsed.map((card) => ({ ...emptyRow(), ...card }))]
    })
    setImportText(''); setImportOpen(false)
    toast({ title: `Đã thêm ${parsed.length} thẻ từ nội dung nhập.`, tone: 'success' })
  }

  const validation = validateRows(title, rows)

  async function save(studyAfter: boolean) {
    setSubmitted(true)
    if (saving || uploads > 0 || validation.formError) return
    const plan = planSave(validation.filled, original)
    const deckDraft = { name: title.trim(), description: description.trim() || null, coverImageKey: cover.key }
    setSaving(true); setError('')
    let deck: FlashcardDeck | null = null
    try {
      setProgress('Đang lưu học phần…')
      deck = deckId ? await flashcardApi.updateDeck(deckId, deckDraft) : await flashcardApi.createDeck(deckDraft)
      const id = deck.id
      const total = plan.remove.length + plan.update.length + plan.reorder.length + plan.create.length
      let done = 0
      const step = () => { done += 1; setProgress(`Đang lưu thẻ ${done}/${total}…`) }
      await runLimited(plan.remove, CONCURRENCY, async (card) => { await flashcardApi.removeFromDeck(id, card.id); step() })
      await runLimited(plan.update, CONCURRENCY, async ({ row, card }) => { await flashcardApi.updateCard(card, toDraft(row)); step() })
      await runLimited(plan.reorder, CONCURRENCY, async ({ card, index }) => {
        await flashcardApi.removeFromDeck(id, card.id)
        await flashcardApi.addToDeck(id, card.id, index)
        step()
      })
      await runLimited(plan.create, CONCURRENCY, async ({ row, index }) => {
        const card = await flashcardApi.createCard(toDraft(row))
        await flashcardApi.addToDeck(id, card.id, index)
        step()
      })
      dirty.current = false
      toast({ title: deckId ? 'Đã lưu học phần.' : 'Đã tạo học phần.', tone: 'success' })
      navigate(studyAfter ? `/flashcards/decks/${id}/learn` : `/flashcards/decks/${id}`)
    } catch (reason) {
      setSaving(false); setProgress('')
      const message = flashcardErrorMessage(reason)
      if (!deck) { setError(message); return }
      // Part of the deck was saved: reload the saved state so a retry only sends what is still missing.
      setError(`Đã lưu một phần học phần: ${message} Kiểm tra lại các thẻ rồi bấm lưu tiếp.`)
      dirty.current = false
      if (deckId) setReload((value) => value + 1)
      else navigate(`/flashcards/decks/${deck.id}/edit`, { replace: true })
    }
  }

  const showErrors = submitted && !saving
  const busy = saving || uploads > 0
  return (
    <div className="flashcards-page">
      <SiteNavbar />
      <main className="flashcards-shell deck-editor">
        <header className="deck-editor-header">
          <div>
            <Link to={deckId ? `/flashcards/decks/${deckId}` : '/flashcards'} className="flashcards-back"><ArrowLeft size={16} aria-hidden="true" />{deckId ? 'Về học phần' : 'Tất cả học phần'}</Link>
            <h1>{editing ? 'Chỉnh sửa học phần' : 'Tạo học phần mới'}</h1>
            {showErrors && validation.formError && <p role="alert" className="deck-editor-form-error">{validation.formError}</p>}
          </div>
          <div className="deck-editor-actions">
            {progress && <span aria-live="polite">{progress}</span>}
            <Button variant="outline" disabled={busy || loading} onClick={() => void save(false)}>{editing ? 'Lưu' : 'Tạo'}</Button>
            <Button disabled={busy || loading} onClick={() => void save(true)}>{editing ? 'Lưu và học' : 'Tạo và học'}</Button>
          </div>
        </header>
        {error && <p role="alert" className="flashcard-error">{error}</p>}

        {loading ? <p className="flashcards-empty">Đang tải học phần…</p> : <>
          <section className="deck-editor-meta">
            <div className="deck-editor-meta-fields">
              <label className={`deck-editor-title${showErrors && !title.trim() ? ' has-error' : ''}`}>
                <input value={title} maxLength={150} placeholder='Nhập tiêu đề, ví dụ "Environment – Writing Task 2"'
                  onChange={(event) => { touch(); setTitle(event.target.value) }} />
                <span>Tiêu đề</span>
              </label>
              {!editing && (
                <div className="flashcard-topic-chips" aria-label="Gợi ý chủ đề IELTS">
                  {TOPIC_SUGGESTIONS.map((topic) => (
                    <button key={topic} type="button" aria-pressed={title === topic} onClick={() => { touch(); setTitle(topic) }}>{topic}</button>
                  ))}
                </div>
              )}
              <textarea className="deck-editor-description" rows={2} value={description} maxLength={2000} placeholder="Thêm mô tả…"
                onChange={(event) => { touch(); setDescription(event.target.value) }} />
            </div>
            <ImagePicker compact label="Ảnh bìa" value={cover} onChange={(image) => { touch(); setCover(image) }} onBusyChange={onUploadBusy} />
          </section>

          <div className="deck-editor-toolbar">
            <Button variant="secondary" onClick={() => setImportOpen((open) => !open)} aria-expanded={importOpen}><FileUp />Nhập</Button>
            <span>{validation.filled.length} thẻ hợp lệ</span>
            <Button variant="ghost" size="icon" aria-label="Đảo thuật ngữ và định nghĩa" title="Đảo thuật ngữ và định nghĩa" onClick={swapSides}><ArrowLeftRight /></Button>
          </div>
          {importOpen && (
            <section className="deck-editor-import">
              <p>Dán danh sách từ Word, Excel hoặc Google Docs. Mỗi dòng một thẻ, ngăn cách thuật ngữ và định nghĩa bằng Tab, “ - ”, “:” hoặc “=”.</p>
              <Textarea rows={6} value={importText} onChange={(event) => setImportText(event.target.value)}
                placeholder={'pollution - ô nhiễm\ndeforestation\tnạn phá rừng\nrenewable: có thể tái tạo'} />
              <div><span>{parseBulkCards(importText).length} thẻ đọc được</span>
                <Button variant="outline" onClick={() => setImportOpen(false)}>Hủy</Button>
                <Button disabled={!parseBulkCards(importText).length} onClick={importRows}>Thêm vào danh sách</Button></div>
            </section>
          )}

          <ol className="deck-editor-rows">
            {rows.map((row, index) => (
              <CardRowEditor key={row.rowId} row={row} index={index} total={rows.length}
                error={showErrors ? validation.rowErrors[row.rowId] : undefined}
                onChange={(patch) => updateRow(row.rowId, patch)} onRemove={() => removeRow(row.rowId)}
                onMove={(offset) => moveRow(index, offset)} onBusyChange={onUploadBusy}
                onTabFromLast={index === rows.length - 1 ? addRow : undefined} />
            ))}
          </ol>
          <button type="button" className="deck-editor-add" onClick={addRow}><Plus aria-hidden="true" />Thêm thẻ</button>
          <div className="deck-editor-footer">
            <Button size="lg" disabled={busy} onClick={() => void save(true)}>{editing ? 'Lưu và học' : 'Tạo và học'}</Button>
          </div>
        </>}
      </main>
    </div>
  )
}
