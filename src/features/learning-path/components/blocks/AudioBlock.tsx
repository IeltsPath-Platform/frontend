import { useEffect, useId, useRef, useState } from 'react'
import { Headphones } from 'lucide-react'
import type { AudioBlockData, MediaAudio } from '~types/learningPath'

interface AudioBlockProps {
  audio: Pick<AudioBlockData, 'mediaUrl' | 'durationSeconds' | 'transcript'> | MediaAudio
  title?: string
}

/** Native HTML audio for lesson/review/test Listening assets. */
export function AudioBlock({ audio, title = 'Bài nghe' }: AudioBlockProps) {
  const titleId = useId()
  const ref = useRef<HTMLAudioElement>(null)
  const [duration, setDuration] = useState(audio.durationSeconds ?? 0)

  useEffect(() => {
    const element = ref.current
    if (!element) return
    const onMeta = () => setDuration(Number.isFinite(element.duration) ? Math.round(element.duration) : (audio.durationSeconds ?? 0))
    element.addEventListener('loadedmetadata', onMeta)
    return () => element.removeEventListener('loadedmetadata', onMeta)
  }, [audio.durationSeconds, audio.mediaUrl])

  return (
    <section className="lp-audio" aria-labelledby={titleId}>
      <header className="lp-audio__head">
        <Headphones aria-hidden="true" size={18} />
        <h3 id={titleId}>{title}</h3>
        {duration > 0 ? <span className="lp-audio__meta">{duration}s</span> : null}
      </header>
      <audio className="lp-audio__player" controls controlsList="nodownload" preload="metadata" ref={ref} src={audio.mediaUrl}>
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
