import { useEffect, useMemo, useRef, useState } from 'react'
import { Clock3 } from 'lucide-react'
import type { WorkspaceFontSize } from '../reading/ReadingWorkspaceParts'
import { WritingDictionaryPanel, WritingTaskPanel, WritingTopBar } from './WritingParts'
import type { WritingTask } from './writingApi'
import { countWords, essaySections, formatClock, joinSections, loadDraft, saveDraft } from './writingText'
import { useGradeFlow } from './useGradeFlow'

const CATALOG_PATH = '/practice-tests?skill=writing'

/** Free writing: the whole essay in its parts, written without help. Finishing checks the points and offers the AI grade. */
export function WritingFreePage({ task }: { task: WritingTask }) {
  const sections = useMemo(() => essaySections(task.task), [task.task])
  const draftKey = `${task.sectionId}:free`
  const [texts, setTexts] = useState<string[]>(() => {
    const draft = loadDraft(draftKey)
    return sections.map((_, index) => draft?.texts[index] ?? '')
  })
  const [seconds, setSeconds] = useState(() => loadDraft(draftKey)?.seconds ?? 0)
  const [saved, setSaved] = useState(false)
  const [eyeComfort, setEyeComfort] = useState(false)
  const [fontSize, setFontSize] = useState<WorkspaceFontSize>('medium')
  const textsRef = useRef(texts)
  const secondsRef = useRef(seconds)
  const essay = joinSections(texts)
  const words = countWords(essay)
  const filled = texts.filter((text) => text.trim()).length
  const grade = useGradeFlow({
    task, mode: 'free', draftKey, essay, seconds, label: 'Viết tự do',
    benefits: ['Band tổng và điểm 4 tiêu chí', 'Bài viết được đánh dấu lỗi ngữ pháp, từ vựng, mạch lạc', 'Gợi ý sửa và việc nên làm trước'],
    extraChecks: [{ text: `${filled}/${sections.length} phần: ${sections.join(', ')}`, ok: filled === sections.length }],
  })

  useEffect(() => { textsRef.current = texts }, [texts])
  useEffect(() => { secondsRef.current = seconds }, [seconds])
  useEffect(() => {
    const id = window.setInterval(() => setSeconds((current) => current + 1), 1000)
    return () => window.clearInterval(id)
  }, [])
  // The draft is kept while the learner writes, so a closed tab never loses the essay.
  useEffect(() => {
    const id = window.setInterval(() => saveDraft(draftKey, { texts: textsRef.current, seconds: secondsRef.current }), 5000)
    return () => window.clearInterval(id)
  }, [draftKey])

  function change(index: number, value: string) {
    setSaved(false)
    setTexts((current) => current.map((text, i) => (i === index ? value : text)))
  }

  function saveNow() {
    saveDraft(draftKey, { texts, seconds })
    setSaved(true)
  }

  function finish() {
    saveDraft(draftKey, { texts, seconds })
    grade.start()
  }

  return (
    <div className={`rw-root lp-tokens ww-root${eyeComfort ? ' rw-eye-comfort' : ''} rw-text-${fontSize}`}>
      <WritingTopBar exitTo={CATALOG_PATH} eyeComfort={eyeComfort} onToggleEyeComfort={setEyeComfort} fontSize={fontSize} onChangeFontSize={setFontSize} />
      {grade.pendingNotice}
      <div className="ww-body ww-body-free">
        <WritingTaskPanel task={task} showGuide />

        <section className="ww-card ww-editor" aria-label="Bài viết của bạn">
          <header className="ww-card-head">
            <strong>{task.title}</strong>
            <span aria-live="polite">Word count: {words}</span>
          </header>
          <div className="ww-editor-scroll">
            {sections.map((label, index) => (
              <label key={label} className="ww-field">
                <span className="ww-field-label">{label}</span>
                <textarea value={texts[index]} rows={index === 0 ? 3 : 5} placeholder="Nhập phần viết của bạn ở đây" spellCheck onChange={(event) => change(index, event.target.value)} />
              </label>
            ))}
          </div>
          <footer className="ww-editor-foot">
            <p className="ww-time"><Clock3 size={13} aria-hidden="true" /> Thời gian: {formatClock(seconds)}{task.timeLimitSeconds ? ` / ${formatClock(task.timeLimitSeconds)}` : ''}</p>
            <button type="button" className="ww-secondary" onClick={saveNow}>{saved ? 'Đã lưu nháp' : 'Lưu nháp'}</button>
            <button type="button" className="ww-primary" disabled={words === 0 || grade.checking} onClick={finish}>{grade.checking ? 'Đang kiểm tra point…' : 'Hoàn thành'}</button>
          </footer>
        </section>

        <WritingDictionaryPanel />
      </div>
      {grade.dialogs}
    </div>
  )
}
