import { useEffect, useRef, useState, type CSSProperties } from 'react'
import { Pause, Play, Volume2, VolumeX, EllipsisVertical, Volume1 } from 'lucide-react'
import type { MediaAudio } from '~types/learningPath'

const SPEEDS = [0.75, 1, 1.25, 1.5] as const

/** m:ss, e.g. 5:48. */
function clock(seconds: number) {
  const whole = Math.max(0, Math.floor(seconds))
  return `${Math.floor(whole / 60)}:${String(whole % 60).padStart(2, '0')}`
}

/** Listening audio in the exam top bar: play/pause, elapsed / total time, a seek bar, volume and playback speed. */
export function ExamAudioPlayer({ audio }: { audio: Pick<MediaAudio, 'mediaUrl' | 'durationSeconds'> }) {
  const ref = useRef<HTMLAudioElement>(null)
  const [playing, setPlaying] = useState(false)
  const [time, setTime] = useState(0)
  const [duration, setDuration] = useState(audio.durationSeconds ?? 0)
  const [volume, setVolume] = useState(1)
  const [muted, setMuted] = useState(false)
  const [speed, setSpeed] = useState<number>(1)
  const [menuOpen, setMenuOpen] = useState(false)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    const element = ref.current
    if (!element) return
    const sync = () => {
      setTime(element.currentTime)
      if (Number.isFinite(element.duration)) setDuration(element.duration)
    }
    const handlers: Array<[string, () => void]> = [
      ['timeupdate', sync],
      ['loadedmetadata', sync],
      ['play', () => setPlaying(true)],
      ['pause', () => setPlaying(false)],
      ['ended', () => setPlaying(false)],
      ['error', () => setFailed(true)],
    ]
    handlers.forEach(([name, handler]) => element.addEventListener(name, handler))
    return () => handlers.forEach(([name, handler]) => element.removeEventListener(name, handler))
  }, [audio.mediaUrl])

  function toggle() {
    const element = ref.current
    if (!element) return
    if (element.paused) element.play().catch(() => setFailed(true))
    else element.pause()
  }

  function seek(value: number) {
    const element = ref.current
    if (!element) return
    element.currentTime = value
    setTime(value)
  }

  function changeVolume(value: number) {
    const element = ref.current
    setVolume(value)
    setMuted(value === 0)
    if (element) {
      element.volume = value
      element.muted = value === 0
    }
  }

  function toggleMute() {
    const element = ref.current
    const next = !muted
    setMuted(next)
    if (element) element.muted = next
  }

  function changeSpeed(value: number) {
    setSpeed(value)
    if (ref.current) ref.current.playbackRate = value
    setMenuOpen(false)
  }

  const VolumeIcon = muted || volume === 0 ? VolumeX : volume < 0.5 ? Volume1 : Volume2
  const progress = duration > 0 ? Math.min(100, (time / duration) * 100) : 0

  return (
    <div className="pl-audio" role="group" aria-label="Trình phát bài nghe">
      <span className="pl-audio__tag"><Volume2 aria-hidden="true" size={14} />Audio player</span>
      <div className="pl-audio__bar">
        <button aria-label={playing ? 'Tạm dừng' : 'Phát'} className="pl-audio__play" onClick={toggle} type="button">
          {playing ? <Pause aria-hidden="true" size={16} fill="currentColor" /> : <Play aria-hidden="true" size={16} fill="currentColor" />}
        </button>
        <span className="pl-audio__time">{clock(time)} / {duration > 0 ? clock(duration) : '--:--'}</span>
        <input aria-label="Tiến trình bài nghe" className="pl-audio__seek" max={duration || 0} min={0}
          onChange={(event) => seek(Number(event.target.value))} step={0.1} style={{ '--pl-audio-progress': `${progress}%` } as CSSProperties}
          type="range" value={Math.min(time, duration || 0)} />
        <button aria-label={muted ? 'Bật tiếng' : 'Tắt tiếng'} className="pl-audio__icon" onClick={toggleMute} type="button">
          <VolumeIcon aria-hidden="true" size={18} />
        </button>
        <input aria-label="Âm lượng" className="pl-audio__volume" max={1} min={0} onChange={(event) => changeVolume(Number(event.target.value))}
          step={0.05} style={{ '--pl-audio-progress': `${(muted ? 0 : volume) * 100}%` } as CSSProperties} type="range" value={muted ? 0 : volume} />
        <div className="pl-audio__more">
          <button aria-expanded={menuOpen} aria-haspopup="menu" aria-label="Tốc độ phát" className="pl-audio__icon" onClick={() => setMenuOpen((open) => !open)} type="button">
            <EllipsisVertical aria-hidden="true" size={18} />
          </button>
          {menuOpen ? (
            <ul className="pl-audio__menu" role="menu">
              {SPEEDS.map((value) => (
                <li key={value} role="none">
                  <button aria-checked={speed === value} className="pl-audio__speed" onClick={() => changeSpeed(value)} role="menuitemradio" type="button">
                    {value === 1 ? 'Bình thường' : `${value}x`}
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      </div>
      {failed ? <span className="pl-audio__error" role="alert">Chưa tải được audio</span> : null}
      <audio preload="metadata" ref={ref} src={audio.mediaUrl} />
    </div>
  )
}
