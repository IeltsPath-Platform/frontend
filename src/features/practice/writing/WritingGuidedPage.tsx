import { useEffect, useMemo, useRef, useState } from 'react'
import { Lightbulb, Lock, Pencil } from 'lucide-react'
import type { WorkspaceFontSize } from '../reading/ReadingWorkspaceParts'
import { WritingChart, WritingDictionaryPanel, WritingTopBar } from './WritingParts'
import type { GuideStep, WritingTask } from './writingApi'
import { countWords, joinSteps, loadDraft, saveDraft } from './writingText'
import { useGradeFlow } from './useGradeFlow'

const CATALOG_PATH = '/practice-tests?skill=writing'

/** The hint panel: the theory of the current step. Sentence frame, useful phrases and sample are not shown yet; they will come from the API. */
function HintPanel({ step, complete }: { step: GuideStep; complete: boolean }) {
  if (complete) {
    return (
      <div className="ww-hint">
        <h2 className="ww-hint-title"><Lightbulb size={15} aria-hidden="true" /> Gợi ý</h2>
        <p>Bạn đã hoàn thành cả {step.no} bước. Bấm Hoàn thành, hoặc quay lại sửa từng câu.</p>
      </div>
    )
  }
  return (
    <div className="ww-hint">
      <h2 className="ww-hint-title"><Lightbulb size={15} aria-hidden="true" /> Gợi ý · Bước {step.no}</h2>
      <h3>LÝ THUYẾT</h3>
      <p>{step.theory}</p>
    </div>
  )
}

/** Step-by-step writing: one sentence at a time, with theory and hints. Finishing checks the points and offers the AI grade. */
export function WritingGuidedPage({ task, steps }: { task: WritingTask; steps: GuideStep[] }) {
  const draftKey = `${task.sectionId}:guided`
  const initial = useMemo(() => loadDraft(draftKey), [draftKey])
  const [sentences, setSentences] = useState<string[]>(() => steps.map((_, index) => initial?.texts[index] ?? ''))
  const [current, setCurrent] = useState(() => Math.min(initial?.step ?? 0, steps.length))
  const [seconds, setSeconds] = useState(initial?.seconds ?? 0)
  const [eyeComfort, setEyeComfort] = useState(false)
  const [fontSize, setFontSize] = useState<WorkspaceFontSize>('medium')
  const stateRef = useRef({ sentences, current, seconds })
  const essay = joinSteps(steps, sentences)
  const words = countWords(essay)
  const complete = current >= steps.length
  const active = steps[Math.min(current, steps.length - 1)]!
  const grade = useGradeFlow({
    task, mode: 'guided', draftKey, essay, seconds, label: 'Hướng dẫn từng bước',
    benefits: ['Band tổng và điểm 4 tiêu chí', 'Bài viết được đánh dấu lỗi và đối chiếu với từng bước', 'Gợi ý sửa và việc nên làm trước'],
    extraChecks: [
      { text: `${Math.min(current, steps.length)}/${steps.length} bước hoàn thành`, ok: complete },
    ],
  })

  useEffect(() => { stateRef.current = { sentences, current, seconds } }, [sentences, current, seconds])
  useEffect(() => {
    const id = window.setInterval(() => setSeconds((value) => value + 1), 1000)
    return () => window.clearInterval(id)
  }, [])
  useEffect(() => {
    const id = window.setInterval(() => {
      const state = stateRef.current
      saveDraft(draftKey, { texts: state.sentences, seconds: state.seconds, step: state.current })
    }, 5000)
    return () => window.clearInterval(id)
  }, [draftKey])

  function next() {
    if (!sentences[current]?.trim()) return
    setCurrent((value) => Math.min(steps.length, Math.max(value, current + 1)))
  }

  function finish() {
    saveDraft(draftKey, { texts: sentences, seconds, step: current })
    grade.start()
  }

  const stepLabel = complete ? `Bước ${steps.length} / ${steps.length} · Hoàn thành` : `Bước ${current + 1} / ${steps.length} · ${active.section} — ${active.title}`
  const percent = Math.round((Math.min(current, steps.length) / steps.length) * 100)

  return (
    <div className={`rw-root lp-tokens ww-root${eyeComfort ? ' rw-eye-comfort' : ''} rw-text-${fontSize}`}>
      <WritingTopBar exitTo={CATALOG_PATH} eyeComfort={eyeComfort} onToggleEyeComfort={setEyeComfort} fontSize={fontSize} onChangeFontSize={setFontSize}>
        <p className="ww-step-label">{stepLabel}</p>
        <div className="ww-progress" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={percent} aria-label="Tiến độ các bước"><i style={{ width: `${percent}%` }} /></div>
      </WritingTopBar>

      {grade.pendingNotice}
      <div className="ww-body ww-body-guided">
        <section className="ww-card ww-task" aria-label="Đề bài">
          <div className="ww-task-scroll">
            <p className="ww-prompt">{task.prompt}</p>
            <WritingChart task={task} />
          </div>
        </section>

        <section className="ww-card ww-editor" aria-label="Hướng dẫn từng bước">
          <header className="ww-card-head"><strong>Hướng dẫn từng bước</strong><span aria-live="polite">Word count: {words}</span></header>
          <ol className="ww-steps">
            {steps.map((step, index) => {
              const done = index < current
              const isCurrent = index === current
              const locked = index > current
              return (
                <li key={step.no} className={`ww-step${done ? ' is-done' : ''}${isCurrent ? ' is-current' : ''}${locked ? ' is-locked' : ''}`}>
                  <span className="ww-step-dot" aria-hidden="true">{done ? '✓' : locked ? <Lock size={10} /> : step.no}</span>
                  <div className="ww-step-body">
                    <p className="ww-step-name"><span>{step.no} · {step.section}</span> — {step.title}
                      {done && <button type="button" className="ww-edit" onClick={() => setCurrent(index)}><Pencil size={11} aria-hidden="true" /> Sửa</button>}
                    </p>
                    {done && <p className="ww-step-text">{sentences[index]}</p>}
                    {isCurrent && (
                      <>
                        <p className="ww-muted">{step.instruction}</p>
                        <textarea value={sentences[index]} rows={3} autoFocus aria-label={`Câu của bước ${step.no}`} placeholder="Viết câu của bạn ở đây"
                          onChange={(event) => setSentences((values) => values.map((value, i) => (i === index ? event.target.value : value)))} />
                        <div className="ww-step-foot">
                          <span className="ww-muted">{countWords(sentences[index] ?? '')} từ</span>
                          <button type="button" className="ww-primary" disabled={!sentences[index]?.trim()} onClick={next}>Tiếp tục</button>
                        </div>
                      </>
                    )}
                  </div>
                </li>
              )
            })}
          </ol>
          <footer className="ww-editor-foot">
            <p className="ww-muted">{complete ? `Đã xong cả ${steps.length} bước` : 'Hoàn thành các bước để mở “Hoàn thành”'}</p>
            <button type="button" className="ww-primary" disabled={!complete || grade.checking} onClick={finish}>{grade.checking ? 'Đang kiểm tra point…' : 'Hoàn thành'}</button>
          </footer>
        </section>

        <WritingDictionaryPanel>
          <HintPanel step={complete ? steps[steps.length - 1]! : active} complete={complete} />
        </WritingDictionaryPanel>
      </div>
      {grade.dialogs}
    </div>
  )
}
