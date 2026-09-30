import { useState } from 'react'
import { ArrowLeft, PenLine } from 'lucide-react'
import { SiteNavbar } from '@/components/SiteNavbar'
import { Textarea } from '@/components/ui/textarea'
import { CountdownTimer } from '../components/CountdownTimer'
import { WordCounter } from '../components/WordCounter'
import { WritingTaskVisual } from '../components/WritingTaskVisual'
import { MOCK_WRITING_TASK } from '@/mocks/practiceData'
import '../skill-workspaces.css'

interface WritingPageProps {
  onExit: () => void
}

export function WritingPage({ onExit }: WritingPageProps) {
  const [response, setResponse] = useState('')

  return (
    <div className="practice-workspace-root writing-workspace">
      <SiteNavbar />
      <header className="skill-page-topbar"><button type="button" className="subbar-exit-btn" onClick={onExit}><ArrowLeft aria-hidden="true" size={16} />Thoát</button><div><span className="practice-mode-badge">Writing</span><strong>{MOCK_WRITING_TASK.title}</strong></div><PenLine aria-hidden="true" size={21} /></header>
      <main className="writing-split-layout">
        <section className="writing-prompt-panel" aria-labelledby="writing-prompt-heading"><p className="workspace-eyebrow">WRITING PROMPT</p><h1 id="writing-prompt-heading">{MOCK_WRITING_TASK.title}</h1><p className="writing-instruction">{MOCK_WRITING_TASK.instruction}</p><WritingTaskVisual /></section>
        <section className="writing-editor-panel" aria-labelledby="writing-editor-heading"><div className="writing-editor-header"><div><p className="workspace-eyebrow">YOUR RESPONSE</p><h2 id="writing-editor-heading">Write your answer</h2></div><CountdownTimer initialSeconds={MOCK_WRITING_TASK.timeLimitSeconds} /></div><Textarea id="writing-response" className="writing-response-input" value={response} onChange={(event) => setResponse(event.target.value)} placeholder="Start writing your response here…" aria-describedby="writing-helper" /><div className="writing-editor-footer"><p id="writing-helper">Mục tiêu: ít nhất {MOCK_WRITING_TASK.minimumWords} từ. Bài viết chỉ được giữ trong phiên hiện tại.</p><WordCounter value={response} target={MOCK_WRITING_TASK.minimumWords} /></div></section>
      </main>
    </div>
  )
}
