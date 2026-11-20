import { useEffect, useRef, useState } from 'react'
import { z } from 'zod'
import { ImagePlus, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { requiredText } from '@/lib/validation/fields'
import { useFormErrors } from '@/lib/validation/useFormErrors'
import { legacyImageToFile, readFlashcardImage, saveFlashcard } from '../lib/flashcardStorage'
import { flashcardApi } from '@/features/flashcards/api/flashcardApi'
import type { PracticeFlashcard } from '@/types/practice'

interface FlashcardDialogProps {
  text: string
  testId: string
  card?: PracticeFlashcard
  onClose: () => void
  onSaved: () => void
}

const flashcardSchema = z.object({ word: requiredText('Từ / cụm từ', 200), meaning: requiredText('Nghĩa / định nghĩa', 2000) })

export function FlashcardDialog({ text, testId, card, onClose, onSaved }: FlashcardDialogProps) {
  const [word, setWord] = useState(card?.word ?? text.slice(0, 200))
  const [meaning, setMeaning] = useState(card?.meaning ?? '')
  const [example, setExample] = useState(card?.example ?? text)
  const [image, setImage] = useState<string | undefined>(card?.image)
  const [imageFile, setImageFile] = useState<File>()
  const [error, setError] = useState('')
  const [imageError, setImageError] = useState('')
  const [reading, setReading] = useState(false)
  const fileInput = useRef<HTMLInputElement>(null)
  const request = useRef(0)
  const form = useFormErrors(flashcardSchema, { word, meaning })
  const wordError = form.field('word').error
  const meaningError = form.field('meaning').error

  useEffect(() => () => { request.current += 1 }, [])

  async function upload(file: File | undefined) {
    if (!file) return
    const id = ++request.current
    setReading(true)
    setImageError('')
    try {
      const data = await readFlashcardImage(file)
      if (request.current === id) { setImage(data); setImageFile(file) }
    } catch (cause) {
      if (request.current === id) setImageError(cause instanceof Error ? cause.message : 'Không thể đọc ảnh.')
    } finally { if (request.current === id) setReading(false) }
  }

  return (
    <Dialog open onOpenChange={(open) => { if (!open) onClose() }}>
      <DialogContent className="flashcard-dialog">
        <DialogHeader><DialogTitle>{card ? 'Chỉnh sửa' : 'Tạo'} Flashcard</DialogTitle><DialogDescription>Lưu từ vựng và ảnh minh họa trên trình duyệt này. Chưa đồng bộ tài khoản.</DialogDescription></DialogHeader>
        <form className="flashcard-form" noValidate onSubmit={(event) => {
          event.preventDefault()
          if (reading) return
          if (!form.validate()) return
          if (imageError) return
          void (async () => {
            setReading(true)
            try {
              const uploadFile = imageFile ?? (card?.image?.startsWith('data:') ? legacyImageToFile(card.image) : undefined)
              const imageKey = uploadFile ? (await flashcardApi.uploadImage(uploadFile)).key : image
              saveFlashcard({ id: card?.id ?? crypto.randomUUID(), testId: card?.testId ?? testId, word: word.trim(), meaning: meaning.trim(), example: example.trim(), image: imageKey, createdAt: card?.createdAt ?? new Date().toISOString() })
              onSaved()
              onClose()
            } catch (cause) {
              if (imageFile || card?.image?.startsWith('data:')) setImageError(cause instanceof Error ? cause.message : 'Image upload failed. The card was not saved.')
              else setError('Không lưu được thẻ. Những thẻ đã lưu vẫn được giữ nguyên.')
            } finally { setReading(false) }
          })()
        }}>
          <label htmlFor="flash-word">Từ / cụm từ *</label><Input id="flash-word" aria-required aria-invalid={wordError ? true : undefined} aria-describedby={wordError ? 'flash-word-error' : undefined} onBlur={form.field('word').onTouch} maxLength={200} value={word} onChange={(event) => setWord(event.target.value)} />
          {wordError ? <p id="flash-word-error" role="alert" className="practice-form-error">{wordError}</p> : null}
          <label htmlFor="flash-meaning">Nghĩa / định nghĩa *</label><Textarea id="flash-meaning" aria-required aria-invalid={meaningError ? true : undefined} aria-describedby={meaningError ? 'flash-meaning-error' : undefined} onBlur={form.field('meaning').onTouch} maxLength={2000} rows={2} value={meaning} onChange={(event) => setMeaning(event.target.value)} placeholder="Nhập nghĩa để ghi nhớ" />
          {meaningError ? <p id="flash-meaning-error" role="alert" className="practice-form-error">{meaningError}</p> : null}
          <label htmlFor="flash-example">Ví dụ / ngữ cảnh</label><Textarea id="flash-example" maxLength={5000} rows={2} value={example} onChange={(event) => setExample(event.target.value)} />
          <div className="flash-image-field"><span>Ảnh minh họa</span><input ref={fileInput} className="sr-only" tabIndex={-1} type="file" accept="image/png,image/jpeg,image/webp" aria-label="Chọn ảnh minh họa" onChange={(event) => { void upload(event.target.files?.[0]); event.target.value = '' }} />
            <Button type="button" variant="outline" disabled={reading} onClick={() => fileInput.current?.click()} aria-describedby="flash-image-help"><ImagePlus />{reading ? 'Đang đọc ảnh…' : image ? 'Đổi ảnh minh họa' : 'Thêm ảnh minh họa'}</Button>
            <small id="flash-image-help">PNG, JPG hoặc WebP · tối đa 2 MB</small>
            {image && <div className="flash-image-preview"><img src={image} alt={`Ảnh minh họa cho ${word || 'từ vựng'}`} /><Button type="button" variant="outline" onClick={() => { ++request.current; setReading(false); setImage(undefined); setImageFile(undefined); setImageError('') }}><Trash2 />Bỏ ảnh</Button></div>}
            {imageError && <p role="alert" className="practice-form-error">{imageError}</p>}
          </div>
          {error && <p role="alert" className="practice-form-error">{error}</p>}
          <Button type="submit" className="practice-primary-button" disabled={reading}>Lưu Flashcard</Button>
        </form>
      </DialogContent>
    </Dialog>
  )
}
