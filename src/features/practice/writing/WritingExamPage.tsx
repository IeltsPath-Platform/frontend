import { useEffect, useRef, useState } from 'react'
import type { CSSProperties } from 'react'
import { ArrowLeft, ArrowRight, Check, Clock3 } from 'lucide-react'
import { ReadingSplitHandle } from '../reading/ReadingWorkspaceParts'
import type { WorkspaceFontSize } from '../reading/ReadingWorkspaceParts'
import { WritingChart, WritingTopBar } from './WritingParts'
import type { WritingTask } from './writingApi'
import { countWords, formatClock, loadDraft, saveDraft } from './writingText'
import { useGradeFlow } from './useGradeFlow'
import '../reading/reading-exam-annotations.css'

const CATALOG_PATH = '/practice-tests?skill=writing'

/** What the real test tells the candidate before the task: how long to spend and the minimum length. */
function spendHint(task: WritingTask) {
  const minutes = task.timeLimitSeconds ? Math.round(task.timeLimitSeconds / 60) : task.task === 'TASK_2' ? 40 : 20
  const minWords = task.minWords ?? (task.task === 'TASK_2' ? 250 : 150)
  return `You should spend about ${minutes} minutes on this task. Write at least ${minWords} words.`
}

/**
 * The exam screen: the layout of the computer-delivered test. A grey banner names the part, the task is on the left and
 * the answer box on the right with a bar between them that can be dragged. The clock counts down from the time limit of the
 * task and there is no guide or dictionary. When the time is up the essay is locked and sent to be graded.
 */
export function WritingExamPage({ task }: { task: WritingTask }) {
  const draftKey = `${task.sectionId}:exam`
  const limit = task.timeLimitSeconds
  const [text, setText] = useState(() => loadDraft(draftKey)?.texts[0] ?? '')
  const [seconds, setSeconds] = useState(() => loadDraft(draftKey)?.seconds ?? 0)
  const [fontSize, setFontSize] = useState<WorkspaceFontSize>('medium')
  const [split, setSplit] = useState(50)
  const draft = useRef({ text, seconds })
  const timeUp = limit !== null && seconds >= limit
  const words = countWords(text)
  const partLabel = `Part ${task.partNo ?? (task.task === 'TASK_2' ? 2 : 1)}`
  const grade = useGradeFlow({
    task, mode: 'exam', draftKey, essay: text, seconds, label: 'Thi thật',
    benefits: ['Band tổng và điểm 4 tiêu chí', 'Bài viết được đánh dấu lỗi ngữ pháp, từ vựng, mạch lạc', 'Gợi ý sửa và việc nên làm trước'],
    extraChecks: [],
  })

  useEffect(() => { draft.current = { text, seconds } }, [text, seconds])
  useEffect(() => {
    if (timeUp) return undefined
    const id = window.setInterval(() => setSeconds((current) => current + 1), 1000)
    return () => window.clearInterval(id)
  }, [timeUp])
  // The draft is kept while the learner writes, so a closed tab never loses the essay.
  useEffect(() => {
    const id = window.setInterval(() => saveDraft(draftKey, { texts: [draft.current.text], seconds: draft.current.seconds }), 5000)
    return () => window.clearInterval(id)
  }, [draftKey])

  // Time is up: keep what was written and go straight to the grading choice, as the real test collects the answer sheet.
  const submitted = useRef(false)
  useEffect(() => {
    if (!timeUp || submitted.current || words === 0) return
    submitted.current = true
    saveDraft(draftKey, { texts: [text], seconds })
    grade.start()
  }, [timeUp, words, draftKey, text, seconds, grade])

  function finish() {
    saveDraft(draftKey, { texts: [text], seconds })
    grade.start()
  }

  return (
    <div className={`rw-root rw-exam lp-tokens ww-exam rw-text-${fontSize}`}>
      <WritingTopBar exitTo={CATALOG_PATH} showEyeComfort={false} eyeComfort={false} onToggleEyeComfort={() => undefined}
        fontSize={fontSize} onChangeFontSize={setFontSize}>
        <p className="rw-timer" role="timer" aria-label="Thời gian còn lại">
          <Clock3 size={14} aria-hidden="true" />
          {limit === null ? formatClock(seconds) : `Còn ${formatClock(Math.max(0, limit - seconds))}`}
        </p>
      </WritingTopBar>

      <div>
        {grade.pendingNotice}
        <div className="rw-exam-banner">
          <strong>{partLabel}</strong>
          <p>{spendHint(task)}</p>
        </div>
      </div>

      <div className="rw-body rw-body-exam" style={{ '--rw-split': split } as CSSProperties}>
        <section className="ww-exam-task" aria-label="Đề bài">
          <p className="ww-exam-prompt">{task.prompt}</p>
          <WritingChart task={task} />
          {task.instructions && <p className="ww-exam-instructions">{task.instructions}</p>}
        </section>

        <ReadingSplitHandle value={split} onChange={setSplit} label="Kéo để đổi độ rộng đề bài và ô viết" />

        <section className="ww-exam-answer" aria-label="Bài viết của bạn">
          <textarea value={text} readOnly={timeUp} aria-label="Bài viết của bạn" spellCheck={false} onChange={(event) => setText(event.target.value)} />
          <p className="ww-exam-words" aria-live="polite">Words: {words}</p>
          {timeUp && <p className="ww-exam-timeup" role="status">Hết giờ. Bài viết đã được khóa.</p>}
        </section>

        {/* A single task has no other part to go to, so both arrows stay grey. */}
        <div className="rw-exam-arrows">
          <button type="button" className="rw-arrow rw-arrow-prev" aria-label="Phần trước" disabled><ArrowLeft size={20} aria-hidden="true" /></button>
          <button type="button" className="rw-arrow rw-arrow-next" aria-label="Phần tiếp theo" disabled><ArrowRight size={20} aria-hidden="true" /></button>
        </div>
      </div>

      <footer className="rw-footer">
        <strong className="ww-exam-part">{partLabel}</strong>
        <div className="rw-footer-actions">
          <button type="button" className="rw-finish is-ready" aria-label="Hoàn thành bài làm" disabled={words === 0 || grade.checking} onClick={finish}>
            <Check size={22} aria-hidden="true" />
          </button>
        </div>
      </footer>
      {grade.dialogs}
    </div>
  )
}
