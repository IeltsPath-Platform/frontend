import { speak } from '@/features/flashcards/lib/speak'

/**
 * Checks whether an audio reference is a playable HTTPS URL.
 * Internal object keys, non-HTTPS protocols, or empty references cannot be played directly by the browser.
 */
export function isPlayableAudio(src: unknown): src is string {
  return typeof src === 'string' && src.startsWith('https://')
}

let activeAudio: HTMLAudioElement | null = null

export function getActiveAudio(): HTMLAudioElement | null {
  return activeAudio
}

export function stopActiveAudio(): void {
  if (activeAudio) {
    activeAudio.pause()
    activeAudio = null
  }
}

export function setActiveAudio(audio: HTMLAudioElement | null): void {
  if (activeAudio && activeAudio !== audio) {
    activeAudio.pause()
  }
  activeAudio = audio
}

/**
 * Plays an audio reference if playable, stopping any currently active audio.
 * Returns the audio instance or null if not playable.
 */
export function playPronunciationAudio(src: unknown): HTMLAudioElement | null {
  if (!isPlayableAudio(src)) return null
  stopActiveAudio()
  const audio = new Audio(src)
  setActiveAudio(audio)
  audio.onended = () => {
    if (getActiveAudio() === audio) setActiveAudio(null)
  }
  audio.onpause = () => {
    if (getActiveAudio() === audio) setActiveAudio(null)
  }
  audio.onerror = () => {
    if (getActiveAudio() === audio) setActiveAudio(null)
  }
  audio.play().catch(() => {
    if (getActiveAudio() === audio) setActiveAudio(null)
  })
  return audio
}

export { speak }

