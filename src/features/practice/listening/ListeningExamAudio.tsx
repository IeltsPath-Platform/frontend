import { useEffect, useRef, useState } from 'react'

type Phase = 'starting' | 'blocked' | 'playing' | 'done' | 'failed'

const STATE_LABEL: Record<Phase, string> = {
  starting: 'Đang chuẩn bị bài nghe…',
  blocked: 'Trình duyệt chưa cho tự phát tiếng',
  playing: 'Đang phát bài nghe',
  done: 'Bài nghe của phần này đã kết thúc',
  failed: 'Không phát được bài nghe',
}

/**
 * The recording of one part of the exam, as in the real test: it starts by itself, plays once and has no button to pause,
 * rewind or replay it, and no slider of any kind (the learner sets the volume on the device). When the browser refuses to
 * start sound without a click, a single button starts it. A part whose recording already started is not played again.
 */
export function ListeningExamAudio({ src, alreadyPlayed, onStarted, onEnded }: {
  src: string
  /** True when this part was heard before (the page was reloaded or the learner came back to it). */
  alreadyPlayed: boolean
  onStarted: () => void
  onEnded: () => void
}) {
  const audioRef = useRef<HTMLAudioElement>(null)
  const [wasPlayed] = useState(alreadyPlayed)
  const [phase, setPhase] = useState<Phase>(alreadyPlayed ? 'done' : 'starting')

  function start() {
    void audioRef.current?.play().catch((error: unknown) => {
      setPhase(error instanceof DOMException && error.name === 'NotAllowedError' ? 'blocked' : 'failed')
    })
  }

  useEffect(() => {
    const audio = audioRef.current
    if (!audio || wasPlayed) return undefined
    void audio.play().catch((error: unknown) => {
      setPhase(error instanceof DOMException && error.name === 'NotAllowedError' ? 'blocked' : 'failed')
    })
    // Leaving the part (or the page) cuts the recording short; it is not given again.
    return () => audio.pause()
  }, [wasPlayed])

  return (
    <div className="lw-exam-audio" role="status" aria-live="polite">
      {!wasPlayed && (
        <audio
          ref={audioRef}
          src={src}
          preload="auto"
          onPlay={() => { setPhase('playing'); onStarted() }}
          onEnded={() => { setPhase('done'); onEnded() }}
          onError={() => setPhase('failed')}
        />
      )}
      <span className={`lw-exam-audio-state is-${phase}`}>{STATE_LABEL[phase]}</span>
      {phase === 'blocked' && <button type="button" className="lw-exam-audio-start" onClick={start}>Bắt đầu bài nghe</button>}
    </div>
  )
}
