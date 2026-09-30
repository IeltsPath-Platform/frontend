import { ChevronLeft, ChevronRight, CirclePlay, Volume2 } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Button } from '@/components/ui/button'
import type { LessonQuizQuestion } from '@/types/lesson'

interface LessonQuizProps {
  title: string
  questions: readonly LessonQuizQuestion[]
}

export function LessonQuiz({ title, questions }: LessonQuizProps) {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [answers, setAnswers] = useState<Record<string, number>>({})
  const currentQuestion = questions[currentIndex]!
  const completedCount = useMemo(() => Object.keys(answers).length, [answers])
  const selectedChoice = answers[currentQuestion.id]
  const isLastQuestion = currentIndex === questions.length - 1

  function moveQuestion(direction: -1 | 1) {
    setCurrentIndex((current) => Math.max(0, Math.min(questions.length - 1, current + direction)))
  }

  return (
    <section className="lesson-content-card lesson-quiz" aria-labelledby="lesson-quiz-heading">
      <div className="lesson-content-heading lesson-quiz-heading"><p className="lesson-content-kicker">Homework Hub / Ngữ pháp</p><h1 id="lesson-quiz-heading">{title}</h1><div className="lesson-quiz-meta"><span>Ngữ pháp</span><span>Chọn một đáp án</span><strong>{currentIndex + 1} / {questions.length}</strong></div></div>
      <div className="lesson-audio-demo" role="group" aria-label={currentQuestion.audioLabel}>
        <span className="lesson-audio-play"><CirclePlay aria-hidden="true" size={21} /></span><div><strong>{currentQuestion.audioLabel}</strong><i><span /></i></div><Volume2 aria-hidden="true" size={17} />
      </div>
      <fieldset className="lesson-quiz-fieldset"><legend>{currentQuestion.prompt}</legend><p>Để làm bài nghe lại 1 lần, sau đó chọn đáp án đúng nhất.</p><div className="lesson-quiz-choices">{currentQuestion.choices.map((choice, index) => <button key={choice} type="button" className={`lesson-quiz-choice${selectedChoice === index ? ' is-selected' : ''}`} aria-pressed={selectedChoice === index} onClick={() => setAnswers((current) => ({ ...current, [currentQuestion.id]: index }))}><span>{String.fromCharCode(65 + index)}</span>{choice}</button>)}</div></fieldset>
      <footer className="lesson-quiz-footer"><div><Button type="button" variant="outline" disabled={currentIndex === 0} onClick={() => moveQuestion(-1)}><ChevronLeft aria-hidden="true" size={17} />Câu trước</Button><Button type="button" variant="outline" onClick={() => moveQuestion(1)} disabled={isLastQuestion}>{isLastQuestion ? 'Câu cuối' : 'Câu sau'}<ChevronRight aria-hidden="true" size={17} /></Button></div><nav className="lesson-quiz-map" aria-label="Bản đồ câu hỏi">{questions.map((question, index) => <button key={question.id} type="button" className={`${index === currentIndex ? 'is-current' : ''}${answers[question.id] !== undefined ? ' is-answered' : ''}`} aria-current={index === currentIndex ? 'step' : undefined} aria-label={`Câu ${index + 1}${answers[question.id] !== undefined ? ', đã trả lời' : ''}`} onClick={() => setCurrentIndex(index)}>{index + 1}</button>)}</nav><p role="status">Đã trả lời {completedCount}/{questions.length} câu</p></footer>
    </section>
  )
}
