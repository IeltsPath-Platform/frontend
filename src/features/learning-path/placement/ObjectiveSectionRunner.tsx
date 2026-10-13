import { useEffect, useEffectEvent, useState } from 'react'
import { ArrowLeft, ArrowRight, Check, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import type { Passage } from '~types/learningPath'
import { toApiError } from '../api'
import type { TestItem, TestSection } from '../lib/attemptSnapshot'
import { ExamAudioPlayer } from './ExamAudioPlayer'
import { ExamQuestionList } from './ExamQuestionList'
import { PlacementExamShell, type SectionRunnerProps } from './PlacementExamShell'
import { ResizableSplit } from './ResizableSplit'
import { partLabel, partTopic } from './placementGroups'
import { SKILL_META, questionItems } from './placementSkills'

interface Part {
  section: TestSection
  label: string
  items: TestItem[]
  /** Index of the part's first question among all questions of the skill. */
  start: number
}

/**
 * Reading and Listening: the passage (or audio) of the open part beside its questions, and a bar listing every part
 * with numbered questions, like the real test. Parts are switched from the bar or by walking through the questions.
 */
export function ObjectiveSectionRunner(props: SectionRunnerProps) {
  const { group, answers, saveStates, setAnswer, saveAnswer, onOpenPart, onExit, onComplete } = props
  const isListening = group.skill === 'LISTENING'
  const parts: Part[] = []
  group.sections.forEach((section, index) => {
    const items = questionItems(section)
    if (items.length === 0) return
    parts.push({ section, label: partLabel(section, index), items, start: parts.reduce((total, part) => total + part.items.length, 0) })
  })
  const allItems = parts.flatMap((part) => part.items)
  const isAnswered = (item: TestItem) => Boolean((answers[item.id] ?? '').trim())
  const unanswered = allItems.filter((item) => !isAnswered(item)).length

  // A learner who comes back resumes at the first question still open.
  const [current, setCurrent] = useState(() => {
    const open = allItems.findIndex((item) => !isAnswered(item))
    return open === -1 ? Math.max(0, allItems.length - 1) : open
  })
  const [focusTick, setFocusTick] = useState(0)
  const [flagged, setFlagged] = useState<ReadonlySet<string>>(new Set())
  const [confirming, setConfirming] = useState(false)
  const [finishing, setFinishing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const partIndex = Math.max(0, parts.findIndex((part) => current < part.start + part.items.length))
  const part = parts[partIndex]
  const openPart = useEffectEvent(onOpenPart)
  const scrollToCurrent = useEffectEvent(() => {
    const item = allItems[current]
    if (!item) return
    const element = document.getElementById(`pl-q-${item.id}`)
    // The first question of a group brings its "Questions x–y" heading and instruction into view too.
    const startsGroup = element?.previousElementSibling && !element.previousElementSibling.classList.contains('pl-q')
    const target = startsGroup ? element.parentElement : element
    target?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    element?.querySelector<HTMLElement>('input, button[role="radio"]')?.focus({ preventScroll: true })
  })

  const partSectionId = part?.section.id
  useEffect(() => {
    if (partSectionId) openPart(partSectionId)
  }, [partSectionId])

  // Moving to another part re-renders the questions first; scroll once they are on screen.
  useEffect(() => {
    if (focusTick > 0) scrollToCurrent()
  }, [focusTick])

  if (!part) return null

  function goTo(index: number) {
    if (!allItems[index]) return
    setCurrent(index)
    setFocusTick((tick) => tick + 1)
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

  /** Saves every answer, then hands the whole skill in; it cannot be reopened afterwards. */
  async function finish() {
    setFinishing(true)
    setError(null)
    const saved = await Promise.all(allItems.map((item) => saveAnswer(item.id, answers[item.id] ?? '')))
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

  const numbers = part.items.map((item, index) => item.question?.number ?? part.start + index + 1)
  const range = numbers.length > 1 ? `${numbers[0]}–${numbers.at(-1)}` : String(numbers[0] ?? '')
  const passage = part.section.snapshot?.passage
  const hasPassage = !isListening && Boolean(passage && passage.paragraphs.length > 0)
  const audio = part.section.snapshot?.audio
  const skillLabel = SKILL_META[group.skill].label

  const questions = (
    <ExamQuestionList
      answers={answers}
      current={current - part.start}
      disabled={finishing}
      flagged={flagged}
      items={part.items}
      onBlur={(item) => void saveAnswer(item.id, answers[item.id] ?? '')}
      onChange={change}
      onFocusItem={(index) => setCurrent(part.start + index)}
      onToggleFlag={toggleFlag}
      saveStates={saveStates}
    />
  )

  const footer = (
    <>
      <nav className="pl-qbar" aria-label="Chuyển nhanh tới part và câu hỏi">
        {parts.map((other, index) => {
          if (index !== partIndex) {
            const done = other.items.filter(isAnswered).length
            return (
              <button className="pl-qbar__tab" key={other.section.id} onClick={() => goTo(other.start)} type="button">
                <strong>{other.label}</strong>
                <span>{done} of {other.items.length}</span>
              </button>
            )
          }
          return (
            <div className="pl-qbar__open" key={other.section.id}>
              <span className="pl-qbar__part">{other.label}</span>
              <ol className="pl-qbar__numbers">
                {other.items.map((item, itemIndex) => (
                  <li key={item.id}>
                    <button aria-current={other.start + itemIndex === current ? 'true' : undefined} className="pl-qbar__num"
                      data-answered={isAnswered(item)} data-flagged={flagged.has(item.id)}
                      onClick={() => goTo(other.start + itemIndex)} type="button"
                      aria-label={`Câu ${numbers[itemIndex]}${isAnswered(item) ? ', đã trả lời' : ''}${flagged.has(item.id) ? ', đã đánh dấu' : ''}`}>
                      {numbers[itemIndex]}
                    </button>
                  </li>
                ))}
              </ol>
            </div>
          )
        })}
      </nav>
      {error ? <p className="pl-qbar__error lp-error" role="alert">{error}</p> : null}
      <button aria-label={`Nộp phần ${skillLabel}`} className="pl-qbar__submit" disabled={finishing}
        onClick={() => setConfirming(true)} title={`Nộp phần ${skillLabel}`} type="button">
        {finishing ? <Loader2 aria-hidden="true" className="lp-spin" size={22} /> : <Check aria-hidden="true" size={22} />}
      </button>
    </>
  )

  return (
    <PlacementExamShell
      footer={footer}
      footerClassName="pl-exam__foot--qbar"
      group={group}
      instructions={part.section.snapshot?.instructions || `${isListening ? 'Listen and answer' : 'Read the text and answer'} questions ${range}`}
      onExit={onExit}
      partLabel={part.label}
      toolbar={isListening && audio ? <ExamAudioPlayer audio={audio} key={part.section.id} /> : undefined}
    >
      <div className="pl-stage">
        {hasPassage && passage ? (
          <ResizableSplit key={part.section.id} left={<ExamPassage passage={passage} topic={partTopic(part.section)} />} right={questions} />
        ) : (
          <div className="pl-single" key={part.section.id}>{questions}</div>
        )}
        <div className="pl-stage__arrows">
          <Button aria-label="Câu trước" className="pl-icon-btn" disabled={current === 0} onClick={() => goTo(current - 1)} type="button">
            <ArrowLeft aria-hidden="true" />
          </Button>
          <Button aria-label="Câu tiếp theo" className="pl-icon-btn" disabled={current >= allItems.length - 1} onClick={() => goTo(current + 1)} type="button">
            <ArrowRight aria-hidden="true" />
          </Button>
        </div>
      </div>

      <Dialog open={confirming} onOpenChange={setConfirming}>
        <DialogContent className="lp-tokens pl-confirm">
          <DialogHeader>
            <DialogTitle>Nộp phần {skillLabel}?</DialogTitle>
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
function ExamPassage({ passage, topic }: { passage: Passage; topic: string }) {
  const heading = passage.title || topic
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
