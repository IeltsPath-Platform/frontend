import { useEffect, useRef, useState } from 'react'
import { Pause, Play, RotateCcw, RotateCw, Volume2 } from 'lucide-react'
import { formatDuration } from '../lib/time'

const RATES = [0.75, 1, 1.25, 1.5] as const

/**
 * The recording of one section. In practice the learner can pause, jump 5 s, seek and change the speed; in the
 * exam the recording plays once, so only play, the volume and a read-only progress bar remain.
 */
export function ListeningAudioBar({ src, durationHint, exam }: { src: string; durationHint: number | null; exam: boolean }) {
  const audioRef = useRef<HTMLAudioElement>(null)
  const [playing, setPlaying] = useState(false)
  const [started, setStarted] = useState(false)
  const [current, setCurrent] = useState(0)
  const [duration, setDuration] = useState(durationHint ?? 0)
  const [volume, setVolume] = useState(0.8)
  const [rate, setRate] = useState<(typeof RATES)[number]>(1)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    if (audioRef.current) audioRef.current.volume = volume
  }, [volume])

  useEffect(() => {
    if (audioRef.current) audioRef.current.playbackRate = rate
  }, [rate])

  function toggle() {
    const audio = audioRef.current
    if (!audio) return
    if (audio.paused) {
      setStarted(true)
      void audio.play().catch(() => setFailed(true))
    } else audio.pause()
  }

  function seek(seconds: number) {
    const audio = audioRef.current
    if (!audio) return
    audio.currentTime = Math.min(Math.max(0, seconds), duration || seconds)
    setCurrent(audio.currentTime)
  }

  const locked = exam && started
  const max = Math.max(1, Math.floor(duration))
  return (
    <section className="lw-audio" aria-label="Trình phát bài nghe">
      <audio
        ref={audioRef}
        src={src}
        preload="metadata"
        onLoadedMetadata={(event) => { if (Number.isFinite(event.currentTarget.duration)) setDuration(event.currentTarget.duration) }}
        onTimeUpdate={(event) => setCurrent(event.currentTarget.currentTime)}
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onEnded={() => setPlaying(false)}
        onError={() => setFailed(true)}
      />
      {!exam && (
        <button type="button" className="lw-audio-step" onClick={() => seek(current - 5)} aria-label="Tua lại 5 giây"><RotateCcw size={16} aria-hidden="true" /><span>5</span></button>
      )}
      <button type="button" className="lw-audio-play" onClick={toggle} disabled={locked || failed} aria-label={playing ? 'Tạm dừng' : 'Phát bài nghe'}>
        {playing ? <Pause size={18} aria-hidden="true" /> : <Play size={18} aria-hidden="true" />}
      </button>
      {!exam && (
        <button type="button" className="lw-audio-step" onClick={() => seek(current + 5)} aria-label="Tua tới 5 giây"><span>5</span><RotateCw size={16} aria-hidden="true" /></button>
      )}
      <span className="lw-audio-time">{formatDuration(current)}</span>
      <input
        className="lw-audio-seek"
        type="range"
        min={0}
        max={max}
        step={1}
        value={Math.min(Math.floor(current), max)}
        disabled={exam || failed}
        aria-label="Tiến độ bài nghe"
        onChange={(event) => seek(Number(event.target.value))}
      />
      <span className="lw-audio-time">{formatDuration(duration)}</span>
      <label className="lw-audio-volume"><Volume2 size={16} aria-hidden="true" /><span className="sr-only">Âm lượng</span>
        <input type="range" min={0} max={1} step={0.05} value={volume} aria-label="Âm lượng" onChange={(event) => setVolume(Number(event.target.value))} />
      </label>
      {!exam && (
        <select className="lw-audio-rate" value={rate} aria-label="Tốc độ phát" onChange={(event) => setRate(Number(event.target.value) as (typeof RATES)[number])}>
          {RATES.map((value) => <option key={value} value={value}>{value}x</option>)}
        </select>
      )}
      {failed && <span className="lw-audio-error" role="alert">Không tải được bài nghe.</span>}
    </section>
  )
}
