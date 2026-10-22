import { useState, type FormEvent } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { flashcardApi, flashcardErrorMessage, type Flashcard, type FlashcardDeck } from '../api/flashcardApi'
import { ImagePicker, type PickedImage } from './ImagePicker'

interface CardFormDialogProps {
  card?: Flashcard
  decks: FlashcardDeck[]
  /** Deck preselected when the dialog is opened from a deck page. */
  deckId?: string
  onClose: () => void
  onSaved: (card: Flashcard) => void
}

export function CardFormDialog({ card, decks, deckId, onClose, onSaved }: CardFormDialogProps) {
  const [front, setFront] = useState(card?.front ?? '')
  const [back, setBack] = useState(card?.back ?? '')
  const [example, setExample] = useState(card?.exampleSentence ?? '')
  const [image, setImage] = useState<PickedImage>({ key: card?.imageKey ?? null, url: card?.imageUrl ?? null })
  const [targetDeck, setTargetDeck] = useState(deckId ?? '')
  const [uploading, setUploading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  async function submit(event: FormEvent) {
    event.preventDefault()
    if (saving || uploading) return
    if (!front.trim() || !back.trim()) { setError('Nhập mặt trước và mặt sau của thẻ.'); return }
    const draft = { front: front.trim(), back: back.trim(), exampleSentence: example.trim() || null, imageKey: image.key }
    setSaving(true); setError('')
    try {
      const saved = card ? await flashcardApi.updateCard(card, draft) : await flashcardApi.createCard(draft)
      if (!card && targetDeck) await flashcardApi.addToDeck(targetDeck, saved.id)
      onSaved(saved)
    } catch (reason) {
      setError(flashcardErrorMessage(reason))
      setSaving(false)
    }
  }

  return (
    <Dialog open onOpenChange={(open) => { if (!open && !saving) onClose() }}>
      <DialogContent className="flashcard-dialog">
        <DialogHeader>
          <DialogTitle>{card ? 'Sửa thẻ' : 'Tạo thẻ mới'}</DialogTitle>
          <DialogDescription>Mặt trước là từ hoặc câu hỏi, mặt sau là nghĩa hoặc đáp án.</DialogDescription>
        </DialogHeader>
        <form className="flashcard-form" onSubmit={(event) => void submit(event)}>
          <label className="flashcard-field"><span className="flashcard-field-label">Mặt trước *</span>
            <Input value={front} maxLength={4000} autoFocus placeholder="vd. sustainable" onChange={(event) => setFront(event.target.value)} />
          </label>
          <label className="flashcard-field"><span className="flashcard-field-label">Mặt sau *</span>
            <Textarea value={back} maxLength={4000} rows={3} placeholder="vd. (adj) bền vững" onChange={(event) => setBack(event.target.value)} />
          </label>
          <label className="flashcard-field"><span className="flashcard-field-label">Ví dụ</span>
            <Textarea value={example} maxLength={1000} rows={2} placeholder="vd. We need sustainable energy sources." onChange={(event) => setExample(event.target.value)} />
          </label>
          {!card && decks.length > 0 && (
            <label className="flashcard-field"><span className="flashcard-field-label">Thêm vào bộ thẻ</span>
              <select className="flashcard-select" value={targetDeck} onChange={(event) => setTargetDeck(event.target.value)}>
                <option value="">Không thêm vào bộ nào</option>
                {decks.map((deck) => <option key={deck.id} value={deck.id}>{deck.name}</option>)}
              </select>
            </label>
          )}
          <ImagePicker label="Ảnh minh họa" value={image} onChange={setImage} onBusyChange={setUploading} />
          {error && <p role="alert" className="flashcard-error">{error}</p>}
          <div className="flashcard-form-actions">
            <Button type="button" variant="outline" disabled={saving} onClick={onClose}>Hủy</Button>
            <Button type="submit" disabled={saving || uploading}>{saving ? 'Đang lưu…' : card ? 'Lưu thay đổi' : 'Tạo thẻ'}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
