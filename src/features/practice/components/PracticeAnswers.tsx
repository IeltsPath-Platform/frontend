import { CheckCircle2, Star } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { MOCK_HEADINGS, MOCK_QUESTIONS } from '@/mocks/practiceData'

interface PracticeAnswersProps {
  answers: Record<number, string>
  flagged: Record<number, boolean>
  currentQuestion: number
  transitionDirection: 'forward' | 'backward'
  onAnswer: (question: number, value: string) => void
  onToggleFlag: (question: number) => void
}

export function PracticeAnswers({ answers, flagged, currentQuestion, transitionDirection, onAnswer, onToggleFlag }: PracticeAnswersProps) {
  const [visibleQuestionNumber, setVisibleQuestionNumber] = useState(currentQuestion)
  const [transitionPhase, setTransitionPhase] = useState<'enter' | 'exit'>('enter')
  const question = MOCK_QUESTIONS.find(({ questionNumber }) => questionNumber === visibleQuestionNumber) ?? MOCK_QUESTIONS[0]!
  const selectedAnswer = answers[question.questionNumber] ?? ''
  const isAnswered = Boolean(selectedAnswer)

  useEffect(() => {
    if (currentQuestion === visibleQuestionNumber) return
    const exitTimer = window.setTimeout(() => {
      setTransitionPhase('exit')
    }, 0)
    const transitionTimer = window.setTimeout(() => {
      setVisibleQuestionNumber(currentQuestion)
      setTransitionPhase('enter')
    }, 140)
    return () => {
      window.clearTimeout(exitTimer)
      window.clearTimeout(transitionTimer)
    }
  }, [currentQuestion, visibleQuestionNumber])

  return (
    <section className="screen3-questions-card" aria-labelledby="questions-heading">
      <h2 id="questions-heading" className="questions-title-bold">Question {question.questionNumber} of {MOCK_QUESTIONS.length}</h2>
      <p className="questions-desc-text">Choose the correct heading for each paragraph from the list below.</p>
      <div className="list-of-heading-box">
        <h3 className="mb-3 text-sm font-bold">List of Headings</h3>
        <ul className="heading-chips-flow">
          {MOCK_HEADINGS.map((heading) => <li key={heading.id} className={`heading-chip-btn ${Object.values(answers).includes(heading.roman) ? 'used' : ''}`}><strong>{heading.roman}</strong><span>{heading.title}</span></li>)}
        </ul>
      </div>
      <div className="questions-selector-list" aria-live="polite">
        <article id={`question-${question.questionNumber}`} key={`${question.questionNumber}-${selectedAnswer || 'unanswered'}`} tabIndex={-1} className={`active-question-card is-current single-question-view question-transition-${transitionPhase} question-transition-${transitionDirection}${isAnswered ? ' is-answered' : ''}`} aria-hidden={transitionPhase === 'exit'}>
          <div className="question-label-row">
            <div className="question-label-copy"><label id={`question-label-${question.questionNumber}`} htmlFor={`answer-${question.questionNumber}`}>{question.questionNumber}. Paragraph {question.paragraphLetter}</label>{isAnswered && <span className="answer-confirmation"><CheckCircle2 aria-hidden="true" size={15} />Đã chọn</span>}</div>
            <Button type="button" variant="ghost" size="icon" className={`flag-question-btn ${flagged[question.questionNumber] ? 'flagged' : ''}`}
              aria-label={`Đánh dấu câu ${question.questionNumber}`} aria-pressed={!!flagged[question.questionNumber]} onClick={() => onToggleFlag(question.questionNumber)}><Star size={18} aria-hidden="true" fill={flagged[question.questionNumber] ? 'currentColor' : 'none'} /></Button>
          </div>
          <Select value={selectedAnswer || 'unanswered'} onValueChange={(value) => onAnswer(question.questionNumber, value === 'unanswered' ? '' : value)}>
            <SelectTrigger id={`answer-${question.questionNumber}`} className="question-select-clean" aria-labelledby={`question-label-${question.questionNumber}`}><SelectValue placeholder="Chọn đáp án" /></SelectTrigger>
            <SelectContent position="popper" align="start" collisionPadding={12} className="answer-options">
              <SelectItem value="unanswered">Chưa chọn đáp án</SelectItem>
              {MOCK_HEADINGS.map((heading) => <SelectItem key={heading.id} value={heading.roman}>{heading.roman} {heading.title}</SelectItem>)}
            </SelectContent>
          </Select>
        </article>
      </div>
      <p className="mt-4 text-sm text-muted-foreground" role="status">Đã chọn {Object.values(answers).filter(Boolean).length}/{MOCK_QUESTIONS.length} câu</p>
    </section>
  )
}
