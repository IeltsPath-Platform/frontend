import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ArrowLeft, Check, RotateCcw, X } from 'lucide-react'
import { prefersReducedMotion } from '@/components/owlPoses'
import { Button } from '@/components/ui/button'
import { SiteNavbar } from '@/components/SiteNavbar'
import { OwlCoach } from '../components/OwlCoach'
import { useDeckStudyCards } from '../hooks/useDeckStudyCards'
import { getTestScoreReaction } from '../lib/owl-reactions'
import { generateTest, gradeQuestion, type AnswerSide, type StudyCard, type TestQuestion, type TestQuestionType } from '../lib/study'
import '../flashcards.css'

const TYPE_LABELS: Record<TestQuestionType, string> = { choice: 'Trắc nghiệm', truefalse: 'Đúng / Sai', written: 'Tự luận' }
type Response = string | boolean

export function TestPage() {
  const { deckId = '' } = useParams()
  const { deck, cards, error } = useDeckStudyCards(deckId)
  return (
    <div className="flashcards-page">
      <SiteNavbar />
      <main className="flashcards-shell study-mode">
        <Link to={`/flashcards/decks/${deckId}`} className="flashcards-back"><ArrowLeft size={16} aria-hidden="true" />{deck?.name ?? 'Về học phần'}</Link>
        {error && <p role="alert" className="flashcard-error">{error}</p>}
        {cards === null ? <p className="flashcards-empty">Đang tải thẻ…</p>
          : cards.length < 2 ? <p className="flashcards-empty">Cần ít nhất 2 thẻ để làm bài kiểm tra.</p>
            : <TestSession key={deckId} cards={cards} />}
      </main>
    </div>
  )
}

function TestSession({ cards }: { cards: StudyCard[] }) {
  const [count, setCount] = useState(Math.min(20, cards.length))
  const [types, setTypes] = useState<TestQuestionType[]>(['choice', 'truefalse', 'written'])
  const [answerWith, setAnswerWith] = useState<AnswerSide>('back')
  const [questions, setQuestions] = useState<TestQuestion[] | null>(null)
  const [responses, setResponses] = useState<Record<number, Response>>({})
  const [graded, setGraded] = useState(false)
  const [animatedPercent, setAnimatedPercent] = useState(0)

  const score = graded && questions ? questions.filter((question, index) => gradeQuestion(question, responses[index])).length : 0

  useEffect(() => {
    if (!graded || !questions) return undefined
    const target = Math.round((score / questions.length) * 100)
    if (prefersReducedMotion()) {
      const id = window.requestAnimationFrame(() => setAnimatedPercent(target))
      return () => window.cancelAnimationFrame(id)
    }

    const startTime = performance.now()
    const duration = 900
    let frameId: number

    const step = (now: number) => {
      const elapsed = now - startTime
      const progress = Math.min(1, elapsed / duration)
      const eased = 1 - Math.pow(1 - progress, 3)
      setAnimatedPercent(Math.round(eased * target))
      if (progress < 1) {
        frameId = requestAnimationFrame(step)
      }
    }

    frameId = requestAnimationFrame(step)
    return () => cancelAnimationFrame(frameId)
  }, [graded, score, questions])

  const toggleType = (type: TestQuestionType) =>
    setTypes((value) => value.includes(type) ? value.filter((item) => item !== type) : [...value, type])
  function start() {
    setQuestions(generateTest(cards, { count, types, answerWith }))
    setResponses({}); setGraded(false); window.scrollTo({ top: 0 })
  }
  const respond = (index: number, value: Response) => { if (!graded) setResponses((current) => ({ ...current, [index]: value })) }

  if (!questions) {
    return (
      <section className="test-setup">
        <h1>Thiết lập bài kiểm tra</h1>
        <label className="test-setup-row"><span>Số câu hỏi <small>(tối đa {cards.length})</small></span>
          <input type="number" min={1} max={cards.length} value={count}
            onChange={(event) => setCount(Math.max(1, Math.min(cards.length, Number(event.target.value) || 1)))} />
        </label>
        <div className="test-setup-row"><span>Trả lời bằng</span>
          <div className="deck-browser-filters" role="group" aria-label="Trả lời bằng">
            <button type="button" aria-pressed={answerWith === 'back'} onClick={() => setAnswerWith('back')}>Định nghĩa</button>
            <button type="button" aria-pressed={answerWith === 'front'} onClick={() => setAnswerWith('front')}>Thuật ngữ</button>
          </div>
        </div>
        <fieldset className="test-setup-row"><legend>Loại câu hỏi</legend>
          <div className="deck-browser-filters">
            {(Object.keys(TYPE_LABELS) as TestQuestionType[]).map((type) => (
              <button key={type} type="button" aria-pressed={types.includes(type)} onClick={() => toggleType(type)}>{TYPE_LABELS[type]}</button>
            ))}
          </div>
        </fieldset>
        <Button size="lg" disabled={!types.length} onClick={start}>Bắt đầu làm bài</Button>
      </section>
    )
  }

  const answered = Object.keys(responses).length
  const scoreReaction = graded && questions ? getTestScoreReaction(score, questions.length) : null

  return (
    <>
      {graded && questions && (
        <section className="test-result" aria-live="polite">
          <div className="test-result-score" style={{ ['--score' as string]: `${(animatedPercent / 100) * 360}deg` }}>
            <strong>{animatedPercent}%</strong>
          </div>
          <div>
            <h1>{score === questions.length ? 'Tuyệt vời, đúng hết!' : score / questions.length >= 0.7 ? 'Làm tốt lắm!' : 'Cần ôn thêm một chút'}</h1>
            <p><b className="is-right">{score} đúng</b> · <b className="is-wrong">{questions.length - score} sai</b> trên {questions.length} câu</p>
            <div>
              <Button onClick={start}><RotateCcw />Làm bài mới</Button>
              <Button variant="outline" onClick={() => setQuestions(null)}>Đổi thiết lập</Button>
            </div>
          </div>
          {scoreReaction && (
            <OwlCoach
              pose={scoreReaction.pose}
              motion={scoreReaction.motion}
              celebrateKey={scoreReaction.celebrateKey}
              message={scoreReaction.text}
              tone={scoreReaction.tone}
              effect={scoreReaction.effect}
            />
          )}
        </section>
      )}

      <ol className="test-questions">
        {questions.map((question, index) => (
          <TestQuestionCard key={`${question.card.id}-${index}`} index={index} total={questions.length} question={question}
            response={responses[index]} graded={graded} onRespond={(value) => respond(index, value)} />
        ))}
      </ol>

      {!graded && (
        <div className="test-submit">
          <span>Đã trả lời {answered}/{questions.length} câu</span>
          <Button size="lg" onClick={() => { setGraded(true); window.scrollTo({ top: 0, behavior: 'smooth' }) }}>Nộp bài</Button>
        </div>
      )}
    </>
  )
}

interface TestQuestionCardProps {
  index: number
  total: number
  question: TestQuestion
  response: Response | undefined
  graded: boolean
  onRespond: (value: Response) => void
}

function TestQuestionCard({ index, total, question, response, graded, onRespond }: TestQuestionCardProps) {
  const correct = graded && gradeQuestion(question, response)
  return (
    <li className={`test-question${graded ? (correct ? ' is-correct' : ' is-wrong') : ''}`}>
      <header><span>{TYPE_LABELS[question.type]}</span><small>{index + 1} / {total}</small></header>
      <div className="study-question-prompt">
        <h2>{question.prompt}</h2>
        {question.card.imageUrl && <img src={question.card.imageUrl} alt="" />}
      </div>

      {question.type === 'choice' && (
        <div className="study-choices">
          {question.choices?.map((choice) => {
            const state = graded ? (choice === question.answer ? 'is-answer' : choice === response ? 'is-picked' : '') : choice === response ? 'is-selected' : ''
            return <button key={choice} type="button" className={state} disabled={graded} aria-pressed={choice === response} onClick={() => onRespond(choice)}>{choice}</button>
          })}
        </div>
      )}

      {question.type === 'truefalse' && (
        <>
          <p className="test-pair">↔ <b>{question.shownPair}</b></p>
          <div className="study-choices is-two">
            {[true, false].map((value) => {
              const state = graded ? (value === question.pairIsCorrect ? 'is-answer' : value === response ? 'is-picked' : '') : value === response ? 'is-selected' : ''
              return <button key={String(value)} type="button" className={state} disabled={graded} aria-pressed={value === response} onClick={() => onRespond(value)}>{value ? 'Đúng' : 'Sai'}</button>
            })}
          </div>
        </>
      )}

      {question.type === 'written' && (
        <input className="test-written" value={typeof response === 'string' ? response : ''} disabled={graded} placeholder="Nhập câu trả lời…"
          aria-label={`Câu trả lời câu ${index + 1}`} onChange={(event) => onRespond(event.target.value)} />
      )}

      {graded && (
        <p className="test-verdict">
          {correct ? <><Check aria-hidden="true" />Đúng</> : <><X aria-hidden="true" />Đáp án đúng: <b>{question.type === 'truefalse' ? `${question.pairIsCorrect ? 'Đúng' : 'Sai'} — ${question.answer}` : question.answer}</b></>}
        </p>
      )}
    </li>
  )
}
