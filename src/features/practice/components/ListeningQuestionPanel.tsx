import { Star } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import type { ListeningQuestion } from '@/types/practice'

interface ListeningQuestionPanelProps {
  question: ListeningQuestion
  totalQuestions: number
  answer: string
  flagged: boolean
  onAnswer: (value: string) => void
  onToggleFlag: () => void
}

export function ListeningQuestionPanel({ question, totalQuestions, answer, flagged, onAnswer, onToggleFlag }: ListeningQuestionPanelProps) {
  return (
    <section className="screen3-questions-card listening-question-panel" aria-labelledby="listening-question-heading">
      <p className="workspace-eyebrow">LISTENING QUESTION</p>
      <h1 id="listening-question-heading" className="questions-title-bold">Question {question.questionNumber} of {totalQuestions}</h1>
      <article key={question.questionNumber} className="active-question-card is-current single-question-view">
        <div className="question-label-row"><span>Complete the note</span><Button type="button" variant="ghost" size="icon" className={`flag-question-btn${flagged ? ' flagged' : ''}`} aria-label={`Đánh dấu câu ${question.questionNumber}`} aria-pressed={flagged} onClick={onToggleFlag}><Star aria-hidden="true" size={18} fill={flagged ? 'currentColor' : 'none'} /></Button></div>
        <p className="listening-question-prompt">{question.prompt}</p>
        <label className="listening-answer-label" htmlFor={`listening-answer-${question.questionNumber}`}>{question.helperText}</label>
        <Input id={`listening-answer-${question.questionNumber}`} value={answer} placeholder={question.placeholder} onChange={(event) => onAnswer(event.target.value)} />
      </article>
    </section>
  )
}
