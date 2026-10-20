import type { ReactNode, RefObject } from 'react'
import { Link } from 'react-router-dom'
import { ExternalLink, Loader2, Play, RotateCcw, TriangleAlert } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { Phase } from '../hooks/useDictationSession'
import type { PlayerStatus } from '../hooks/useYouTubeSegmentPlayer'
const RATES = [0.75, 1, 1.25] as const

interface PlayerStageProps {
  containerRef: RefObject<HTMLDivElement | null>
  status: PlayerStatus
  playerError: string | null
  /** Where the video lives on YouTube, offered when it cannot be embedded. */
  youtubeUrl: string
  phase: Phase
  playing: boolean
  /** The segment was started but the video did not play (see SegmentPlayer.stalled). */
  stalled: boolean
  sequenceNo: number
  rate: number
  onStart: () => void
  onReplay: () => void
  onRate: (rate: number) => void
  /** Extra content at the end of the controls (the stacked layout puts the sentence progress there). */
  children?: ReactNode
}

/** The YouTube video and a speed control under it. Clicking the video plays the current sentence again. */
export function PlayerStage({ containerRef, status, playerError, youtubeUrl, phase, playing, stalled, sequenceNo, rate, onStart, onReplay, onRate, children }: PlayerStageProps) {
  const started = phase !== 'ready' && phase !== 'done'
  const state = playing ? 'Đang phát' : started ? 'Đã dừng' : null

  return (
    <section className="vdp-stage" aria-label="Video nghe chép">
      {/* The wrapper is sized from the room left in the column, so the video and its controls always fit together. */}
      <div className="vdp-stage__inner">
        <div className="vdp-stage__video">
          <div ref={containerRef} className="vdp-stage__frame" />
          {/* Covers the embedded player so a click cannot pause or seek it; instead it plays this sentence again.
              Left off while the video is stalled: then YouTube wants a click of its own (play, consent, sign-in). */}
          {started && status === 'ready' && !stalled ? (
            <button type="button" className="vdp-stage__replay" data-playing={playing} aria-label={`Nghe lại câu ${sequenceNo}`} onClick={onReplay}>
              <RotateCcw aria-hidden="true" size={28} />
            </button>
          ) : null}
          {status !== 'ready' || phase === 'ready' ? (
            <div className="vdp-stage__cover">
              {status === 'loading' ? <p role="status"><Loader2 aria-hidden="true" className="vd-spin" size={22} /> Đang tải video…</p> : null}
              {status === 'error' ? (
                <div className="vdp-stage__error" role="alert">
                  <p><TriangleAlert aria-hidden="true" size={22} />{playerError}</p>
                  <div className="vdp-stage__error-links">
                    <a href={youtubeUrl} target="_blank" rel="noreferrer noopener">Mở trên YouTube<ExternalLink aria-hidden="true" size={14} /></a>
                    <Link to="/video-dictation">Chọn video khác</Link>
                  </div>
                </div>
              ) : null}
              {status === 'ready' && phase === 'ready' ? (
                <Button type="button" className="vdp-stage__play" onClick={onStart}>
                  <Play aria-hidden="true" size={18} />Bắt đầu nghe câu {sequenceNo}
                </Button>
              ) : null}
            </div>
          ) : null}
          {stalled && started && status === 'ready' ? (
            <div className="vdp-stage__stalled" role="alert">
              <p>Video chưa tự phát được. Hãy bấm nút phát ▶ hoặc xử lý thông báo của YouTube ngay trên video.</p>
              <Button type="button" size="sm" onClick={onReplay}><RotateCcw aria-hidden="true" size={14} />Thử lại</Button>
            </div>
          ) : null}
          {state ? (
            <p className="vdp-stage__badge" role="status" data-playing={playing}>
              <span className="vdp-stage__dot" aria-hidden="true" />Câu {sequenceNo} · {state}
            </p>
          ) : null}
        </div>

        <div className="vdp-controls">
          {/* Only the wide layouts show this button (the CSS hides it in the one-column page, which replays from the video). */}
          <button type="button" className="vdp-controls__replay" disabled={!started || status !== 'ready'} onClick={onReplay}>
            <RotateCcw aria-hidden="true" size={16} />Phát lại câu <kbd>Alt+R</kbd>
          </button>
          <div className="vdp-rates" role="group" aria-label="Tốc độ phát">
            {RATES.map((value) => (
              <button key={value} type="button" className="vdp-rate" aria-pressed={rate === value} onClick={() => onRate(value)}>
                {value}×
              </button>
            ))}
          </div>
          <p className="vdp-controls__tip">Bấm vào video để nghe lại · phụ đề được ẩn</p>
          {children}
        </div>
      </div>
    </section>
  )
}
