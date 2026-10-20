import { useCallback, useEffect, useRef, useState, type RefObject } from 'react'
import { loadYouTubeApi, type YouTubePlayer } from '../lib/youtubeIframe'

export type PlayerStatus = 'loading' | 'ready' | 'error'

export interface SegmentPlayer {
  status: PlayerStatus
  error: string | null
  /** Plays from `startMs`, pauses at `endMs` and then calls `onEnd`. A new call cancels the previous one. */
  playSegment: (startMs: number, endMs: number, onEnd: () => void) => void
  /** Stops playback and cancels the pending `onEnd`. */
  stop: () => void
  setRate: (rate: number) => void
  /**
   * A segment was started but the video did not begin to play: the browser or YouTube wants a click inside the player
   * itself (an autoplay block, a consent or sign-in notice, an age check). Clears when the video plays.
   */
  stalled: boolean
}

const POLL_MS = 100
const END_MARGIN_MS = 40
/** How long a started segment may take to begin playing before it counts as stalled. */
export const STALL_AFTER_MS = 4000

/** What a YouTube IFrame error code means for the learner (101 and 150 are the same: embedding is switched off). */
export function playerErrorMessage(code: number) {
  if (code === 101 || code === 150) return 'Chủ video không cho phép phát video này trên trang khác nên không dùng được để nghe chép.'
  if (code === 100) return 'Video này đã bị gỡ hoặc đang để chế độ riêng tư.'
  return 'Trình phát YouTube gặp lỗi khi mở video này. Hãy tải lại trang hoặc chọn video khác.'
}

/** The sentence is what the learner has to hear, so YouTube's own captions must not show it. */
function hideCaptions(player: YouTubePlayer | null) {
  try {
    player?.unloadModule('captions')
    player?.unloadModule('cc')
  } catch {
    // The module is not loaded or the player is not ready yet: nothing to hide.
  }
}

/**
 * Embeds a YouTube video in `containerRef` and plays it one segment at a time. The IFrame API has no "stop at"
 * option, so the current time is polled while a segment plays and the video is paused when its end is reached.
 */
export function useYouTubeSegmentPlayer(containerRef: RefObject<HTMLElement | null>, youtubeVideoId: string | null): SegmentPlayer {
  const [status, setStatus] = useState<PlayerStatus>('loading')
  const [error, setError] = useState<string | null>(null)
  const playerRef = useRef<YouTubePlayer | null>(null)
  const timerRef = useRef<number | undefined>(undefined)
  const rateRef = useRef(1)
  const stallTimerRef = useRef<number | undefined>(undefined)
  const [stalled, setStalled] = useState(false)

  const clearTimer = useCallback(() => {
    window.clearInterval(timerRef.current)
    timerRef.current = undefined
  }, [])

  const clearStallTimer = useCallback(() => {
    window.clearTimeout(stallTimerRef.current)
    stallTimerRef.current = undefined
  }, [])

  useEffect(() => {
    const container = containerRef.current
    if (!youtubeVideoId || !container) return undefined
    let cancelled = false
    // The API replaces the element it is given, so React keeps owning the container and the API gets a child.
    const mount = document.createElement('div')
    container.appendChild(mount)
    loadYouTubeApi()
      .then((YT) => {
        if (cancelled) return
        playerRef.current = new YT.Player(mount, {
          videoId: youtubeVideoId,
          playerVars: { controls: 0, disablekb: 1, rel: 0, modestbranding: 1, playsinline: 1, fs: 0, iv_load_policy: 3, cc_load_policy: 0 },
          events: {
            onReady: () => {
              if (cancelled) return
              playerRef.current?.setPlaybackRate(rateRef.current)
              hideCaptions(playerRef.current)
              setStatus('ready')
            },
            // YouTube switches the learner's own caption preference back on when playback starts, so hide them then too.
            onStateChange: (event) => {
              if (cancelled || event.data !== window.YT?.PlayerState.PLAYING) return
              hideCaptions(playerRef.current)
              clearStallTimer()
              setStalled(false)
            },
            onAutoplayBlocked: () => {
              if (!cancelled) setStalled(true)
            },
            onError: (event) => {
              if (cancelled) return
              setError(playerErrorMessage(event.data))
              setStatus('error')
            },
          },
        })
      })
      .catch((reason: unknown) => {
        if (cancelled) return
        setError(reason instanceof Error ? reason.message : 'Không tải được trình phát YouTube.')
        setStatus('error')
      })
    return () => {
      cancelled = true
      clearTimer()
      clearStallTimer()
      playerRef.current?.destroy()
      playerRef.current = null
      mount.remove()
    }
  }, [containerRef, youtubeVideoId, clearTimer, clearStallTimer])

  const playSegment = useCallback((startMs: number, endMs: number, onEnd: () => void) => {
    const player = playerRef.current
    if (!player) return
    clearTimer()
    clearStallTimer()
    setStalled(false)
    player.seekTo(startMs / 1000, true)
    player.playVideo()
    // If the video has not started playing by then, nothing the page does will start it: the learner has to click.
    stallTimerRef.current = window.setTimeout(() => setStalled(true), STALL_AFTER_MS)
    timerRef.current = window.setInterval(() => {
      const current = playerRef.current
      if (!current) return
      const ended = current.getPlayerState() === window.YT?.PlayerState.ENDED
      if (current.getCurrentTime() * 1000 >= endMs - END_MARGIN_MS || ended) {
        clearTimer()
        current.pauseVideo()
        onEnd()
      }
    }, POLL_MS)
  }, [clearTimer, clearStallTimer])

  const stop = useCallback(() => {
    clearTimer()
    clearStallTimer()
    playerRef.current?.pauseVideo()
  }, [clearTimer, clearStallTimer])

  const setRate = useCallback((rate: number) => {
    rateRef.current = rate
    playerRef.current?.setPlaybackRate(rate)
  }, [])

  return { status, error, playSegment, stop, setRate, stalled }
}
