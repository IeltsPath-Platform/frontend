import { LoaderCircle, Mic, Play, Square } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { AudioVisualizer } from '../components/AudioVisualizer'
import { useAudioRecorder } from '../hooks/useAudioRecorder'
import { formatDuration } from '../lib/time'

/** The recorder of one question; a new question mounts a new recorder, so a recording never carries over. */
export function SpeakingRecorder({ limitSeconds }: { limitSeconds: number | null }) {
  const recorder = useAudioRecorder()
  const isRecording = recorder.status === 'recording'
  const isBusy = recorder.status === 'requesting' || recorder.status === 'processing'
  const used = limitSeconds ? Math.min(100, (recorder.elapsedSeconds / limitSeconds) * 100) : 0

  const heading = isRecording ? 'Microphone is live' : recorder.status === 'recorded' ? 'Your recording is ready' : 'Ready when you are'
  const state = isRecording ? 'Đang ghi' : isBusy ? 'Đang xử lý' : recorder.status === 'recorded' ? 'Đã ghi xong' : 'Sẵn sàng'
  const hint = recorder.status === 'requesting' ? 'Đang xin quyền dùng micro…'
    : recorder.status === 'processing' ? 'Đang lưu bản ghi…'
      : isRecording ? 'Bấm nút để dừng khi trả lời xong'
        : recorder.status === 'recorded' ? 'Nghe lại, hoặc bấm nút để ghi lại'
          : 'Bấm vào micro để bắt đầu ghi âm'
  const orbLabel = isRecording ? 'Stop' : recorder.status === 'recorded' ? 'Record again' : 'Start Recording'

  return (
    <section className={`sr-card${isRecording ? ' is-recording' : ''}`} aria-labelledby="recording-heading">
      <div className="sr-top">
        <p className="sr-eyebrow">RECORDING STUDIO</p>
        <span className="sr-state">{state}</span>
      </div>

      <AudioVisualizer levels={recorder.levels} isActive={isRecording} />

      <div className="sr-timer" aria-label={`Thời gian nói ${formatDuration(recorder.elapsedSeconds)}`}>
        <strong className="sr-time">{formatDuration(recorder.elapsedSeconds)}{limitSeconds ? <small> / {formatDuration(limitSeconds)}</small> : null}</strong>
        <span className="sr-time-label">Speaking time</span>
        {limitSeconds ? <div className="sr-bar" role="progressbar" aria-label="Thời gian nói đã dùng" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(used)}><i style={{ width: `${used}%` }} /></div> : null}
      </div>

      <div className="sr-control">
        <button
          type="button"
          className="sr-orb"
          aria-label={orbLabel}
          disabled={isBusy}
          onClick={() => { void (isRecording ? recorder.stopRecording() : recorder.startRecording()) }}
        >
          {isBusy ? <LoaderCircle className="animate-spin" aria-hidden="true" size={30} /> : isRecording ? <Square aria-hidden="true" size={26} fill="currentColor" /> : <Mic aria-hidden="true" size={32} />}
        </button>
        <h2 id="recording-heading" className="sr-heading">{heading}</h2>
        <p className="sr-hint">{hint}</p>
      </div>

      <Button type="button" variant="outline" className="sr-playback" disabled={!recorder.recordingUrl || recorder.isPlayingBack} onClick={() => { void recorder.playRecording() }}>
        <Play aria-hidden="true" />{recorder.isPlayingBack ? 'Đang phát…' : 'Playback'}
      </Button>

      {recorder.errorMessage && <p role="alert" className="sr-error">{recorder.errorMessage}</p>}
      <p className="sr-note">Bản ghi chỉ ở trong trình duyệt hiện tại và chưa được gửi cho Examiner.</p>
    </section>
  )
}
