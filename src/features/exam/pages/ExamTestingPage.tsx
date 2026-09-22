import { useEffect, useMemo, useState } from "react"
import { BookOpenText, CheckCircle2, Flag, Headphones, Volume2 } from "lucide-react"
import { useParams } from "react-router-dom"
import { HighlightText } from "@/components/common/HighlightText"
import { ExamLayout } from "@/components/layouts/ExamLayout"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { READING_PASSAGES, TEST_BANK } from "@/lib/mock/exams"
import type { Question } from "@/types/exam"

function formatTime(seconds: number) {
  const minutes = Math.floor(seconds / 60).toString().padStart(2, "0")
  const remainingSeconds = (seconds % 60).toString().padStart(2, "0")
  return `${minutes}:${remainingSeconds}`
}

export function ExamTestingPage() {
  const { examId } = useParams()
  const exam = TEST_BANK.find((item) => item.id === examId) ?? TEST_BANK[0]
  const questions = useMemo(() => READING_PASSAGES.flatMap((passage) => passage.questions), [])
  const [secondsLeft, setSecondsLeft] = useState(60 * 60)
  const [answers, setAnswers] = useState<Record<number, string>>({})
  const [flagged, setFlagged] = useState<Set<number>>(new Set())
  const [isSubmitted, setIsSubmitted] = useState(false)

  useEffect(() => {
    const interval = window.setInterval(() => setSecondsLeft((current) => Math.max(0, current - 1)), 1000)
    return () => window.clearInterval(interval)
  }, [])

  const updateAnswer = (question: Question, value: string) => setAnswers((current) => ({ ...current, [question.number]: value }))
  const toggleFlag = (number: number) => setFlagged((current) => {
    const next = new Set(current)
    if (next.has(number)) {
      next.delete(number)
    } else {
      next.add(number)
    }
    return next
  })

  return (
    <ExamLayout title={exam.title} timeRemaining={formatTime(secondsLeft)} onSubmit={() => setIsSubmitted(true)}>
      <main className="exam-workspace" id="main-content" tabIndex={-1}>
        <section className="exam-workspace__source" aria-labelledby="passage-title">
          <div className="exam-section-label"><BookOpenText aria-hidden="true" /><span>Reading · 60 minutes</span></div>
          {READING_PASSAGES.map((passage, index) => (
            <article className="passage" key={passage.id}>
              <p className="eyebrow">Passage {index + 1}</p>
              <h1 id={index === 0 ? "passage-title" : undefined}>{passage.title.replace(`Passage ${index + 1} — `, "")}</h1>
              <HighlightText content={passage.content} />
            </article>
          ))}
          <aside className="exam-audio-preview" aria-label="Listening mock preview"><Headphones aria-hidden="true" /><div><strong>Listening mock tracks included</strong><p>Four original transcripts and 40 questions are available in this test bank.</p></div><Button variant="outline" size="sm"><Volume2 aria-hidden="true" /> Xem transcript</Button></aside>
        </section>

        <section className="exam-workspace__answers" aria-label="Câu trả lời">
          <div className="answer-panel__heading"><div><p className="eyebrow">Câu hỏi</p><h2>Questions 1–40</h2></div><Badge variant="secondary">{Object.keys(answers).length}/40 đã làm</Badge></div>
          {READING_PASSAGES.map((passage) => (
            <section className="question-group" key={passage.id} aria-labelledby={`${passage.id}-questions`}>
              <h3 id={`${passage.id}-questions`}>{passage.title}</h3>
              {passage.questions.map((question) => (
                <fieldset className="question" id={question.id} key={question.id}>
                  <legend><span>{question.number}</span>{question.prompt}</legend>
                  <Button className="question__flag" type="button" variant={flagged.has(question.number) ? "secondary" : "ghost"} size="icon-sm" onClick={() => toggleFlag(question.number)} aria-label={`Đánh dấu câu ${question.number}`}><Flag aria-hidden="true" /></Button>
                  {question.options ? <div className="question__options">{question.options.map((option) => <label key={option}><input type="radio" name={question.id} value={option.slice(0, 1)} checked={answers[question.number] === option.slice(0, 1)} onChange={() => updateAnswer(question, option.slice(0, 1))} />{option}</label>)}</div> : <label className="question__input"><span>Đáp án</span><Input value={answers[question.number] ?? ""} onChange={(event) => updateAnswer(question, event.target.value)} /></label>}
                </fieldset>
              ))}
            </section>
          ))}
        </section>
      </main>
      <nav className="question-palette" aria-label="Đi tới câu hỏi">
        <p>Tiến độ</p>
        <div>{questions.map((question) => <a className={answers[question.number] ? "is-answered" : flagged.has(question.number) ? "is-flagged" : ""} href={`#${question.id}`} key={question.id} aria-label={`Câu ${question.number}${answers[question.number] ? ", đã trả lời" : ""}${flagged.has(question.number) ? ", cần xem lại" : ""}`}>{question.number}</a>)}</div>
        <p className="question-palette__legend"><span className="palette-dot" /> Chưa làm <span className="palette-dot palette-dot--answered" /> Đã làm <span className="palette-dot palette-dot--flagged" /> Cần xem lại</p>
      </nav>
      <Dialog open={isSubmitted} onOpenChange={setIsSubmitted}>
        <DialogContent><DialogHeader><DialogTitle>{Object.keys(answers).length < 40 ? "Bạn vẫn còn câu chưa làm" : "Sẵn sàng nộp bài?"}</DialogTitle><DialogDescription>Bài này có {Object.keys(answers).length} trên 40 câu đã trả lời. Sau khi nộp, bạn sẽ chuyển đến phần tổng hợp kết quả mock.</DialogDescription></DialogHeader><DialogFooter><Button variant="outline" onClick={() => setIsSubmitted(false)}>Tiếp tục làm bài</Button><Button onClick={() => setIsSubmitted(false)}><CheckCircle2 aria-hidden="true" /> Xác nhận nộp</Button></DialogFooter></DialogContent>
      </Dialog>
    </ExamLayout>
  )
}
