import { useEffect, useRef, useState } from 'react'
import { ImagePlus, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { readFlashcardImage, saveFlashcard } from '../lib/flashcardStorage'

interface FlashcardDialogProps {
  text: string
  testId: string
  onClose: () => void
  onSaved: () => void
}

export function FlashcardDialog({ text, testId, onClose, onSaved }: FlashcardDialogProps) {
  const [word, setWord] = useState(text.slice(0, 200))
  const [meaning, setMeaning] = useState('')
  const [example, setExample] = useState(text)
  const [image, setImage] = useState<string>()
  const [error, setError] = useState('')
  const [imageError, setImageError] = useState('')
  const [reading, setReading] = useState(false)
  const fileInput = useRef<HTMLInputElement>(null)
  const request = useRef(0)

  useEffect(() => () => { request.current += 1 }, [])

  async function upload(file: File | undefined) {
    if (!file) return
    const id = ++request.current
    setReading(true)
    setImageError('')
    try {
      const data = await readFlashcardImage(file)
      if (request.current === id) setImage(data)
    } catch (cause) {
      if (request.current === id) setImageError(cause instanceof Error ? cause.message : 'Không thể đọc ảnh.')
    } finally { if (request.current === id) setReading(false) }
  }

  return (
    <Dialog open onOpenChange={(open) => { if (!open) onClose() }}>
      <DialogContent className="flashcard-dialog">
        <DialogHeader><DialogTitle>Tạo Flashcard</DialogTitle><DialogDescription>Lưu từ vựng và ảnh minh họa trên trình duyệt này. Chưa đồng bộ tài khoản.</DialogDescription></DialogHeader>
        <form className="flashcard-form" onSubmit={(event) => {
          event.preventDefault()
          if (reading) return
          if (!word.trim() || !meaning.trim()) { setError('Nhập từ vựng và nghĩa trước khi lưu.'); return }
          try {
            saveFlashcard({ id: crypto.randomUUID(), testId, word: word.trim(), meaning: meaning.trim(), example: example.trim(), image, createdAt: new Date().toISOString() })
            onSaved()
            onClose()
          } catch { setError('Không lưu được: bộ nhớ đầy, bị chặn hoặc dữ liệu cũ không hợp lệ. Thử bỏ ảnh hoặc bật bộ nhớ trình duyệt; dữ liệu đã lưu không bị ghi đè.') }
        }}>
          <label htmlFor="flash-word">Từ / cụm từ *</label><Input id="flash-word" required maxLength={200} value={word} onChange={(event) => setWord(event.target.value)} />
          <label htmlFor="flash-meaning">Nghĩa / định nghĩa *</label><Textarea id="flash-meaning" required maxLength={2000} rows={2} value={meaning} onChange={(event) => setMeaning(event.target.value)} placeholder="Nhập nghĩa để ghi nhớ" />
          <label htmlFor="flash-example">Ví dụ / ngữ cảnh</label><Textarea id="flash-example" maxLength={5000} rows={2} value={example} onChange={(event) => setExample(event.target.value)} />
          <div className="flash-image-field"><span>Ảnh minh họa</span><input ref={fileInput} className="sr-only" tabIndex={-1} type="file" accept="image/png,image/jpeg,image/webp" aria-label="Chọn ảnh minh họa" onChange={(event) => { void upload(event.target.files?.[0]); event.target.value = '' }} />
            <Button type="button" variant="outline" disabled={reading} onClick={() => fileInput.current?.click()} aria-describedby="flash-image-help"><ImagePlus />{reading ? 'Đang đọc ảnh…' : image ? 'Đổi ảnh minh họa' : 'Thêm ảnh minh họa'}</Button>
            <small id="flash-image-help">PNG, JPG hoặc WebP · tối đa 1 MB</small>
            {image && <div className="flash-image-preview"><img src={image} alt={`Ảnh minh họa cho ${word || 'từ vựng'}`} /><Button type="button" variant="outline" onClick={() => { ++request.current; setReading(false); setImage(undefined); setImageError('') }}><Trash2 />Bỏ ảnh</Button></div>}
            {imageError && <p role="alert" className="practice-form-error">{imageError}</p>}
          </div>
          {error && <p role="alert" className="practice-form-error">{error}</p>}
          <Button type="submit" className="practice-primary-button" disabled={reading}>Lưu Flashcard</Button>
        </form>
      </DialogContent>
    </Dialog>
  )
}
