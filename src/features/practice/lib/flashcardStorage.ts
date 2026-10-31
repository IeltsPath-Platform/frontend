import { z } from 'zod'
import type { PracticeFlashcard } from '@/types/practice'
import { IMAGE_MAX_BYTES } from '@/features/flashcards/api/flashcardApi'

const STORAGE_KEY = 'ielts-space.flashcards.v1'
const legacyImagePattern = /^data:image\/(png|jpeg|webp);base64,/
const imageKeyPattern = /^images\/[A-Za-z0-9._/-]+$/
const isImageKey = (value: string) => imageKeyPattern.test(value) && !value.includes('..')
const flashcardSchema = z.object({
  id: z.string(), testId: z.string(), word: z.string(), meaning: z.string(),
  example: z.string(), image: z.string().refine((value) => legacyImagePattern.test(value) || isImageKey(value)).optional(), createdAt: z.string(),
})

export function loadFlashcards(): PracticeFlashcard[] {
  const raw = localStorage.getItem(STORAGE_KEY)
  if (!raw) return []
  return z.array(flashcardSchema).parse(JSON.parse(raw))
}

export function saveFlashcard(card: PracticeFlashcard) {
  // Read-modify-write avoids overwriting cards created in another page/tab.
  const cards = loadFlashcards()
  const saved = flashcardSchema.parse(card)
  localStorage.setItem(STORAGE_KEY, JSON.stringify([saved, ...cards.filter((current) => current.id !== saved.id)]))
}

export function legacyImageToFile(image: string): File {
  const match = /^data:(image\/(?:png|jpeg|webp));base64,(.+)$/.exec(image)
  if (!match) throw new Error('Ảnh cũ không hợp lệ.')
  const binary = atob(match[2])
  const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0))
  const extension = match[1] === 'image/jpeg' ? 'jpg' : match[1].slice('image/'.length)
  return new File([bytes], `flashcard.${extension}`, { type: match[1] })
}

export function getFlashcardImageSource(image?: string): string | undefined {
  if (!image) return undefined
  if (legacyImagePattern.test(image)) return image
  if (!isImageKey(image)) return undefined
  const host = import.meta.env.VITE_SUPABASE_MEDIA_HOST?.trim().toLowerCase()
  if (!host || !/^[a-z0-9.-]+$/.test(host)) return undefined
  return `https://${host}/storage/v1/object/public/flashcards/${image}`
}

export async function readFlashcardImage(file: File): Promise<string> {
  if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type)) {
    throw new Error('Chọn ảnh PNG, JPG hoặc WebP.')
  }
  if (file.size === 0) throw new Error('Tệp ảnh đang trống.')
  if (file.size > IMAGE_MAX_BYTES) throw new Error('Ảnh vượt quá 2 MB. Hãy chọn ảnh nhỏ hơn.')
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
