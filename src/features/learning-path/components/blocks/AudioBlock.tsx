import { useEffect, useId, useRef, useState } from 'react'
import { Headphones } from 'lucide-react'
import type { AudioBlockData, MediaAudio } from '~types/learningPath'

interface AudioBlockProps {
  audio: Pick<AudioBlockData, 'mediaUrl' | 'durationSeconds' | 'transcript'> | MediaAudio
  title?: string
  refreshAudioUrl?: () => Promise<string | null>
}

/** Native HTML audio for lesson/review/test Listening assets. */
export function AudioBlock({ audio, title = 'Bài nghe', refreshAudioUrl }: AudioBlockProps) {
  const titleId = useId()
  const ref = useRef<HTMLAudioElement>(null)
  const [duration, setDuration] = useState(audio.durationSeconds ?? 0)
  const [refreshedMedia, setRefreshedMedia] = useState<{ originalUrl: string; refreshedUrl: string } | null>(null)
  const mediaUrl = refreshedMedia?.originalUrl === audio.mediaUrl ? refreshedMedia.refreshedUrl : audio.mediaUrl
  const refreshAttempted = useRef(false)
  const pendingPlayback = useRef<{ time: number; wasPlaying: boolean } | null>(null)

  useEffect(() => {
    refreshAttempted.current = false
    pendingPlayback.current = null
  }, [audio.mediaUrl])

  useEffect(() => {
    const element = ref.current
    if (!element) return
    const onMeta = () => setDuration(Number.isFinite(element.duration) ? Math.round(element.duration) : (audio.durationSeconds ?? 0))
    element.addEventListener('loadedmetadata', onMeta)
    return () => element.removeEventListener('loadedmetadata', onMeta)
  }, [audio.durationSeconds, audio.mediaUrl])

  useEffect(() => {
    const element = ref.current
    const playback = pendingPlayback.current
    if (!element || !playback) return
    const resume = () => {
      if (playback.time > 0) element.currentTime = playback.time
      if (playback.wasPlaying) void element.play().catch(() => undefined)
      pendingPlayback.current = null
    }
    element.addEventListener('loadedmetadata', resume, { once: true })
    return () => element.removeEventListener('loadedmetadata', resume)
  }, [mediaUrl])

  async function refreshExpiredAudio() {
    if (!refreshAudioUrl || refreshAttempted.current) return
    refreshAttempted.current = true
    const element = ref.current
    if (element) pendingPlayback.current = { time: element.currentTime, wasPlaying: !element.paused }
    try {
      const refreshedUrl = await refreshAudioUrl()
      if (refreshedUrl && refreshedUrl !== mediaUrl) {
        setRefreshedMedia({ originalUrl: audio.mediaUrl, refreshedUrl })
      }
      else pendingPlayback.current = null
    } catch {
      pendingPlayback.current = null
      // Keep the native audio error visible if the refreshed lesson cannot be loaded.
    }
  }

  return (
    <section className="lp-audio" aria-labelledby={titleId}>
      <header className="lp-audio__head">
        <Headphones aria-hidden="true" size={18} />
        <h3 id={titleId}>{title}</h3>
        {duration > 0 ? <span className="lp-audio__meta">{duration}s</span> : null}
      </header>
      <audio className="lp-audio__player" controls controlsList="nodownload" preload="metadata" ref={ref}
        onError={refreshExpiredAudio} src={mediaUrl}>
        Trình duyệt không phát được audio.
      </audio>
      {audio.transcript ? (
        <details className="lp-audio__transcript">
          <summary>Transcript</summary>
          <p>{audio.transcript}</p>
        </details>
      ) : null}
    </section>
  )
}

export default AudioBlock
