import { useState } from 'react'
import { Check, CloudOff, Loader2, PenLine } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import type { Passage } from '~types/learningPath'
import { learningApi, toApiError } from '../api'
import { reportApiError } from '../lib/reviewGate'
import { DictionaryPanel } from './DictionaryPanel'
import { PlacementExamShell, type SectionRunnerProps } from './PlacementExamShell'
import { TASK_1_PARTS, WRITING_PARTS, countWords, joinWritingParts, questionItems, readWritingParts } from './placementSkills'
import { formatHoursMinutesSeconds, useSectionSeconds } from './sectionClock'

const TARGET_WORDS = 150

/**
 * Writing as three panels like the real test: the task (and for Task 1 its data) on the left, the essay in its usual
 * paragraphs in the middle, a dictionary on the right. The paragraphs are saved as the item's response while drafting;
 * handing the section in sends the joined essay for grading.
 */
export function WritingSectionRunner(props: SectionRunnerProps) {
  const { attemptId, section, partNumber, answers, saveStates, setAnswer, saveAnswer, onExit, onComplete } = props
  const items = questionItems(section)
  const seconds = useSectionSeconds()
  const [finishing, setFinishing] = useState(false)
  const [confirming, setConfirming] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const essays = items.map((item) => joinWritingParts(readWritingParts(answers[item.id])))
  const emptyEssays = essays.filter((essay) => essay === '').length
  const passage = section.snapshot?.passage
  const data = passage && passage.paragraphs.length > 0 ? passage : null
  const labels = data ? TASK_1_PARTS : WRITING_PARTS
  const dataTitle = (section.snapshot?.title ?? '').replace(/^.*?:\s*/, '')

  function changePart(itemId: string, index: number, value: string) {
    const parts = readWritingParts(answers[itemId])
    parts[index] = value
    setAnswer(itemId, JSON.stringify({ parts }))
  }

  async function finish() {
    setFinishing(true)
    setError(null)
    const saved = await Promise.all(items.map((item) => saveAnswer(item.id, answers[item.id] ?? '')))
    if (saved.includes(false)) {
      setError('Chưa lưu được bài viết. Kiểm tra kết nối rồi nộp lại.')
      setFinishing(false)
      return
    }
    try {
      for (const [index, item] of items.entries()) {
        if (!essays[index]) continue
        await learningApi.submitLearnerSubmission({
          attemptItemId: item.id,
          promptSnapshot: JSON.stringify({ stem: item.question?.prompt ?? '' }),
          skill: 'WRITING',
          textPayload: essays[index],
          submissionKey: `placement-writing-${attemptId}-${item.id}`,
        })
      }
      await onComplete()
    } catch (reason) {
      const apiError = toApiError(reason)
      reportApiError(apiError)
      setError(`${apiError.message.replace(/[.!?]?$/, '.')} Hãy nộp lại.`)
      setFinishing(false)
    }
  }

  return (
    <PlacementExamShell onExit={onExit} partNumber={partNumber} section={section}>
      {items.map((item, itemIndex) => {
        const parts = readWritingParts(answers[item.id])
        const words = countWords(essays[itemIndex])
        const isLast = itemIndex === items.length - 1
        return (
          <div className="pl-writing" key={item.id}>
            <section className="pl-panel pl-writing__task" aria-label="Đề bài">
              <div className="pl-panel__scroll">
                <p className="pl-writing__prompt">{item.question?.prompt}</p>
                {data ? <TaskData passage={data} title={dataTitle} /> : null}
              </div>
            </section>

            <section className="pl-panel pl-writing__editor" aria-label="Bài viết">
              <header className="pl-panel__head pl-panel__head--end">
                <span className="pl-writing__count" aria-live="polite">
                  <PenLine aria-hidden="true" size={16} />
                  <span>Word count: <strong>{words}</strong>/{TARGET_WORDS}</span>
                </span>
              </header>
              <div className="pl-panel__scroll">
                {labels.map((label, index) => (
                  <label className="pl-writing__part" key={label}>
                    <span>{label}</span>
                    <Textarea
                      className="pl-writing__input"
                      disabled={finishing}
                      onBlur={() => void saveAnswer(item.id, answers[item.id] ?? '')}
                      onChange={(event) => changePart(item.id, index, event.target.value)}
                      placeholder="Nhập phần viết của bạn ở đây"
                      rows={index === 0 || index === labels.length - 1 ? 3 : 5}
                      value={parts[index]}
                    />
                  </label>
                ))}
                {saveStates[item.id] === 'error' ? (
                  <p className="lp-save lp-save--error"><CloudOff aria-hidden="true" size={14} />Chưa lưu được bản nháp, sẽ thử lại khi bạn nộp</p>
                ) : null}
              </div>
              {isLast ? (
                <footer className="pl-writing__foot">
                  <p className="pl-writing__time">Thời gian:<strong>{formatHoursMinutesSeconds(seconds)}</strong></p>
                  <Button className="pl-writing__done" disabled={finishing} onClick={() => setConfirming(true)} type="button">
                    {finishing ? <Loader2 aria-hidden="true" className="lp-spin" /> : <Check aria-hidden="true" />}Hoàn thành
                  </Button>
                  {error ? <p className="pl-writing__error lp-error" role="alert">{error}</p> : null}
                </footer>
              ) : null}
            </section>

            <DictionaryPanel />
          </div>
        )
      })}

      <Dialog open={confirming} onOpenChange={setConfirming}>
        <DialogContent className="lp-tokens pl-confirm">
          <DialogHeader>
            <DialogTitle>Nộp phần Writing?</DialogTitle>
            <DialogDescription>
              {emptyEssays > 0
                ? 'Bài viết đang để trống nên sẽ tính 0 điểm. Sau khi nộp, phần này không mở lại được.'
                : 'Sau khi nộp, phần này không mở lại được.'}
            </DialogDescription>
          </DialogHeader>
          <div className="pl-confirm__actions">
            <Button className="pl-btn" onClick={() => setConfirming(false)} type="button" variant="outline">Viết tiếp</Button>
            <Button className="pl-btn pl-btn--accent" onClick={() => { setConfirming(false); void finish() }} type="button">
              <Check aria-hidden="true" />Nộp phần này
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </PlacementExamShell>
  )
}

/** Task 1 data: rows written as `label | value | …` become a table card; any other text stays as paragraphs. */
function TaskData({ passage, title }: { passage: Passage; title: string }) {
  const lines = passage.paragraphs.flatMap((paragraph) => paragraph.text.split('\n')).map((line) => line.trim()).filter(Boolean)
  if (lines.length < 2 || !lines.every((line) => line.includes('|'))) {
    return <div className="pl-writing__data">{lines.map((line, index) => <p key={index}>{line}</p>)}</div>
  }
  const [head, ...rows] = lines.map((line) => line.split('|').map((cell) => cell.trim()))
  return (
    <figure className="pl-data-card">
      {title ? <figcaption>{title.charAt(0).toUpperCase() + title.slice(1)}</figcaption> : null}
      <div className="pl-data-card__scroll">
        <table className="pl-data-table">
          <thead><tr>{head.map((cell, index) => <th key={index} scope="col">{cell}</th>)}</tr></thead>
          <tbody>
            {rows.map((row, rowIndex) => (
              <tr key={rowIndex}>{row.map((cell, index) => (index === 0 ? <th key={index} scope="row">{cell}</th> : <td key={index}>{cell}</td>))}</tr>
            ))}
          </tbody>
        </table>
      </div>
    </figure>
  )
}
