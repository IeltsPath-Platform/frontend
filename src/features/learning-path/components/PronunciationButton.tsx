import { useEffect, useRef, useState } from 'react'
import { Volume2 } from 'lucide-react'
import { Button } from '@/components/ui/button'

type PlaybackState = 'idle' | 'playing' | 'failed'

interface PronunciationButtonProps {
  lemma: string
  src: string
}

// One word is read at a time: starting a new recording stops the one still playing in another row.
let activeAudio: HTMLAudioElement | null = null

export function PronunciationButton({ lemma, src }: PronunciationButtonProps) {
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const [state, setState] = useState<PlaybackState>('idle')

  useEffect(() => () => {
    audioRef.current?.pause()
    if (activeAudio === audioRef.current) activeAudio = null
  }, [])

  function play() {
    activeAudio?.pause()
    audioRef.current?.pause()

    const audio = new Audio(src)
    audioRef.current = audio
    activeAudio = audio
    const settle = (next: PlaybackState) => { if (audioRef.current === audio) setState(next) }
    audio.onended = () => settle('idle')
    audio.onpause = () => settle('idle')
    audio.onerror = () => settle('failed')

    setState('playing')
    audio.play().catch(() => settle('failed'))
  }

  return (
    <>
      <Button
        aria-label={`Nghe phát âm từ ${lemma}`}
        className="lp-vocabulary__play"
        size="icon"
        type="button"
        variant="outline"
        onClick={play}
      >
        <Volume2 aria-hidden="true" data-playing={state === 'playing' ? 'true' : undefined} size={18} />
      </Button>
      {state === 'failed' ? (
        <span className="lp-vocabulary__play-error" role="status">Chưa phát được âm thanh.</span>
      ) : null}
    </>
  )
}
