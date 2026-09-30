import { useState } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { loadFlashcards } from '../lib/flashcardStorage'

export function FlashcardLibrary({ onClose }: { onClose: () => void }) {
  const [{ cards, error }] = useState(() => {
    try { return { cards: loadFlashcards(), error: '' } }
    catch { return { cards: [], error: 'Không đọc được thẻ đã lưu. Bộ nhớ có thể bị chặn hoặc dữ liệu không hợp lệ; dữ liệu cũ không bị xóa.' } }
  })
  return <Dialog open onOpenChange={(open) => { if (!open) onClose() }}><DialogContent className="flashcard-library"><DialogHeader><DialogTitle>Flashcard đã lưu ({cards.length})</DialogTitle><DialogDescription>Thẻ từ các bài luyện, lưu trên trình duyệt này. Xóa dữ liệu trình duyệt sẽ xóa các thẻ.</DialogDescription></DialogHeader>
    {error ? <p role="alert" className="practice-form-error">{error}</p> : cards.length === 0 ? <p>Chưa có thẻ. Chọn từ trong bài đọc và nhấn “Tạo Flashcard”.</p> : cards.map((card) => <article key={card.id} className="saved-flashcard">{card.image && <img src={card.image} alt={`Minh họa cho ${card.word}`} />}<h3>{card.word}</h3><p>{card.meaning}</p>{card.example && <blockquote>{card.example}</blockquote>}</article>)}
  </DialogContent></Dialog>
}
