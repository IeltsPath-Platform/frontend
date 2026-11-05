import { useEffect } from 'react'
import { LoaderCircle, Mic, Play, Square } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { AudioVisualizer } from '../components/AudioVisualizer'
import { useAudioRecorder } from '../hooks/useAudioRecorder'
import { formatDuration } from '../lib/time'
import type { SavedRecording } from './speakingSession'

/** A recording can be stopped only after this long, so a stray tap does not leave an empty answer. */
export const MIN_ANSWER_SECONDS = 3

/**
 * The recorder of one question; a new question mounts a new recorder, so a recording never carries over. A question has no
 * time limit: the clock counts up, and only the part's own time (`locked` once it is over) can end an answer.
 * `onStart` runs just before recording begins, so the examiner's voice can be silenced and not recorded. A recording made
 * earlier for the question (`saved`) is shown ready to play, and each new one goes to `onSaved`.
 */
export function SpeakingRecorder({ saved, onSaved, onStart, locked = false }: {
  saved?: SavedRecording | null
  onSaved?: (recording: SavedRecording) => void
  onStart?: () => void
  /** The part's time is over: a recording in progress is stopped and no new one can start. */
  locked?: boolean
}) {
  const recorder = useAudioRecorder({ saved, onSaved })
  const isRecording = recorder.status === 'recording'
  const isBusy = recorder.status === 'requesting' || recorder.status === 'processing'
  const waitSeconds = isRecording && !locked ? Math.max(0, MIN_ANSWER_SECONDS - recorder.elapsedSeconds) : 0
  const { stopRecording } = recorder

  useEffect(() => {
    if (locked && isRecording) void stopRecording()
  }, [locked, isRecording, stopRecording])

  const heading = isRecording ? 'Microphone is live' : recorder.status === 'recorded' ? 'Your recording is ready' : 'Ready when you are'
  const state = isRecording ? 'Đang ghi' : isBusy ? 'Đang xử lý' : recorder.status === 'recorded' ? 'Đã ghi xong' : 'Sẵn sàng'
  const hint = recorder.status === 'requesting' ? 'Đang xin quyền dùng micro…'
    : recorder.status === 'processing' ? 'Đang lưu bản ghi…'
      : isRecording ? 'Bấm nút để dừng khi trả lời xong'
        : locked ? 'Đã hết thời gian của phần này'
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
        <strong className="sr-time">{formatDuration(recorder.elapsedSeconds)}</strong>
        <span className="sr-time-label">Speaking time</span>
      </div>

      <div className="sr-control">
        {waitSeconds > 0 && (
          <p className="sr-wait" role="status">Vui lòng đợi <strong>{waitSeconds}</strong> giây để hoàn thành</p>
        )}
        <button
          type="button"
          className="sr-orb"
          aria-label={orbLabel}
          disabled={isBusy || waitSeconds > 0 || (locked && !isRecording)}
          onClick={() => {
            if (!isRecording) onStart?.()
            void (isRecording ? recorder.stopRecording() : recorder.startRecording())
          }}
        >
          {isBusy ? <LoaderCircle className="animate-spin" aria-hidden="true" size={30} /> : isRecording ? <Square aria-hidden="true" size={26} fill="currentColor" /> : <Mic aria-hidden="true" size={32} />}
        </button>
        <h2 id="recording-heading" className="sr-heading">{heading}</h2>
        <p className="sr-hint">{hint}</p>
      </div>

      {/* Choosing here, not in the browser settings, is what lets a learner leave a virtual or muted microphone. */}
      {recorder.inputs.length > 1 && (
        <label className={`sr-mic${recorder.silent ? ' is-warn' : ''}`}>
          <span>Micro</span>
          <select
            aria-label="Micro"
            disabled={isRecording || isBusy}
            onChange={(event) => recorder.selectInput(event.target.value)}
            value={recorder.inputId}
          >
            {recorder.inputs.map((input) => <option key={input.id} value={input.id} title={input.detail}>{input.label}</option>)}
          </select>
        </label>
      )}

      {/* While it plays the same button stops it, so playback can never leave the learner without a way out. */}
      <Button type="button" variant="outline" className="sr-playback" disabled={!recorder.recordingUrl} onClick={() => { if (recorder.isPlayingBack) recorder.stopPlayback(); else void recorder.playRecording() }}>
        {recorder.isPlayingBack ? <Square aria-hidden="true" fill="currentColor" /> : <Play aria-hidden="true" />}
        {recorder.isPlayingBack ? 'Dừng phát' : 'Playback'}
      </Button>

      {recorder.silent && (
        <p role="alert" className="sr-error">
          Không thu được tiếng nói trong bản ghi này nên nghe lại sẽ im lặng.
          {recorder.inputName ? ` Micro trình duyệt đang dùng: ${recorder.inputName}.` : ''}
          {recorder.inputs.length > 1 ? ' Hãy chọn micro khác ở ô “Micro” phía trên' : ' Hãy kiểm tra micro'}
          {' '}(và bỏ tắt tiếng micro đó trong Cài đặt âm thanh của máy), rồi bấm ghi lại.
        </p>
      )}
      {recorder.errorMessage && <p role="alert" className="sr-error">{recorder.errorMessage}</p>}
      <p className="sr-note">Bản ghi chỉ ở trong trình duyệt hiện tại và chưa được gửi cho Examiner.</p>
    </section>
  )
}
