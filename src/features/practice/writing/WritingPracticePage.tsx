import { useEffect, useRef, useState } from 'react'
import type { CSSProperties } from 'react'
import { Clock3 } from 'lucide-react'
import { Switch } from '@/components/ui/switch'
import { ReadingSplitHandle } from '../reading/ReadingWorkspaceParts'
import type { WorkspaceFontSize } from '../reading/ReadingWorkspaceParts'
import { WritingDictionaryPanel, WritingTaskPanel, WritingTopBar } from './WritingParts'
import type { WritingTask } from './writingApi'
import { boldRuns, countWords, essaySections, formatClock, joinSections, loadDraft, saveDraft } from './writingText'
import { useGradeFlow } from './useGradeFlow'
import { StudyActivityTracker } from '@/features/study-time/StudyActivityTracker'
import { usePracticeSession } from '@/features/study-time/usePracticeSession'

const CATALOG_PATH = '/practice-tests?skill=writing'

/** The least a column may take, in percent of the width, so dragging one bar never squeezes the next one shut. */
const MIN_COLUMN = 20

/** A draft written before the answer was split in parts holds the whole essay in one text; it goes in the first part. */
function restoreParts(saved: string[] | undefined, count: number) {
  if (!saved?.length) return Array.from({ length: count }, () => '')
  if (saved.length === count) return saved
  return Array.from({ length: count }, (_, index) => (index === 0 ? saved.join('\n\n') : ''))
}

/** The model answer in the parts of the essay, without its ** marks; when it does not split into those parts it all goes in the first. */
function sampleParts(sample: string, count: number) {
  const paragraphs = sample.split(/\n\s*\n/).map((paragraph) => paragraph.trim()).filter(Boolean)
  const parts = paragraphs.length === count ? paragraphs : [sample.trim()]
  return Array.from({ length: count }, (_, index) => boldRuns(parts[index] ?? '').map((run) => run.text).join(''))
}

/**
 * The practice screen: three panels side by side, each with a bar to drag. The task with its guide and notes, the answer in
 * its parts (Task 1: introduction, overview, two bodies; Task 2: introduction, two bodies, conclusion), and the dictionary.
 * Finishing checks the points and offers the AI grade.
 */
export function WritingPracticePage({ task }: { task: WritingTask }) {
  const practiceSessionId = usePracticeSession('WRITING', true)
  const draftKey = `${task.sectionId}:practice`
  const sections = essaySections(task.task)
  const [texts, setTexts] = useState(() => restoreParts(loadDraft(draftKey)?.texts, sections.length))
  const text = joinSections(texts)
  const [seconds, setSeconds] = useState(() => loadDraft(draftKey)?.seconds ?? 0)
  const [saved, setSaved] = useState(false)
  // While the model answer is shown the boxes hold it, read only; what the learner wrote is kept and comes back.
  const [showSample, setShowSample] = useState(false)
  const [eyeComfort, setEyeComfort] = useState(false)
  const [fontSize, setFontSize] = useState<WorkspaceFontSize>('medium')
  // Where the two bars sit, in percent of the width: the task ends at the first, the answer at the second.
  const [taskEnd, setTaskEnd] = useState(30)
  const [answerEnd, setAnswerEnd] = useState(72)
  const draft = useRef({ texts, seconds })
  const sample = task.sampleAnswer?.trim() ? sampleParts(task.sampleAnswer, sections.length) : null
  const words = countWords(text)
  const minWords = task.minWords ?? (task.task === 'TASK_2' ? 250 : 150)
  const grade = useGradeFlow({
    task, mode: 'practice', draftKey, essay: text, seconds, label: 'Luyện tập',
    benefits: ['Band tổng và điểm 4 tiêu chí', 'Bài viết được đánh dấu lỗi ngữ pháp, từ vựng, mạch lạc', 'Gợi ý sửa và việc nên làm trước'],
    extraChecks: [],
  })

  useEffect(() => { draft.current = { texts, seconds } }, [texts, seconds])
  useEffect(() => {
    const id = window.setInterval(() => setSeconds((current) => current + 1), 1000)
    return () => window.clearInterval(id)
  }, [])
  // The draft is kept while the learner writes, so a closed tab never loses the essay.
  useEffect(() => {
    const id = window.setInterval(() => saveDraft(draftKey, { texts: draft.current.texts, seconds: draft.current.seconds }), 5000)
    return () => window.clearInterval(id)
  }, [draftKey])

  // While the model answer is shown nothing is written, saved or sent: the boxes hold the sample, not the learner's essay.
  function change(index: number, value: string) {
    if (showSample) return
    setSaved(false)
    setTexts((previous) => previous.map((part, partIndex) => (partIndex === index ? value : part)))
  }

  function saveNow() {
    if (showSample) return
    saveDraft(draftKey, { texts, seconds })
    setSaved(true)
  }

  function finish() {
    if (showSample) return
    saveDraft(draftKey, { texts, seconds })
    grade.start()
  }

  return (
    <div className={`rw-root lp-tokens ww-root${eyeComfort ? ' rw-eye-comfort' : ''} rw-text-${fontSize}`}>
      {practiceSessionId && <StudyActivityTracker sourceType="WRITING" sourceId={practiceSessionId} enabled />}
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
            <div className="ww-card-title">
              <strong>Bài làm</strong>
              {sample && (
                <label className="ww-sample-switch">
                  <Switch aria-label="Bài mẫu" checked={showSample} onCheckedChange={setShowSample} />
                  <span>Bài mẫu</span>
                </label>
              )}
            </div>
            <span aria-live="polite">Word count: {words}</span>
          </header>
          <div className="ww-practice-parts" role="group" aria-label="Bài làm của bạn">
            {sections.map((section, index) => (
              <div className={`ww-practice-part${showSample ? ' is-sample' : ''}`} key={section}>
                <label htmlFor={`ww-part-${index}`}>{section}</label>
                <textarea id={`ww-part-${index}`} value={showSample && sample ? sample[index] ?? '' : texts[index] ?? ''}
                  placeholder={`Viết phần ${section} của bạn ở đây…`} spellCheck readOnly={showSample}
                  onChange={(event) => change(index, event.target.value)} />
              </div>
            ))}
          </div>
          <footer className="ww-editor-foot">
            <p className="ww-muted">Tối thiểu {minWords} từ</p>
            <button type="button" className="ww-secondary" disabled={showSample} onClick={saveNow}>{saved ? 'Đã lưu nháp' : 'Lưu nháp'}</button>
            <button type="button" className="ww-primary" disabled={words === 0 || grade.checking || showSample} onClick={finish}>{grade.checking ? 'Đang kiểm tra point…' : 'Hoàn thành'}</button>
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
