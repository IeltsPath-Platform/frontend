import { useEffect, useRef, useState } from 'react'
import type { CSSProperties } from 'react'
import { Gauge, Pause, Play, RotateCcw, RotateCw, Volume2 } from 'lucide-react'
import { formatDuration } from '../lib/time'

const RATES = [0.75, 1, 1.25, 1.5] as const

/**
 * The recording of one section, for practice and for reviewing a result: the learner can pause, jump 5 s, seek and change
 * the speed. The exam does not use it; it has its own recording that cannot be controlled (ListeningExamAudio).
 *
 * `inline` is one row (the review screen); `dock` is the practice layout, a bar along the bottom of the screen: the progress
 * line across, then the time and volume, the transport buttons in the middle and the speed on the right.
 */
export function ListeningAudioBar({ src, durationHint, layout = 'inline' }: { src: string; durationHint: number | null; layout?: 'inline' | 'dock' }) {
  const audioRef = useRef<HTMLAudioElement>(null)
  const [playing, setPlaying] = useState(false)
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
    if (audio.paused) void audio.play().catch(() => setFailed(true))
    else audio.pause()
  }

  function seek(seconds: number) {
    const audio = audioRef.current
    if (!audio) return
    audio.currentTime = Math.min(Math.max(0, seconds), duration || seconds)
    setCurrent(audio.currentTime)
  }

  const max = Math.max(1, Math.floor(duration))
  const audioElement = (
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
  )
  const back = <button type="button" className="lw-audio-step" onClick={() => seek(current - 5)} aria-label="Tua lại 5 giây"><RotateCcw size={16} aria-hidden="true" /><span>5</span></button>
  const play = (
    <button type="button" className="lw-audio-play" onClick={toggle} disabled={failed} aria-label={playing ? 'Tạm dừng' : 'Phát bài nghe'}>
      {playing ? <Pause size={18} aria-hidden="true" /> : <Play size={18} aria-hidden="true" />}
    </button>
  )
  const forward = <button type="button" className="lw-audio-step" onClick={() => seek(current + 5)} aria-label="Tua tới 5 giây"><span>5</span><RotateCw size={16} aria-hidden="true" /></button>
  const seekBar = (
    <input
      className="lw-audio-seek"
      type="range"
      min={0}
      max={max}
      step={1}
      value={Math.min(Math.floor(current), max)}
      style={{ '--lw-seek': `${Math.min(100, (current / max) * 100)}%` } as CSSProperties}
      disabled={failed}
      aria-label="Tiến độ bài nghe"
      onChange={(event) => seek(Number(event.target.value))}
    />
  )
  const volumeControl = (
    <label className="lw-audio-volume"><Volume2 size={16} aria-hidden="true" /><span className="sr-only">Âm lượng</span>
      <input type="range" min={0} max={1} step={0.05} value={volume} aria-label="Âm lượng" onChange={(event) => setVolume(Number(event.target.value))} />
    </label>
  )
  const error = failed && <span className="lw-audio-error" role="alert">Không tải được bài nghe.</span>

  if (layout === 'dock') {
    return (
      <section className="lw-audio lw-audio-dock" aria-label="Trình phát bài nghe">
        {audioElement}
        {seekBar}
        <div className="lw-dock-row">
          <div className="lw-dock-left">
            <span className="lw-audio-time">{formatDuration(current)} / {formatDuration(duration)}</span>
            {volumeControl}
          </div>
          <div className="lw-dock-center">{back}{play}{forward}</div>
          <div className="lw-dock-right">
            <button type="button" className="lw-audio-rate-button" aria-label="Tốc độ phát" onClick={() => setRate(RATES[(RATES.indexOf(rate) + 1) % RATES.length]!)}>
              <Gauge size={18} aria-hidden="true" /> Tốc độ: <strong>{rate}x</strong>
            </button>
          </div>
        </div>
        {error}
      </section>
    )
  }

  return (
    <section className="lw-audio" aria-label="Trình phát bài nghe">
      {audioElement}
      {back}
      {play}
      {forward}
      <span className="lw-audio-time">{formatDuration(current)}</span>
      {seekBar}
      <span className="lw-audio-time">{formatDuration(duration)}</span>
      {volumeControl}
      <select className="lw-audio-rate" value={rate} aria-label="Tốc độ phát" onChange={(event) => setRate(Number(event.target.value) as (typeof RATES)[number])}>
        {RATES.map((value) => <option key={value} value={value}>{value}x</option>)}
      </select>
      {error}
    </section>
  )
}
