import { useEffect, useMemo, useState } from "react"
import { BookOpenText, CheckCircle2, Flag, Headphones, Mic, PenLine } from "lucide-react"
import { useNavigate, useParams } from "react-router-dom"
import { HighlightText } from "@/components/common/HighlightText"
import { ExamLayout } from "@/components/layouts/ExamLayout"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { CATALOG, REVIEW_KEYS } from "@/lib/mock/catalog"
import { LISTENING_SECTIONS, READING_PASSAGES, SPEAKING_PROMPTS, TEST_BANK, WRITING_TASKS } from "@/lib/mock/exams"
import type { Question } from "@/types/exam"

function formatTime(seconds: number) {
  const minutes = Math.floor(seconds / 60).toString().padStart(2, "0")
  const remainingSeconds = (seconds % 60).toString().padStart(2, "0")
  return `${minutes}:${remainingSeconds}`
}

function countWords(value: string) {
  return value.trim() ? value.trim().split(/\s+/).length : 0
}

export function ExamTestingPage() {
  const { examId = "" } = useParams()
  const navigate = useNavigate()
  const catalogExam = CATALOG.find((item) => item.id === examId)
  const exam = TEST_BANK.find((item) => item.id === examId) ?? TEST_BANK[0]
  const skill = catalogExam?.skill ?? exam.skill
  const title = catalogExam?.title ?? exam.title
  const questions = useMemo(() => {
    const source = skill === "LISTENING"
      ? LISTENING_SECTIONS.flatMap((section) => section.questions)
      : READING_PASSAGES.flatMap((passage) => passage.questions)
    if (skill === "LISTENING") return source
    return source.map((question) => {
      const review = REVIEW_KEYS.find((item) => item.number === question.number)
      if (!review) return question
      return { ...question, prompt: review.prompt, options: ["TRUE", "FALSE", "NOT GIVEN"], answer: review.answer }
    })
  }, [skill])
  const [secondsLeft, setSecondsLeft] = useState(skill === "SPEAKING" ? 120 : skill === "WRITING" ? 60 * 60 : skill === "LISTENING" ? 40 * 60 : 60 * 60)
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [flagged, setFlagged] = useState<Set<number>>(new Set())
  const [isSubmitted, setIsSubmitted] = useState(false)
  const [essays, setEssays] = useState<Record<string, string>>({})
  const [speakingPart, setSpeakingPart] = useState(0)
  const [speakingLeft, setSpeakingLeft] = useState(120)
  const [speakingOn, setSpeakingOn] = useState(false)

  useEffect(() => {
    const interval = window.setInterval(() => setSecondsLeft((current) => Math.max(0, current - 1)), 1000)
    return () => window.clearInterval(interval)
  }, [])

  useEffect(() => {
    if (!speakingOn) return undefined
    const interval = window.setInterval(() => setSpeakingLeft((current) => {
      if (current <= 1) {
        setSpeakingOn(false)
        return 0
      }
      return current - 1
    }), 1000)
    return () => window.clearInterval(interval)
  }, [speakingOn])

  const updateAnswer = (question: Question, value: string) => setAnswers((current) => ({ ...current, [String(question.number)]: value }))
  const toggleFlag = (number: number) => setFlagged((current) => {
    const next = new Set(current)
    if (next.has(number)) next.delete(number)
    else next.add(number)
    return next
  })

  const confirmSubmit = () => {
    const words = Object.values(essays).reduce((total, essay) => total + countWords(essay), 0)
    window.sessionStorage.setItem("ieltspath-attempt", JSON.stringify({ examId, answers, words }))
    const done = JSON.parse(window.localStorage.getItem("ieltspath-done") ?? "[]") as string[]
    if (!done.includes(examId)) window.localStorage.setItem("ieltspath-done", JSON.stringify([...done, examId]))
    navigate(`/exams/${examId}/result`)
  }

  const playSection = (transcript: string) => {
    if (!window.speechSynthesis) return
    window.speechSynthesis.cancel()
    const utterance = new SpeechSynthesisUtterance(transcript)
    utterance.lang = "en-GB"
    utterance.rate = 0.92
    window.speechSynthesis.speak(utterance)
  }

  const answeredCount = Object.keys(answers).length

  return (
    <ExamLayout title={title} timeRemaining={formatTime(secondsLeft)} onSubmit={() => setIsSubmitted(true)}>
      {skill === "WRITING" ? (
        <main className="exam-workspace exam-workspace--single" id="main-content" tabIndex={-1}>
          <section className="exam-workspace__answers">
            <div className="exam-section-label"><PenLine aria-hidden="true" /><span>Writing · 60 phút</span></div>
            {WRITING_TASKS.map((task) => {
              const words = countWords(essays[task.id] ?? "")
              return (
                <article className="passage" key={task.id}>
                  <h1>{task.title}</h1>
                  <p>{task.prompt}</p>
                  <label className="question__input">Bài viết
                    <textarea value={essays[task.id] ?? ""} onChange={(event) => setEssays((current) => ({ ...current, [task.id]: event.target.value }))} rows={10} />
                  </label>
                  <p>{words} từ · tối thiểu {task.minimumWords}</p>
                </article>
              )
            })}
          </section>
        </main>
      ) : null}

      {skill === "SPEAKING" ? (
        <main className="exam-workspace exam-workspace--single" id="main-content" tabIndex={-1}>
          <section className="exam-workspace__answers">
            <div className="exam-section-label"><Mic aria-hidden="true" /><span>Speaking · {formatTime(speakingLeft)}</span></div>
            <div className="chip-row" role="tablist" aria-label="Phần nói">
              {SPEAKING_PROMPTS.map((prompt, index) => (
                <button key={prompt.part} type="button" role="tab" aria-selected={speakingPart === index} onClick={() => { setSpeakingPart(index); setSpeakingLeft(prompt.part === 2 ? 120 : 60); setSpeakingOn(false) }}>Part {prompt.part}</button>
              ))}
            </div>
            <article className="passage">
              <h1>{SPEAKING_PROMPTS[speakingPart].topic}</h1>
              <ul>{SPEAKING_PROMPTS[speakingPart].prompts.map((prompt) => <li key={prompt}>{prompt}</li>)}</ul>
              <div className="hero__actions">
                <Button type="button" onClick={() => setSpeakingOn(true)}>Bắt đầu tính giờ</Button>
                <Button type="button" variant="outline" onClick={() => playSection(SPEAKING_PROMPTS[speakingPart].prompts.join(" "))}>Nghe đề</Button>
              </div>
              <label className="question__input">Ghi ý chính sau khi nói
                <textarea value={answers.notes ?? ""} onChange={(event) => setAnswers((current) => ({ ...current, notes: event.target.value }))} rows={5} />
              </label>
            </article>
          </section>
        </main>
      ) : null}

      {skill === "LISTENING" ? (
        <main className="exam-workspace" id="main-content" tabIndex={-1}>
          <section className="exam-workspace__source">
            <div className="exam-section-label"><Headphones aria-hidden="true" /><span>Listening · 40 phút</span></div>
            {LISTENING_SECTIONS.map((section) => (
              <article className="passage" key={section.id}>
                <h1>{section.title}</h1>
                <p>{section.audioLabel}</p>
                <Button type="button" variant="outline" onClick={() => playSection(section.transcript)}>Phát audio</Button>
                <p>{section.transcript}</p>
              </article>
            ))}
          </section>
          <QuestionColumn questions={questions} answers={answers} flagged={flagged} onAnswer={updateAnswer} onFlag={toggleFlag} />
        </main>
      ) : null}

      {skill !== "WRITING" && skill !== "SPEAKING" && skill !== "LISTENING" ? (
        <main className="exam-workspace" id="main-content" tabIndex={-1}>
          <section className="exam-workspace__source" aria-labelledby="passage-title">
            <div className="exam-section-label"><BookOpenText aria-hidden="true" /><span>Reading · 60 phút</span></div>
            {READING_PASSAGES.map((passage, index) => (
              <article className="passage" key={passage.id}>
                <p className="eyebrow">Passage {index + 1}</p>
                <h1 id={index === 0 ? "passage-title" : undefined}>{passage.title.replace(`Passage ${index + 1} — `, "")}</h1>
                <HighlightText content={passage.content} />
              </article>
            ))}
          </section>
          <QuestionColumn questions={questions} answers={answers} flagged={flagged} onAnswer={updateAnswer} onFlag={toggleFlag} />
        </main>
      ) : null}

      {skill === "LISTENING" || skill === "READING" || skill === "FULL_TEST" ? (
        <nav className="question-palette" aria-label="Đi tới câu hỏi">
          <p>Tiến độ · {answeredCount} câu đã làm</p>
          <div>{questions.map((question) => <a className={answers[String(question.number)] ? "is-answered" : flagged.has(question.number) ? "is-flagged" : ""} href={`#${question.id}`} key={question.id}>{question.number}</a>)}</div>
        </nav>
      ) : null}

      <Dialog open={isSubmitted} onOpenChange={setIsSubmitted}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nộp bài và xem lời giải?</DialogTitle>
            <DialogDescription>Bạn đã trả lời {answeredCount} câu. Sau khi nộp, trang kết quả hiện band ước lượng và giải thích các câu đối chiếu.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsSubmitted(false)}>Tiếp tục làm</Button>
            <Button onClick={confirmSubmit}><CheckCircle2 aria-hidden="true" /> Nộp bài</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </ExamLayout>
  )
}

function QuestionColumn({ questions, answers, flagged, onAnswer, onFlag }: {
  questions: Question[]
  answers: Record<string, string>
  flagged: Set<number>
  onAnswer: (question: Question, value: string) => void
  onFlag: (number: number) => void
}) {
  const groups = questions.reduce<Record<string, Question[]>>((groupsByPrefix, question) => {
    const prefix = question.id.split("-").slice(0, 2).join("-")
    groupsByPrefix[prefix] = [...(groupsByPrefix[prefix] ?? []), question]
    return groupsByPrefix
  }, {})

  return (
    <section className="exam-workspace__answers" aria-label="Câu trả lời">
      <div className="answer-panel__heading"><div><p className="eyebrow">Câu hỏi</p><h2>{questions.length} câu</h2></div><Badge variant="secondary">{Object.keys(answers).length} đã làm</Badge></div>
      {Object.entries(groups).map(([groupId, group]) => (
        <section className="question-group" key={groupId}>
          {group.map((question) => (
            <fieldset className="question" id={question.id} key={question.id}>
              <legend><span>{question.number}</span>{question.prompt}</legend>
              <Button className="question__flag" type="button" variant={flagged.has(question.number) ? "secondary" : "ghost"} size="icon-sm" onClick={() => onFlag(question.number)} aria-label={`Đánh dấu câu ${question.number}`}><Flag aria-hidden="true" /></Button>
              {question.options ? (
                <div className="question__options">
                  {question.options.map((option) => {
                    const value = option.includes(". ") ? option.slice(0, 1) : option
                    return (
                      <label key={option}>
                        <input type="radio" name={question.id} value={value} checked={answers[String(question.number)] === value} onChange={() => onAnswer(question, value)} />
                        {option}
                      </label>
                    )
                  })}
                </div>
              ) : (
                <label className="question__input"><span>Đáp án</span><Input value={answers[String(question.number)] ?? ""} onChange={(event) => onAnswer(question, event.target.value)} /></label>
              )}
            </fieldset>
          ))}
        </section>
      ))}
    </section>
  )
}
