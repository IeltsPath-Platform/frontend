import { Pause, Play, Volume2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { formatDuration } from '../lib/time'

const PLAYBACK_RATES = [1, 1.25, 1.5] as const

interface AudioPlayerProps {
  currentSeconds: number
  durationSeconds: number
  isPlaying: boolean
  volume: number
  playbackRate: (typeof PLAYBACK_RATES)[number]
  onTogglePlayback: () => void
  onSeek: (seconds: number) => void
  onVolumeChange: (volume: number) => void
  onPlaybackRateChange: (rate: (typeof PLAYBACK_RATES)[number]) => void
}

export function AudioPlayer({
  currentSeconds,
  durationSeconds,
  isPlaying,
  volume,
  playbackRate,
  onTogglePlayback,
  onSeek,
  onVolumeChange,
  onPlaybackRateChange,
}: AudioPlayerProps) {
  return (
    <section className="audio-player" aria-label="Trình phát bài nghe">
      <Button type="button" variant="default" size="icon" className="audio-player-toggle" aria-label={isPlaying ? 'Tạm dừng bài nghe' : 'Phát bài nghe'} onClick={onTogglePlayback}>
        {isPlaying ? <Pause aria-hidden="true" /> : <Play aria-hidden="true" />}
      </Button>
      <div className="audio-player-timeline">
        <div className="audio-player-time"><span>{formatDuration(currentSeconds)}</span><span>{formatDuration(durationSeconds)}</span></div>
        <input type="range" min={0} max={durationSeconds} step={1} value={currentSeconds} aria-label="Tua thời gian bài nghe" onChange={(event) => onSeek(Number(event.target.value))} />
      </div>
      <label className="audio-player-volume"><Volume2 aria-hidden="true" size={18} /><span className="sr-only">Âm lượng</span><input type="range" min={0} max={1} step={0.05} value={volume} aria-label="Âm lượng" onChange={(event) => onVolumeChange(Number(event.target.value))} /></label>
      <div className="audio-player-rates" aria-label="Tốc độ phát">
        {PLAYBACK_RATES.map((rate) => <Button key={rate} type="button" variant={rate === playbackRate ? 'secondary' : 'ghost'} className="audio-player-rate" aria-pressed={rate === playbackRate} onClick={() => onPlaybackRateChange(rate)}>{rate}x</Button>)}
      </div>
    </section>
  )
}
