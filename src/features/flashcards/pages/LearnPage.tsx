import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Check, RotateCcw, X } from 'lucide-react'
import { OwlHero } from '@/components/OwlHero'
import { Button } from '@/components/ui/button'
import { SiteNavbar } from '@/components/SiteNavbar'
import { OwlCoach } from '../components/OwlCoach'
import { useDeckStudyCards } from '../hooks/useDeckStudyCards'
import { classifyAnswer } from '../lib/answer-feedback'
import { CorrectBurst } from '../components/CorrectBurst'
import {
  getAnswerReaction, getBreakReminder, getGreetingReaction, getIdleReminder, getMilestoneReaction, getStudyCompleteReaction,
  getWrongStreakReminder, type OwlReaction,
} from '../lib/owl-reactions'
import { buildChoices, isTypedAnswerCorrect, shuffle, type StudyCard } from '../lib/study'
import '../flashcards.css'

/** 0 = chưa học, 1 = đúng trắc nghiệm, 2 = đã thuộc (đúng cả phần tự gõ). */
type Stage = 0 | 1 | 2
type Feedback = { correct: boolean; answer: string; given: string }

/** A wrong card comes back a few questions later instead of immediately, so it is not answered from short-term memory. */
const RETRY_GAP = 3
/** Silence before the owl encourages, then before it gives a first-letter hint. */
const IDLE_NUDGE_MS = 15_000
const IDLE_HINT_MS = 35_000

export function LearnPage() {
  const { deckId = '' } = useParams()
  const { deck, cards, error } = useDeckStudyCards(deckId)
  return (
    <div className="flashcards-page">
      <SiteNavbar />
      <main className="flashcards-shell study-mode">
        <Link to={`/flashcards/decks/${deckId}`} className="flashcards-back"><ArrowLeft size={16} aria-hidden="true" />{deck?.name ?? 'Về học phần'}</Link>
        {error && <p role="alert" className="flashcard-error">{error}</p>}
        {cards === null ? <p className="flashcards-empty">Đang tải thẻ…</p>
          : cards.length < 2 ? <p className="flashcards-empty">Cần ít nhất 2 thẻ để học.</p>
            : <LearnSession key={deckId} deckId={deckId} cards={cards} />}
      </main>
    </div>
  )
}

function LearnSession({ deckId, cards }: { deckId: string; cards: StudyCard[] }) {
  const navigate = useNavigate()
  const [stages, setStages] = useState<Record<string, Stage>>(() => Object.fromEntries(cards.map((card) => [card.id, 0])))
  const [queue, setQueue] = useState(() => shuffle(cards.map((card) => card.id)))
  const [feedback, setFeedback] = useState<Feedback | null>(null)
  const [typed, setTyped] = useState('')
  const [streak, setStreak] = useState(0)
  const [failedCardIds, setFailedCardIds] = useState<Set<string>>(() => new Set())
  const [wrongAttempts, setWrongAttempts] = useState<Record<string, number>>({})
  const [owlReaction, setOwlReaction] = useState<OwlReaction | null>(() => getGreetingReaction(cards.length))
  const [wrongStreak, setWrongStreak] = useState(0)
  const [answered, setAnswered] = useState(0)
  const lastOwlTextRef = useRef<string | null>(null)
  const byId = useMemo(() => new Map(cards.map((card) => [card.id, card])), [cards])

  const current = queue.length ? byId.get(queue[0]) : undefined
  const stage = current ? stages[current.id] : 2
  const choices = useMemo(() => current && stage === 0 ? buildChoices(current, cards, 'back') : [], [current, stage, cards])
  const counts = { fresh: 0, learning: 0, mastered: 0 }
  for (const value of Object.values(stages)) counts[value === 0 ? 'fresh' : value === 1 ? 'learning' : 'mastered'] += 1

  function answer(correct: boolean, given: string) {
    if (!current || feedback) return
    const expected = stage === 0 ? current.back : current.front
    const otherPool = cards.map((c) => stage === 0 ? c.back : c.front)
    const kind = classifyAnswer(given, expected, otherPool)

    let reaction: OwlReaction
    setAnswered((value) => value + 1)
    if (correct) {
      const previouslyFailed = failedCardIds.has(current.id)
      const newStreak = streak + 1
      setStreak(newStreak)
      setWrongStreak(0)
      reaction = getAnswerReaction({
        kind: 'correct',
        expected,
        given,
        streak: newStreak,
        previouslyFailed,
        previousText: lastOwlTextRef.current,
      })
    } else {
      setStreak(0)
      setFailedCardIds((prev) => new Set(prev).add(current.id))
      const count = (wrongAttempts[current.id] || 0) + 1
      setWrongAttempts((prev) => ({ ...prev, [current.id]: count }))

      // Find what other term they mixed up with if applicable
      const otherCard = cards.find((c) => (stage === 0 ? c.back : c.front) === given)
      const mixedUpWith = otherCard ? (stage === 0 ? otherCard.front : otherCard.back) : undefined

      const misses = wrongStreak + 1
      setWrongStreak(misses)
      // Three misses in a row: suggest a short pause instead of naming one more mistake.
      reaction = getWrongStreakReminder(misses) ?? getAnswerReaction({
        kind,
        expected,
        given,
        wrongCount: count,
        mixedUpWith,
        previousText: lastOwlTextRef.current,
      })
    }

    lastOwlTextRef.current = reaction.text
    setOwlReaction(reaction)
    setFeedback({ correct, given, answer: expected })
  }

  /** Applies the answer shown in the feedback panel; `override` lets the learner accept a typo-level miss. */
  function next(override = false) {
    if (!current || !feedback) return
    const correct = feedback.correct || override
    const nextStage = (correct ? Math.min(stage + 1, 2) : 0) as Stage
    // Milestones and break reminders are said between questions so they never hide an answer's feedback.
    const masteredAfter = counts.mastered + (nextStage === 2 && stage !== 2 ? 1 : 0)
    const between = getMilestoneReaction(counts.mastered, masteredAfter, cards.length) ?? getBreakReminder(answered)
    if (between) { lastOwlTextRef.current = between.text; setOwlReaction(between) }
    setStages((value) => ({ ...value, [current.id]: nextStage }))
    setQueue((value) => {
      const rest = value.slice(1)
      if (nextStage === 2) return rest
      const at = correct ? rest.length : Math.min(RETRY_GAP, rest.length)
      return [...rest.slice(0, at), current.id, ...rest.slice(at)]
    })
    setFeedback(null)
    setTyped('')
  }

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (!current || feedback || stage !== 0 || event.target instanceof HTMLInputElement) return
      const choice = choices[Number(event.key) - 1]
      if (choice !== undefined) answer(choice === current.back, choice)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  function submitTyped(event: FormEvent) {
    event.preventDefault()
    if (!current || feedback) return
    answer(isTypedAnswerCorrect(typed, current.front), typed)
  }

  function restart() {
    setStages(Object.fromEntries(cards.map((card) => [card.id, 0])))
    setQueue(shuffle(cards.map((card) => card.id)))
    setFeedback(null)
    setTyped('')
    setStreak(0)
    setWrongStreak(0)
    setAnswered(0)
    setFailedCardIds(new Set())
    setWrongAttempts({})
    setOwlReaction(getGreetingReaction(cards.length))
  }

  // Nudges when the learner sits on a question: encouragement first, then a first-letter hint for typed answers.
  // Typing restarts the timer so the owl never interrupts someone who is answering.
  const currentId = current?.id
  useEffect(() => {
    if (!currentId || feedback) return undefined
    const card = byId.get(currentId)
    if (!card) return undefined
    const kind = stage === 0 ? 'choice' : 'typed'
    const timers = [IDLE_NUDGE_MS, IDLE_HINT_MS].map((delay, index) => window.setTimeout(() => {
      const reminder = getIdleReminder(kind, card.front, index + 1)
      lastOwlTextRef.current = reminder.text
      setOwlReaction(reminder)
    }, delay))
    return () => timers.forEach((timer) => window.clearTimeout(timer))
  }, [currentId, stage, feedback, typed, byId])

  const total = cards.length
  return (
    <>
      <div className="study-progress" aria-label="Tiến độ học">
        <div className="study-progress-bar">
          <i className="is-mastered" style={{ inlineSize: `${(counts.mastered / total) * 100}%` }} />
          <i className="is-learning" style={{ inlineSize: `${(counts.learning / total) * 100}%` }} />
        </div>
        <ul>
          <li><b>{counts.fresh}</b> Chưa học</li>
          <li className="is-learning"><b>{counts.learning}</b> Đang học</li>
          <li className="is-mastered"><b>{counts.mastered}</b> Đã thuộc</li>
        </ul>
      </div>

      {!current ? (
        <section className="study-done">
          <OwlHero pose="party" motion="hop" size="md" celebrateKey="study-finished" alt="" />
          <h1>Bạn đã học xong {total} thẻ!</h1>
          <p>{getStudyCompleteReaction().text}</p>
          <div>
            <Button onClick={restart}><RotateCcw />Học lại</Button>
            <Button variant="outline" onClick={() => navigate(`/flashcards/decks/${deckId}/test`)}>Làm bài kiểm tra</Button>
          </div>
        </section>
      ) : (
        <div className="study-layout-with-coach">
          <div className="study-main-col">
            <section className={`study-question${feedback ? (feedback.correct ? ' is-correct' : ' is-wrong') : ''}`} aria-live="polite">
              {feedback?.correct && <CorrectBurst key={answered} streak={streak} />}
              <header>
                <span>{stage === 0 ? 'Thuật ngữ' : 'Định nghĩa'}</span>
                <small>{stage === 0 ? 'Chọn định nghĩa đúng' : 'Gõ thuật ngữ tương ứng'}</small>
              </header>
              <div className="study-question-prompt">
                <h2>{stage === 0 ? current.front : current.back}</h2>
                {current.imageUrl && <img src={current.imageUrl} alt="" />}
              </div>

              {stage === 0 ? (
                <div className="study-choices">
                  {choices.map((choice, index) => {
                    const state = feedback ? (choice === current.back ? 'is-answer' : choice === feedback.given ? 'is-picked' : '') : ''
                    return (
                      <button key={choice} type="button" className={state} disabled={Boolean(feedback)} onClick={() => answer(choice === current.back, choice)}>
                        <kbd>{index + 1}</kbd>{choice}
                      </button>
                    )
                  })}
                </div>
              ) : (
                <form className="study-typed" onSubmit={submitTyped}>
                  <input
                    autoFocus
                    value={typed}
                    disabled={Boolean(feedback)}
                    placeholder="Nhập thuật ngữ…"
                    aria-label="Câu trả lời"
                    className={feedback ? (feedback.correct ? 'is-correct' : 'is-wrong') : ''}
                    onChange={(event) => setTyped(event.target.value)}
                  />
                  {!feedback && <div>
                    <Button type="button" variant="ghost" onClick={() => answer(false, '')}>Không biết?</Button>
                    <Button type="submit" disabled={!typed.trim()}>Trả lời</Button>
                  </div>}
                </form>
              )}

              {feedback && (
                <footer className="study-feedback">
                  <p>{feedback.correct ? <><Check aria-hidden="true" />Chính xác!</> : <><X aria-hidden="true" />Chưa đúng. Đáp án: <b>{feedback.answer}</b></>}</p>
                  <div>
                    {!feedback.correct && stage === 1 && feedback.given.trim() && (
                      <Button variant="ghost" onClick={() => next(true)}>Tôi đã trả lời đúng</Button>
                    )}
                    <Button autoFocus onClick={() => next()}>Tiếp tục</Button>
                  </div>
                </footer>
              )}
            </section>
          </div>
          <OwlCoach
            pose={owlReaction?.pose ?? 'confident'}
            motion={owlReaction?.motion ?? 'calm'}
            celebrateKey={owlReaction?.celebrateKey}
            message={owlReaction?.text}
            tone={owlReaction?.tone ?? 'info'}
            effect={owlReaction?.effect}
            streak={streak}
          />
        </div>
      )}
    </>
  )
}
