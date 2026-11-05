import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { PronunciationButton } from './PronunciationButton'
import { isPlayableAudio } from '@/lib/pronunciation'
import * as speakModule from '@/features/flashcards/lib/speak'

const HTTPS_URL_A = 'https://example.supabase.co/audio-a.mp3'
const HTTPS_URL_B = 'https://example.supabase.co/audio-b.mp3'

interface FakeAudioInstance {
  src: string
  play: ReturnType<typeof vi.fn>
  pause: ReturnType<typeof vi.fn>
  onended: (() => void) | null
  onpause: (() => void) | null
  onerror: (() => void) | null
}

function stubAudioSystem(playImpl: () => Promise<void> = () => Promise.resolve()) {
  const created: FakeAudioInstance[] = []

  class FakeAudio {
    src: string
    play = vi.fn(playImpl)
    pause = vi.fn()
    onended: (() => void) | null = null
    onpause: (() => void) | null = null
    onerror: (() => void) | null = null

    constructor(src: string) {
      this.src = src
      created.push(this)
    }
  }

  vi.stubGlobal('Audio', FakeAudio)
  return created
}

describe('isPlayableAudio', () => {
  it('accepts only https:// URLs', () => {
    expect(isPlayableAudio('https://example.com/audio.mp3')).toBe(true)
    expect(isPlayableAudio('http://example.com/audio.mp3')).toBe(false)
    expect(isPlayableAudio('vocabulary/pronunciation/us/hello.mp3')).toBe(false)
    expect(isPlayableAudio('')).toBe(false)
    expect(isPlayableAudio(null)).toBe(false)
    expect(isPlayableAudio(undefined)).toBe(false)
    expect(isPlayableAudio(123)).toBe(false)
  })
})

describe('PronunciationButton', () => {
  let speakSpy: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    speakSpy = vi.spyOn(speakModule, 'speak').mockImplementation(() => {})
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it('is disabled with "Chưa có audio" tooltip when src is null and no tts fallback', () => {
    render(<PronunciationButton lemma="abandon" src={null} />)

    const button = screen.getByRole('button', { name: /Chưa có audio/i })
    expect(button).toBeDisabled()
    expect(button).toHaveAttribute('title', 'Chưa có audio')
  })

  it('speaks text-to-speech for MANUAL cards without audio source', async () => {
    const user = userEvent.setup()
    render(<PronunciationButton lemma="custom" src={null} ttsFallbackText="custom card text" />)

    const button = screen.getByRole('button', { name: /Nghe phát âm/i })
    expect(button).toBeEnabled()

    await user.click(button)
    expect(speakSpy).toHaveBeenCalledWith('custom card text')
  })

  it('marks state as failed and does NOT fall back to TTS when audio playback fails', async () => {
    const user = userEvent.setup()
    stubAudioSystem(() => Promise.reject(new Error('Audio playback failed')))

    render(
      <PronunciationButton
        lemma="resilient"
        src={HTTPS_URL_A}
        showErrorMessage
      />
    )

    const button = screen.getByRole('button', { name: 'Nghe phát âm từ resilient' })
    await user.click(button)

    expect(await screen.findByText('Chưa phát được âm thanh.')).toBeInTheDocument()
    expect(button).toHaveAttribute('data-state', 'failed')
    expect(speakSpy).not.toHaveBeenCalled()
  })

  it('ensures only one audio plays at a time, pausing earlier audio', async () => {
    const user = userEvent.setup()
    const createdAudios = stubAudioSystem(() => Promise.resolve())

    render(
      <div>
        <PronunciationButton lemma="word1" src={HTTPS_URL_A} />
        <PronunciationButton lemma="word2" src={HTTPS_URL_B} />
      </div>
    )

    const btn1 = screen.getByRole('button', { name: 'Nghe phát âm từ word1' })
    const btn2 = screen.getByRole('button', { name: 'Nghe phát âm từ word2' })

    await user.click(btn1)
    expect(createdAudios).toHaveLength(1)
    expect(createdAudios[0].src).toBe(HTTPS_URL_A)
    expect(createdAudios[0].play).toHaveBeenCalledTimes(1)

    await user.click(btn2)
    expect(createdAudios).toHaveLength(2)
    expect(createdAudios[0].pause).toHaveBeenCalled()
    expect(createdAudios[1].src).toBe(HTTPS_URL_B)
    expect(createdAudios[1].play).toHaveBeenCalledTimes(1)
  })

  it('stops event propagation so parent clickable elements are not triggered', async () => {
    const user = userEvent.setup()
    stubAudioSystem(() => Promise.resolve())
    const onParentClick = vi.fn()

    render(
      <div onClick={onParentClick} role="button" tabIndex={0} aria-label="Card container">
        <PronunciationButton lemma="test" src={HTTPS_URL_A} />
      </div>
    )

    const button = screen.getByRole('button', { name: 'Nghe phát âm từ test' })
    await user.click(button)

    expect(onParentClick).not.toHaveBeenCalled()
  })
})

