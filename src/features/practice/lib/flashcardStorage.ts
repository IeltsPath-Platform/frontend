import { z } from 'zod'
import type { PracticeFlashcard } from '@/types/practice'

const STORAGE_KEY = 'ielts-space.flashcards.v1'
const flashcardSchema = z.object({
  id: z.string(), testId: z.string(), word: z.string(), meaning: z.string(),
  example: z.string(), image: z.string().regex(/^data:image\/(png|jpeg|webp);base64,/).optional(), createdAt: z.string(),
})

export function loadFlashcards(): PracticeFlashcard[] {
  const raw = localStorage.getItem(STORAGE_KEY)
  if (!raw) return []
  return z.array(flashcardSchema).parse(JSON.parse(raw))
}

export function saveFlashcard(card: PracticeFlashcard) {
  // Read-modify-write avoids overwriting cards created in another page/tab.
  const cards = loadFlashcards()
  localStorage.setItem(STORAGE_KEY, JSON.stringify([flashcardSchema.parse(card), ...cards]))
}

export async function readFlashcardImage(file: File): Promise<string> {
  if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type)) {
    throw new Error('Chọn ảnh PNG, JPG hoặc WebP.')
  }
  if (file.size > 1024 * 1024) throw new Error('Ảnh vượt quá 1 MB. Hãy chọn ảnh nhỏ hơn.')
  const data = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => typeof reader.result === 'string' ? resolve(reader.result) : reject(new Error('Không đọc được ảnh.'))
    reader.onerror = () => reject(new Error('Không đọc được ảnh. Hãy chọn lại.'))
    reader.readAsDataURL(file)
  })
  const image = new Image()
  image.src = data
  try { await image.decode() } catch { throw new Error('Tệp không phải ảnh hợp lệ hoặc đã hỏng.') }
  if (image.naturalWidth * image.naturalHeight > 16_000_000) throw new Error('Ảnh quá lớn. Chọn ảnh dưới 16 megapixel.')
  return data
}
