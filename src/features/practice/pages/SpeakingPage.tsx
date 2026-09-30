import { ArrowLeft, CircleStop, Mic, Play, Radio } from 'lucide-react'
import { SiteNavbar } from '@/components/SiteNavbar'
import { Button } from '@/components/ui/button'
import { AudioVisualizer } from '../components/AudioVisualizer'
import { MOCK_SPEAKING_CUE } from '@/mocks/practiceData'
import { useAudioRecorder } from '../hooks/useAudioRecorder'
import { formatDuration } from '../lib/time'
import '../skill-workspaces.css'

interface SpeakingPageProps {
  onExit: () => void
}

export function SpeakingPage({ onExit }: SpeakingPageProps) {
  const recorder = useAudioRecorder()
  const isRecording = recorder.status === 'recording'
  const isBusy = recorder.status === 'requesting' || recorder.status === 'processing'

  return (
    <div className="practice-workspace-root speaking-workspace">
      <SiteNavbar />
      <header className="skill-page-topbar"><button type="button" className="subbar-exit-btn" onClick={onExit}><ArrowLeft aria-hidden="true" size={16} />Thoát</button><div><span className="practice-mode-badge">Speaking</span><strong>{MOCK_SPEAKING_CUE.part}</strong></div><Radio aria-hidden="true" size={21} /></header>
      <main className="speaking-focus-layout">
        <section className="speaking-cue-card" aria-labelledby="speaking-cue-heading"><p className="workspace-eyebrow">{MOCK_SPEAKING_CUE.part}</p><h1 id="speaking-cue-heading">{MOCK_SPEAKING_CUE.title}</h1><p>You have {MOCK_SPEAKING_CUE.preparationSeconds} seconds to prepare and should speak for up to {Math.floor(MOCK_SPEAKING_CUE.speakingSeconds / 60)} minutes.</p><ul>{MOCK_SPEAKING_CUE.prompts.map((prompt) => <li key={prompt}>{prompt}</li>)}</ul></section>
        <section className="recording-interface" aria-labelledby="recording-heading"><div className={`recording-microphone${isRecording ? ' is-recording' : ''}`}><Mic aria-hidden="true" size={52} /></div><p className="workspace-eyebrow">RECORDING STUDIO</p><h2 id="recording-heading">{isRecording ? 'Microphone is live' : recorder.status === 'recorded' ? 'Your recording is ready' : 'Ready when you are'}</h2><AudioVisualizer levels={recorder.levels} isActive={isRecording} /><div className="speaking-timer" aria-label={`Thời gian nói ${formatDuration(recorder.elapsedSeconds)}`}><span>Speaking time</span><strong>{formatDuration(recorder.elapsedSeconds)}</strong></div><div className="recording-actions"><Button type="button" className="recording-start-button" disabled={isRecording || isBusy} onClick={() => { void recorder.startRecording() }}><Mic aria-hidden="true" />{recorder.status === 'requesting' ? 'Đang xin quyền…' : 'Start Recording'}</Button><Button type="button" variant="outline" disabled={!isRecording} onClick={recorder.stopRecording}><CircleStop aria-hidden="true" />{recorder.status === 'processing' ? 'Đang xử lý…' : 'Stop'}</Button><Button type="button" variant="outline" disabled={!recorder.recordingUrl || recorder.isPlayingBack} onClick={() => { void recorder.playRecording() }}><Play aria-hidden="true" />{recorder.isPlayingBack ? 'Đang phát…' : 'Playback'}</Button></div>{recorder.errorMessage && <p role="alert" className="recording-error">{recorder.errorMessage}</p>}<p className="recording-privacy-note">Bản ghi chỉ ở trong trình duyệt hiện tại và chưa được gửi cho Mentor.</p></section>
      </main>
    </div>
  )
}
