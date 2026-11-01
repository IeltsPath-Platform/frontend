import { useState } from 'react'
import { ArrowLeft, Radio } from 'lucide-react'
import { SiteNavbar } from '@/components/SiteNavbar'
import { SpeakingQuestionCard } from '../speaking/SpeakingQuestionCard'
import { SpeakingRecorder } from '../speaking/SpeakingRecorder'
import type { SpeakingTask } from '../speaking/speakingApi'
import '../skill-workspaces.css'
import '../speaking/speaking-workspace.css'

interface SpeakingPageProps {
  task: SpeakingTask
  onExit: () => void
  /** Where the next part of a full test starts; null on the last part or when only one part was chosen. */
  nextPartPath?: string | null
}

/** One part of a Speaking test: the questions come from the library, the learner records an answer to each. */
export function SpeakingPage({ task, onExit, nextPartPath = null }: SpeakingPageProps) {
  const [index, setIndex] = useState(0)
  const total = task.questions.length
  const question = task.questions[Math.min(index, total - 1)]

  return (
    <div className="practice-workspace-root speaking-workspace">
      <SiteNavbar />
      <header className="skill-page-topbar">
        <button type="button" className="subbar-exit-btn" onClick={onExit}><ArrowLeft aria-hidden="true" size={16} />Thoát</button>
        <div><span className="practice-mode-badge">Speaking</span><strong>{task.title}</strong></div>
        <Radio aria-hidden="true" size={21} />
      </header>
      <main className="speaking-stage">
        {question ? (
          <>
            <SpeakingQuestionCard
              task={task}
              question={question}
              index={index}
              total={total}
              nextPartPath={nextPartPath}
              onPrevious={() => setIndex((current) => current - 1)}
              onNext={() => setIndex((current) => current + 1)}
            />
            {/* The slot stays mounted between questions, so only the first arrival is animated. */}
            <div className="sr-slot"><SpeakingRecorder key={question.questionVersionId} limitSeconds={question.durationSeconds} /></div>
          </>
        ) : (
          <section className="sq-card"><h1 className="sq-title">Phần này chưa có câu hỏi</h1></section>
        )}
      </main>
    </div>
  )
}
