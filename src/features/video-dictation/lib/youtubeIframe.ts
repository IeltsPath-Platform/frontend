/** The few parts of the YouTube IFrame Player API the dictation player uses. */
export interface YouTubePlayer {
  seekTo(seconds: number, allowSeekAhead: boolean): void
  playVideo(): void
  pauseVideo(): void
  getCurrentTime(): number
  getPlayerState(): number
  setPlaybackRate(rate: number): void
  /** Not in the public docs but long stable: switches a player module (such as the captions) off. */
  unloadModule(module: string): void
  setOption(module: string, option: string, value: unknown): void
  destroy(): void
}

interface YouTubePlayerOptions {
  videoId: string
  playerVars?: Record<string, string | number>
  events?: {
    onReady?: () => void
    onStateChange?: (event: { data: number }) => void
    /** The browser refused to start playback without a click inside the player itself. */
    onAutoplayBlocked?: () => void
    onError?: (event: { data: number }) => void
  }
}

interface YouTubeNamespace {
  Player: new (element: HTMLElement, options: YouTubePlayerOptions) => YouTubePlayer
  PlayerState: { ENDED: number; PLAYING: number }
}

declare global {
  interface Window {
    YT?: YouTubeNamespace
    onYouTubeIframeAPIReady?: () => void
  }
}

let apiPromise: Promise<YouTubeNamespace> | null = null

/** Loads the IFrame API script once and resolves with the `YT` namespace. */
export function loadYouTubeApi(): Promise<YouTubeNamespace> {
  if (window.YT?.Player) return Promise.resolve(window.YT)
  apiPromise ??= new Promise<YouTubeNamespace>((resolve, reject) => {
    const previous = window.onYouTubeIframeAPIReady
    window.onYouTubeIframeAPIReady = () => {
      previous?.()
      if (window.YT) resolve(window.YT)
    }
    const script = document.createElement('script')
    script.src = 'https://www.youtube.com/iframe_api'
    script.async = true
    script.onerror = () => {
      apiPromise = null
      script.remove()
      reject(new Error('Không tải được trình phát YouTube. Kiểm tra mạng rồi thử lại.'))
    }
    document.head.appendChild(script)
  })
  return apiPromise
}

export type { YouTubePlayerOptions, YouTubeNamespace }
