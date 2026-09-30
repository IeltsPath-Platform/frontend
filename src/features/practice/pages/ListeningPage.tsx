import { useEffect, useMemo, useState } from 'react'
import { ArrowLeft, Headphones } from 'lucide-react'
import { SiteNavbar } from '@/components/SiteNavbar'
import { AudioPlayer } from '../components/AudioPlayer'
import { ListeningQuestionPanel } from '../components/ListeningQuestionPanel'
import { PracticeProgressBar } from '../components/PracticeProgressBar'
import { QuestionMap } from '../components/QuestionMap'
import { QuestionNavigation } from '../components/QuestionNavigation'
import { MOCK_LISTENING_DURATION_SECONDS, MOCK_LISTENING_QUESTIONS } from '@/mocks/practiceData'
import '../skill-workspaces.css'

interface ListeningPageProps {
  onExit: () => void
}

type PlaybackRate = 1 | 1.25 | 1.5

const LISTENING_QUESTION_NUMBERS = MOCK_LISTENING_QUESTIONS.map(({ questionNumber }) => questionNumber)

function questionAtTime(currentSeconds: number): number {
  return MOCK_LISTENING_QUESTIONS.find(({ cueStartSeconds, cueEndSeconds }) => currentSeconds >= cueStartSeconds && currentSeconds <= cueEndSeconds)?.questionNumber ?? LISTENING_QUESTION_NUMBERS.at(-1)!
}

export function ListeningPage({ onExit }: ListeningPageProps) {
  const [currentSeconds, setCurrentSeconds] = useState(0)
  const [isPlaying, setIsPlaying] = useState(false)
  const [volume, setVolume] = useState(.8)
  const [playbackRate, setPlaybackRate] = useState<PlaybackRate>(1)
  const [answers, setAnswers] = useState<Record<number, string>>({})
  const [flagged, setFlagged] = useState<Record<number, boolean>>({})

  useEffect(() => {
    if (!isPlaying) return
    const interval = window.setInterval(() => {
      setCurrentSeconds((current) => {
        const next = Math.min(MOCK_LISTENING_DURATION_SECONDS, current + playbackRate)
        if (next === MOCK_LISTENING_DURATION_SECONDS) setIsPlaying(false)
        return next
      })
    }, 1000)
    return () => window.clearInterval(interval)
  }, [isPlaying, playbackRate])

  const currentQuestion = questionAtTime(currentSeconds)

  const activeQuestion = useMemo(
    () => MOCK_LISTENING_QUESTIONS.find(({ questionNumber }) => questionNumber === currentQuestion) ?? MOCK_LISTENING_QUESTIONS[0]!,
    [currentQuestion],
  )
  const completedCount = LISTENING_QUESTION_NUMBERS.filter((questionNumber) => Boolean(answers[questionNumber])).length

  function selectQuestion(questionNumber: number) {
    const question = MOCK_LISTENING_QUESTIONS.find((item) => item.questionNumber === questionNumber)
    if (!question) return
    setCurrentSeconds(question.cueStartSeconds)
    setIsPlaying(false)
  }

  function moveQuestion(direction: -1 | 1) {
    const nextQuestion = LISTENING_QUESTION_NUMBERS[LISTENING_QUESTION_NUMBERS.indexOf(currentQuestion) + direction]
    if (nextQuestion !== undefined) selectQuestion(nextQuestion)
  }

  return (
    <div className="practice-workspace-root listening-workspace">
      <SiteNavbar />
      <div className="screen3-sub-topbar">
        <button type="button" className="subbar-exit-btn" aria-label="Thoát bài nghe" onClick={onExit}><ArrowLeft aria-hidden="true" size={16} /><span>Thoát</span></button>
        <div className="practice-workspace-status"><div className="practice-mode-timer"><span className="practice-mode-badge">Listening</span><span className="listening-part-label">Section 1 · Practice</span></div><PracticeProgressBar completed={completedCount} total={LISTENING_QUESTION_NUMBERS.length} /></div>
        <span className="listening-topbar-icon" aria-label="Bài nghe"><Headphones aria-hidden="true" size={20} /></span>
      </div>
      <main className="skill-workspace-grid listening-workspace-grid">
        <div className="workspace-left-column">
          <QuestionMap questionNumbers={LISTENING_QUESTION_NUMBERS} answers={answers} flagged={flagged} currentQuestion={currentQuestion} onSelectQuestion={selectQuestion}
            navigation={<QuestionNavigation questionNumbers={LISTENING_QUESTION_NUMBERS} currentQuestion={currentQuestion} onPrevious={() => moveQuestion(-1)} onNext={() => moveQuestion(1)} />} />
        </div>
        <section className="listening-main-panel" aria-labelledby="listening-title">
          <AudioPlayer currentSeconds={currentSeconds} durationSeconds={MOCK_LISTENING_DURATION_SECONDS} isPlaying={isPlaying} volume={volume} playbackRate={playbackRate} onTogglePlayback={() => setIsPlaying((current) => !current)} onSeek={(seconds) => setCurrentSeconds(seconds)} onVolumeChange={setVolume} onPlaybackRateChange={setPlaybackRate} />
          <div className="listening-instruction-card"><p className="workspace-eyebrow">SECTION 1</p><h1 id="listening-title">Student services enquiry</h1><p>Listen to a conversation between a student and a university adviser. The question map follows the current point in the audio; you can also select any question to review its cue.</p></div>
        </section>
        <ListeningQuestionPanel question={activeQuestion} totalQuestions={LISTENING_QUESTION_NUMBERS.length} answer={answers[currentQuestion] ?? ''} flagged={Boolean(flagged[currentQuestion])} onAnswer={(value) => setAnswers((current) => ({ ...current, [currentQuestion]: value }))} onToggleFlag={() => setFlagged((current) => ({ ...current, [currentQuestion]: !current[currentQuestion] }))} />
      </main>
    </div>
  )
}
