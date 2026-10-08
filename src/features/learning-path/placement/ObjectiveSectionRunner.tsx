import { useState } from 'react'
import { ArrowLeft, ArrowRight, Check, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import type { Passage } from '~types/learningPath'
import { toApiError } from '../api'
import type { TestItem } from '../lib/attemptSnapshot'
import { ExamAudioPlayer } from './ExamAudioPlayer'
import { ExamQuestionList } from './ExamQuestionList'
import { PlacementExamShell, type SectionRunnerProps } from './PlacementExamShell'
import { ResizableSplit } from './ResizableSplit'
import { questionItems, skillOf } from './placementSkills'

/** Reading and Listening: the passage (or audio) beside its questions, and a numbered question bar like the real test. */
export function ObjectiveSectionRunner(props: SectionRunnerProps) {
  const { section, partNumber, answers, saveStates, setAnswer, saveAnswer, onExit, onComplete } = props
  const items = questionItems(section)
  const [current, setCurrent] = useState(0)
  const [flagged, setFlagged] = useState<ReadonlySet<string>>(new Set())
  const [confirming, setConfirming] = useState(false)
  const [finishing, setFinishing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const isListening = skillOf(section) === 'LISTENING'
  const passage = section.snapshot?.passage
  const hasPassage = !isListening && Boolean(passage && passage.paragraphs.length > 0)
  const isAnswered = (item: TestItem) => Boolean((answers[item.id] ?? '').trim())
  const unanswered = items.filter((item) => !isAnswered(item)).length
  const numbers = items.map((item, index) => item.question?.number ?? index + 1)
  const range = numbers.length > 1 ? `${numbers[0]}–${numbers.at(-1)}` : String(numbers[0] ?? '')

  function focusQuestion(index: number) {
    const item = items[index]
    if (!item) return
    setCurrent(index)
    const element = document.getElementById(`pl-q-${item.id}`)
    // The first question of a group brings its "Questions x–y" heading and instruction into view too.
    const startsGroup = element?.previousElementSibling && !element.previousElementSibling.classList.contains('pl-q')
    const target = startsGroup ? element.parentElement : element
    target?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    element?.querySelector<HTMLElement>('input, button[role="radio"]')?.focus({ preventScroll: true })
  }

  function change(item: TestItem, value: string) {
    setAnswer(item.id, value)
    // Choices are saved at once; typed answers when the field loses focus.
    if (item.question?.options) void saveAnswer(item.id, value)
  }

  function toggleFlag(itemId: string) {
    setFlagged((previous) => {
      const next = new Set(previous)
      if (!next.delete(itemId)) next.add(itemId)
      return next
    })
  }

  /** Saves every answer, then hands the section in; it cannot be reopened afterwards. */
  async function finish() {
    setFinishing(true)
    setError(null)
    const saved = await Promise.all(items.map((item) => saveAnswer(item.id, answers[item.id] ?? '')))
    if (saved.includes(false)) {
      setError('Chưa lưu được một số câu trả lời. Kiểm tra kết nối rồi nộp lại.')
      setFinishing(false)
      return
    }
    try {
      await onComplete()
    } catch (reason) {
      setError(`${toApiError(reason).message.replace(/[.!?]?$/, '.')} Hãy nộp lại.`)
      setFinishing(false)
    }
  }

  const questions = (
    <ExamQuestionList
      answers={answers}
      current={current}
      disabled={finishing}
      flagged={flagged}
      items={items}
      onBlur={(item) => void saveAnswer(item.id, answers[item.id] ?? '')}
      onChange={change}
      onFocusItem={setCurrent}
      onToggleFlag={toggleFlag}
      saveStates={saveStates}
    />
  )

  const footer = (
    <>
      <nav className="pl-qbar" aria-label="Chuyển nhanh tới câu hỏi">
        <span className="pl-qbar__part">Part {partNumber}</span>
        <ol className="pl-qbar__numbers">
          {items.map((item, index) => (
            <li key={item.id}>
              <button aria-current={index === current ? 'true' : undefined} className="pl-qbar__num"
                data-answered={isAnswered(item)} data-flagged={flagged.has(item.id)}
                onClick={() => focusQuestion(index)} type="button"
                aria-label={`Câu ${numbers[index]}${isAnswered(item) ? ', đã trả lời' : ''}${flagged.has(item.id) ? ', đã đánh dấu' : ''}`}>
                {numbers[index]}
              </button>
            </li>
          ))}
        </ol>
        <span className="pl-qbar__count">{items.length - unanswered} of {items.length}</span>
      </nav>
      {error ? <p className="pl-qbar__error lp-error" role="alert">{error}</p> : null}
      <button aria-label="Nộp phần này" className="pl-qbar__submit" disabled={finishing}
        onClick={() => setConfirming(true)} title="Nộp phần này" type="button">
        {finishing ? <Loader2 aria-hidden="true" className="lp-spin" size={22} /> : <Check aria-hidden="true" size={22} />}
      </button>
    </>
  )

  return (
    <PlacementExamShell
      footer={footer}
      footerClassName="pl-exam__foot--qbar"
      instructions={`${isListening ? 'Listen and answer' : 'Read the text and answer'} questions ${range}`}
      onExit={onExit}
      partNumber={partNumber}
      section={section}
      toolbar={isListening && section.snapshot?.audio ? <ExamAudioPlayer audio={section.snapshot.audio} /> : undefined}
    >
      <div className="pl-stage">
        {hasPassage && passage ? (
          <ResizableSplit left={<ExamPassage passage={passage} title={section.snapshot?.title ?? ''} />} right={questions} />
        ) : (
          <div className="pl-single">{questions}</div>
        )}
        <div className="pl-stage__arrows">
          <Button aria-label="Câu trước" className="pl-icon-btn" disabled={current === 0} onClick={() => focusQuestion(current - 1)} type="button">
            <ArrowLeft aria-hidden="true" />
          </Button>
          <Button aria-label="Câu tiếp theo" className="pl-icon-btn" disabled={current >= items.length - 1} onClick={() => focusQuestion(current + 1)} type="button">
            <ArrowRight aria-hidden="true" />
          </Button>
        </div>
      </div>

      <Dialog open={confirming} onOpenChange={setConfirming}>
        <DialogContent className="lp-tokens pl-confirm">
          <DialogHeader>
            <DialogTitle>Nộp phần {isListening ? 'Listening' : 'Reading'}?</DialogTitle>
            <DialogDescription>
              {unanswered > 0
                ? `Bạn còn ${unanswered} câu chưa trả lời. Sau khi nộp, phần này không mở lại được.`
                : 'Bạn đã trả lời tất cả các câu. Sau khi nộp, phần này không mở lại được.'}
            </DialogDescription>
          </DialogHeader>
          <div className="pl-confirm__actions">
            <Button className="pl-btn" onClick={() => setConfirming(false)} type="button" variant="outline">Làm tiếp</Button>
            <Button className="pl-btn pl-btn--accent" onClick={() => { setConfirming(false); void finish() }} type="button">
              <Check aria-hidden="true" />Nộp phần này
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </PlacementExamShell>
  )
}

/** The reading text as on the test: plain paragraphs, lettered ones with the letter in front. */
function ExamPassage({ passage, title }: { passage: Passage; title: string }) {
  const fallback = title.replace(/^Reading:\s*/i, '')
  const heading = passage.title || fallback.charAt(0).toUpperCase() + fallback.slice(1)
  return (
    <article className="pl-passage" aria-label="Bài đọc">
      {heading ? <h2 className="pl-passage__title">{heading}</h2> : null}
      {passage.paragraphs.map((paragraph, index) => (
        <p className="pl-passage__para" key={`${paragraph.label ?? 'p'}-${index}`}>
          {paragraph.label ? <strong className="pl-passage__label">{paragraph.label}</strong> : null}
          <span>{paragraph.text}</span>
        </p>
      ))}
    </article>
  )
}
