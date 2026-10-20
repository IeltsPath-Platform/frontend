import { act, renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { STALL_AFTER_MS, playerErrorMessage, useYouTubeSegmentPlayer } from './useYouTubeSegmentPlayer'

const { fake, loadMock } = vi.hoisted(() => {
  const state = {
    events: {} as {
      onReady?: () => void
      onStateChange?: (event: { data: number }) => void
      onError?: (event: { data: number }) => void
      onAutoplayBlocked?: () => void
    },
    player: {
      seekTo: vi.fn(), playVideo: vi.fn(), pauseVideo: vi.fn(), getCurrentTime: vi.fn(), getPlayerState: vi.fn(),
      setPlaybackRate: vi.fn(), unloadModule: vi.fn(), setOption: vi.fn(), destroy: vi.fn(),
    },
    playerVars: undefined as Record<string, string | number> | undefined,
  }
  const YT = {
    PlayerState: { ENDED: 0, PLAYING: 1 },
    Player: vi.fn(function Player(_element: HTMLElement, options: { playerVars: Record<string, string | number>; events: typeof state.events }) {
      state.events = options.events
      state.playerVars = options.playerVars
      return state.player
    }),
  }
  return { fake: state, loadMock: vi.fn(() => Promise.resolve(YT)) }
})

vi.mock('../lib/youtubeIframe', () => ({ loadYouTubeApi: loadMock }))

describe('useYouTubeSegmentPlayer', () => {
  beforeEach(() => vi.clearAllMocks())

  it("keeps YouTube's own captions off, when the player is ready and again each time playback starts", async () => {
    window.YT = { PlayerState: { ENDED: 0, PLAYING: 1 } } as never
    const container = document.createElement('div')
    const { result } = renderHook(() => useYouTubeSegmentPlayer({ current: container }, 'abc'))

    await waitFor(() => expect(fake.events.onReady).toBeDefined())
    expect(fake.playerVars).toMatchObject({ cc_load_policy: 0 })
    fake.events.onReady?.()
    await waitFor(() => expect(result.current.status).toBe('ready'))
    expect(fake.player.unloadModule).toHaveBeenCalledWith('captions')

    fake.player.unloadModule.mockClear()
    fake.events.onStateChange?.({ data: 2 }) // paused: nothing to do
    expect(fake.player.unloadModule).not.toHaveBeenCalled()
    fake.events.onStateChange?.({ data: 1 }) // playing
    expect(fake.player.unloadModule).toHaveBeenCalledWith('captions')
  })

  it('reports a video whose owner switched embedding off as not playable', async () => {
    const { result } = renderHook(() => useYouTubeSegmentPlayer({ current: document.createElement('div') }, 'abc'))

    await waitFor(() => expect(fake.events.onError).toBeDefined())
    act(() => fake.events.onError?.({ data: 150 }))
    expect(result.current.status).toBe('error')
    expect(result.current.error).toBe(playerErrorMessage(150))
    expect(result.current.error).toContain('không cho phép phát')
  })

  it('reports a started segment as stalled when the video never plays, and clears it once it does', async () => {
    window.YT = { PlayerState: { ENDED: 0, PLAYING: 1 } } as never
    const container = { current: document.createElement('div') } // one ref for every render, as in the page
    const { result } = renderHook(() => useYouTubeSegmentPlayer(container, 'abc'))
    await waitFor(() => expect(fake.events.onReady).toBeDefined())
    act(() => fake.events.onReady?.())
    await waitFor(() => expect(result.current.status).toBe('ready'))

    vi.useFakeTimers()
    try {
      act(() => result.current.playSegment(1000, 3000, () => undefined))
      expect(result.current.stalled).toBe(false)
      act(() => { vi.advanceTimersByTime(STALL_AFTER_MS - 1) })
      expect(result.current.stalled).toBe(false)
      act(() => { vi.advanceTimersByTime(2) })
      expect(result.current.stalled).toBe(true)

      act(() => fake.events.onStateChange?.({ data: 1 }))  // the learner clicked YouTube's own play button
      expect(result.current.stalled).toBe(false)

      act(() => result.current.playSegment(1000, 3000, () => undefined))
      act(() => fake.events.onStateChange?.({ data: 1 }))  // it played in time
      act(() => { vi.advanceTimersByTime(STALL_AFTER_MS * 2) })
      expect(result.current.stalled).toBe(false)
    } finally {
      vi.useRealTimers()
    }
  })

  it('treats a blocked autoplay as stalled at once', async () => {
    const container = { current: document.createElement('div') }
    const { result } = renderHook(() => useYouTubeSegmentPlayer(container, 'abc'))
    await waitFor(() => expect(fake.events.onAutoplayBlocked).toBeDefined())
    act(() => fake.events.onAutoplayBlocked?.())
    expect(result.current.stalled).toBe(true)
  })

  it('tells a removed video from an embedding block', () => {
    expect(playerErrorMessage(101)).toBe(playerErrorMessage(150))
    expect(playerErrorMessage(100)).toContain('đã bị gỡ')
    expect(playerErrorMessage(5)).toContain('gặp lỗi')
  })
})
