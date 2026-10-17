import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, CircleStop, Mic, Play, Radio } from 'lucide-react'
import { SiteNavbar } from '@/components/SiteNavbar'
import { Button } from '@/components/ui/button'
import { AudioVisualizer } from '../components/AudioVisualizer'
import { useAudioRecorder } from '../hooks/useAudioRecorder'
import { formatDuration } from '../lib/time'
import { parseCueCard, speakingLimit } from '../speaking/speakingCue'
import type { SpeakingTask } from '../speaking/speakingApi'
import '../skill-workspaces.css'

interface SpeakingPageProps {
  task: SpeakingTask
  onExit: () => void
  /** Where the next part of a full test starts; null on the last part or when only one part was chosen. */
  nextPartPath?: string | null
}

/** The recorder of one question; a new question mounts a new recorder, so a recording never carries over. */
function RecordingStudio() {
  const recorder = useAudioRecorder()
  const isRecording = recorder.status === 'recording'
  const isBusy = recorder.status === 'requesting' || recorder.status === 'processing'

  return (
    <section className="recording-interface" aria-labelledby="recording-heading"><div className={`recording-microphone${isRecording ? ' is-recording' : ''}`}><Mic aria-hidden="true" size={52} /></div><p className="workspace-eyebrow">RECORDING STUDIO</p><h2 id="recording-heading">{isRecording ? 'Microphone is live' : recorder.status === 'recorded' ? 'Your recording is ready' : 'Ready when you are'}</h2><AudioVisualizer levels={recorder.levels} isActive={isRecording} /><div className="speaking-timer" aria-label={`Thời gian nói ${formatDuration(recorder.elapsedSeconds)}`}><span>Speaking time</span><strong>{formatDuration(recorder.elapsedSeconds)}</strong></div><div className="recording-actions"><Button type="button" className="recording-start-button" disabled={isRecording || isBusy} onClick={() => { void recorder.startRecording() }}><Mic aria-hidden="true" />{recorder.status === 'requesting' ? 'Đang xin quyền…' : 'Start Recording'}</Button><Button type="button" variant="outline" disabled={!isRecording} onClick={recorder.stopRecording}><CircleStop aria-hidden="true" />{recorder.status === 'processing' ? 'Đang xử lý…' : 'Stop'}</Button><Button type="button" variant="outline" disabled={!recorder.recordingUrl || recorder.isPlayingBack} onClick={() => { void recorder.playRecording() }}><Play aria-hidden="true" />{recorder.isPlayingBack ? 'Đang phát…' : 'Playback'}</Button></div>{recorder.errorMessage && <p role="alert" className="recording-error">{recorder.errorMessage}</p>}<p className="recording-privacy-note">Bản ghi chỉ ở trong trình duyệt hiện tại và chưa được gửi cho Mentor.</p></section>
  )
}

/** One part of a Speaking test: the questions come from the library, the learner records an answer to each. */
export function SpeakingPage({ task, onExit, nextPartPath = null }: SpeakingPageProps) {
  const [index, setIndex] = useState(0)
  const question = task.questions[Math.min(index, task.questions.length - 1)]
  const total = task.questions.length
  const cue = question ? parseCueCard(question.prompt) : { topic: '', points: [] }
  const isLast = index >= total - 1

  return (
    <div className="practice-workspace-root speaking-workspace">
      <SiteNavbar />
      <header className="skill-page-topbar"><button type="button" className="subbar-exit-btn" onClick={onExit}><ArrowLeft aria-hidden="true" size={16} />Thoát</button><div><span className="practice-mode-badge">Speaking</span><strong>{task.title}</strong></div><Radio aria-hidden="true" size={21} /></header>
      <main className="speaking-focus-layout">
        {question ? (
          <section className="speaking-cue-card" aria-labelledby="speaking-cue-heading">
            <p className="workspace-eyebrow">{`Speaking Part ${task.partNo ?? ''}`.trim()}{total > 1 ? ` · Question ${index + 1} / ${total}` : ''}</p>
            <h1 id="speaking-cue-heading">{cue.topic}</h1>
            {task.instructions && <p>{task.instructions}</p>}
            {question.durationSeconds ? <p>{`You should speak for up to ${speakingLimit(question.durationSeconds)}.`}</p> : null}
            {cue.points.length > 0 && <><p>You should say:</p><ul>{cue.points.map((point) => <li key={point}>{point}</li>)}</ul></>}
            {total > 1 && (
              <nav className="speaking-question-nav" aria-label="Câu hỏi">
                <Button type="button" variant="outline" disabled={index === 0} onClick={() => setIndex((current) => current - 1)}>Câu trước</Button>
                <Button type="button" variant="outline" disabled={isLast} onClick={() => setIndex((current) => current + 1)}>Câu sau</Button>
              </nav>
            )}
            {isLast && nextPartPath && <p className="speaking-next-part"><Link to={nextPartPath}>Sang phần tiếp theo</Link></p>}
          </section>
        ) : (
          <section className="speaking-cue-card"><h1>Phần này chưa có câu hỏi</h1></section>
        )}
        <RecordingStudio key={question?.questionVersionId ?? 'none'} />
      </main>
    </div>
  )
}
