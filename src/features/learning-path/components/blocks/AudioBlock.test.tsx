import { fireEvent, render, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { AudioBlock } from './AudioBlock'

describe('lesson audio URL renewal', () => {
  it('loads a fresh lesson URL once after the signed URL fails', async () => {
    const refreshAudioUrl = vi.fn().mockResolvedValue('https://private.test/audio?token=fresh')
    const { container } = render(<AudioBlock audio={{ mediaUrl: 'https://private.test/audio?token=expired', durationSeconds: 45, transcript: null }} refreshAudioUrl={refreshAudioUrl} />)

    const audio = container.querySelector('audio')
    expect(audio).not.toBeNull()
    fireEvent.error(audio!)

    await waitFor(() => expect(audio).toHaveAttribute('src', 'https://private.test/audio?token=fresh'))
    fireEvent.error(audio!)
    expect(refreshAudioUrl).toHaveBeenCalledTimes(1)
  })

  it('resumes playback at the same position after loading a fresh URL', async () => {
    const refreshAudioUrl = vi.fn().mockResolvedValue('https://private.test/audio?token=fresh')
    const { container } = render(<AudioBlock audio={{ mediaUrl: 'https://private.test/audio?token=expired', durationSeconds: 45, transcript: null }} refreshAudioUrl={refreshAudioUrl} />)
    const audio = container.querySelector('audio')!
    Object.defineProperty(audio, 'currentTime', { configurable: true, writable: true, value: 32 })
    Object.defineProperty(audio, 'paused', { configurable: true, get: () => false })
    const play = vi.fn().mockResolvedValue(undefined)
    audio.play = play

    fireEvent.error(audio)
    await waitFor(() => expect(audio).toHaveAttribute('src', 'https://private.test/audio?token=fresh'))
    fireEvent.loadedMetadata(audio)

    expect(audio.currentTime).toBe(32)
    expect(play).toHaveBeenCalledOnce()
  })

  it('does not request another lesson URL when renewal fails', async () => {
    const refreshAudioUrl = vi.fn().mockRejectedValue(new Error('unavailable'))
    const { container } = render(<AudioBlock audio={{ mediaUrl: 'https://private.test/audio?token=expired', durationSeconds: 45, transcript: null }} refreshAudioUrl={refreshAudioUrl} />)

    const audio = container.querySelector('audio')
    fireEvent.error(audio!)
    await waitFor(() => expect(refreshAudioUrl).toHaveBeenCalledTimes(1))
    fireEvent.error(audio!)
    expect(refreshAudioUrl).toHaveBeenCalledTimes(1)
  })
})
