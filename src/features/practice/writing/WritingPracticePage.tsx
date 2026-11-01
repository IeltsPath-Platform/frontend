import { useEffect, useRef, useState } from 'react'
import type { CSSProperties } from 'react'
import { Clock3 } from 'lucide-react'
import { ReadingSplitHandle } from '../reading/ReadingWorkspaceParts'
import type { WorkspaceFontSize } from '../reading/ReadingWorkspaceParts'
import { WritingDictionaryPanel, WritingTaskPanel, WritingTopBar } from './WritingParts'
import type { WritingTask } from './writingApi'
import { countWords, formatClock, loadDraft, saveDraft } from './writingText'
import { useGradeFlow } from './useGradeFlow'

const CATALOG_PATH = '/practice-tests?skill=writing'

/** The least a column may take, in percent of the width, so dragging one bar never squeezes the next one shut. */
const MIN_COLUMN = 20

/**
 * The practice screen: three panels side by side, each with a bar to drag. The task with its guide and notes, the answer in
 * one box, and the dictionary. Finishing checks the points and offers the AI grade.
 */
export function WritingPracticePage({ task }: { task: WritingTask }) {
  const draftKey = `${task.sectionId}:practice`
  const [text, setText] = useState(() => loadDraft(draftKey)?.texts[0] ?? '')
  const [seconds, setSeconds] = useState(() => loadDraft(draftKey)?.seconds ?? 0)
  const [saved, setSaved] = useState(false)
  const [eyeComfort, setEyeComfort] = useState(false)
  const [fontSize, setFontSize] = useState<WorkspaceFontSize>('medium')
  // Where the two bars sit, in percent of the width: the task ends at the first, the answer at the second.
  const [taskEnd, setTaskEnd] = useState(30)
  const [answerEnd, setAnswerEnd] = useState(72)
  const draft = useRef({ text, seconds })
  const words = countWords(text)
  const minWords = task.minWords ?? (task.task === 'TASK_2' ? 250 : 150)
  const grade = useGradeFlow({
    task, mode: 'practice', draftKey, essay: text, seconds, label: 'Luyện tập',
    benefits: ['Band tổng và điểm 4 tiêu chí', 'Bài viết được đánh dấu lỗi ngữ pháp, từ vựng, mạch lạc', 'Gợi ý sửa và việc nên làm trước'],
    extraChecks: [],
  })

  useEffect(() => { draft.current = { text, seconds } }, [text, seconds])
  useEffect(() => {
    const id = window.setInterval(() => setSeconds((current) => current + 1), 1000)
    return () => window.clearInterval(id)
  }, [])
  // The draft is kept while the learner writes, so a closed tab never loses the essay.
  useEffect(() => {
    const id = window.setInterval(() => saveDraft(draftKey, { texts: [draft.current.text], seconds: draft.current.seconds }), 5000)
    return () => window.clearInterval(id)
  }, [draftKey])

  function change(value: string) {
    setSaved(false)
    setText(value)
  }

  function saveNow() {
    saveDraft(draftKey, { texts: [text], seconds })
    setSaved(true)
  }

  function finish() {
    saveDraft(draftKey, { texts: [text], seconds })
    grade.start()
  }

  return (
    <div className={`rw-root lp-tokens ww-root${eyeComfort ? ' rw-eye-comfort' : ''} rw-text-${fontSize}`}>
      <WritingTopBar exitTo={CATALOG_PATH} eyeComfort={eyeComfort} onToggleEyeComfort={setEyeComfort} fontSize={fontSize} onChangeFontSize={setFontSize}>
        <p className="rw-timer" role="timer" aria-label="Thời gian đã viết">
          <Clock3 size={14} aria-hidden="true" />
          {formatClock(seconds)}{task.timeLimitSeconds ? ` / ${formatClock(task.timeLimitSeconds)}` : ''}
        </p>
      </WritingTopBar>
      {grade.pendingNotice}
      <div className="ww-body ww-body-practice" style={{ '--ww-task-end': taskEnd, '--ww-answer-end': answerEnd } as CSSProperties}>
        <WritingTaskPanel task={task} showGuide />

        <ReadingSplitHandle value={taskEnd} label="Kéo để đổi độ rộng đề bài và bài làm"
          onChange={(percent) => setTaskEnd(Math.min(percent, answerEnd - MIN_COLUMN))} />

        <section className="ww-card ww-editor" aria-label="Bài làm">
          <header className="ww-card-head">
            <strong>Bài làm</strong>
            <span aria-live="polite">Word count: {words}</span>
          </header>
          <div className="ww-practice-field">
            <textarea value={text} aria-label="Bài làm của bạn" placeholder="Nhập bài viết của bạn ở đây" spellCheck onChange={(event) => change(event.target.value)} />
          </div>
          <footer className="ww-editor-foot">
            <p className="ww-muted">Tối thiểu {minWords} từ</p>
            <button type="button" className="ww-secondary" onClick={saveNow}>{saved ? 'Đã lưu nháp' : 'Lưu nháp'}</button>
            <button type="button" className="ww-primary" disabled={words === 0 || grade.checking} onClick={finish}>{grade.checking ? 'Đang kiểm tra point…' : 'Hoàn thành'}</button>
          </footer>
        </section>

        <ReadingSplitHandle value={answerEnd} label="Kéo để đổi độ rộng bài làm và tra từ vựng"
          onChange={(percent) => setAnswerEnd(Math.max(percent, taskEnd + MIN_COLUMN))} />

        <WritingDictionaryPanel />
      </div>
      {grade.dialogs}
    </div>
  )
}
