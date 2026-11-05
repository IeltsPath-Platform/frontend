import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, Navigate, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { ArrowLeft, Check, CircleAlert, Mic, Play, Radio } from 'lucide-react'
import { SiteNavbar } from '@/components/SiteNavbar'
import { Button } from '@/components/ui/button'
import { ApiErrorState, LoadingState } from '@/features/learning-path/components/PageState'
import { useApiResource } from '@/features/learning-path/lib/useApiResource'
import { formatDuration } from '../lib/time'
import { SpeakingResultScreen } from './SpeakingSubmissionResultPage'
import { getSpeakingTask } from './speakingApi'
import type { SpeakingTask } from './speakingApi'
import { parseCueCard } from './speakingCue'
import type { RecordingToSend } from './sendSpeakingSubmission'
import { clearSession, useSessionRecordings } from './speakingSession'
import { useLeaveWarning } from './useLeaveWarning'
import { useSpeakingGradeFlow } from './useSpeakingGradeFlow'
import '../skill-workspaces.css'
import './speaking-workspace.css'
import './speaking-review.css'

const CATALOG_PATH = '/practice-tests?skill=speaking'
const ID = /^[0-9a-f-]{36}$/i

/** Plays one recording at a time; pressing the same one again, or leaving, stops it. */
function useRecordingPlayer() {
  const [playing, setPlaying] = useState<string | null>(null)
  const current = useRef<{ audio: HTMLAudioElement; url: string; id: string } | null>(null)

  const stop = useCallback(() => {
    const entry = current.current
    if (!entry) return
    current.current = null
    entry.audio.pause()
    URL.revokeObjectURL(entry.url)
    setPlaying(null)
  }, [])

  useEffect(() => stop, [stop])

  const toggle = useCallback((id: string, blob: Blob) => {
    const wasPlaying = current.current?.id === id
    stop()
    if (wasPlaying) return
    const url = URL.createObjectURL(blob)
    const entry = { audio: new Audio(url), url, id }
    current.current = entry
    setPlaying(id)
    const finish = () => { if (current.current === entry) stop() }
    entry.audio.onended = finish
    entry.audio.onerror = finish
    void entry.audio.play().catch(finish)
  }, [stop])

  return { playing, toggle }
}

/**
 * The review after the last answer: every question of the test with its recording, so the learner can listen, record again
 * what they are not happy with, and see what is still missing before anything is sent. The recordings are the ones kept
 * for this test while they answered.
 */
export function SpeakingReviewPage() {
  const { packageVersionId = '' } = useParams()
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const parts = (params.get('parts') ?? '').split(',').filter((id) => ID.test(id))
  const resource = useApiResource(`speaking-review:${packageVersionId}:${parts.join(',')}`, () => Promise.all(parts.map((id) => getSpeakingTask(packageVersionId, id))))
  const recordings = useSessionRecordings(packageVersionId)
  const player = useRecordingPlayer()
  useLeaveWarning(recordings.size > 0)

  const tasks = resource.data
  const questions = (tasks ?? []).flatMap((task) => task.questions)
  const recorded = questions.filter((question) => recordings.has(question.questionVersionId))
  const silent = recorded.filter((question) => recordings.get(question.questionVersionId)?.silent).length
  const missing = questions.length - recorded.length
  const seconds = recorded.reduce((total, question) => total + (recordings.get(question.questionVersionId)?.durationSeconds ?? 0), 0)
  const toSend: RecordingToSend[] = (tasks ?? []).flatMap((task) => task.questions.flatMap((question, index) => {
    const recording = recordings.get(question.questionVersionId)
    return recording ? [{
      questionVersionId: question.questionVersionId,
      label: `${task.partNo ? `Part ${task.partNo}` : task.title}, câu ${index + 1}`,
      recording,
    }] : []
  }))
  const grading = useSpeakingGradeFlow({
    context: `Speaking · ${(tasks ?? []).map((task) => (task.partNo ? `Part ${task.partNo}` : task.title)).join(', ')} · ${tasks?.[0]?.packageTitle ?? 'Luyện tập'}`,
    packageVersionId,
    partSectionIds: parts,
    recordings: toSend,
    seconds,
  })

  // Once the answers are sent and the learner asks for the result, it is shown here, on the same page.
  if (grading.viewingId) return <SpeakingResultScreen submissionId={grading.viewingId} />
  if (!packageVersionId || parts.length === 0) return <Navigate replace to={CATALOG_PATH} />
  if (resource.status === 'loading') return <LoadingState label="Đang tải bài của bạn…" />
  if (resource.status === 'error' && resource.error) return <ApiErrorState error={resource.error} onRetry={resource.reload} />
  if (!tasks) return null

  const lastTask = tasks[tasks.length - 1]
  const recordPath = (task: SpeakingTask, index: number) => `/practice/speaking/tasks/${packageVersionId}/${task.sectionId}?parts=${parts.join(',')}&q=${index}`
  const backPath = lastTask ? recordPath(lastTask, Math.max(0, lastTask.questions.length - 1)) : CATALOG_PATH

  const problem = missing > 0
    ? `Còn ${missing} câu chưa ghi âm.`
    : silent > 0
      ? `${silent} bản ghi không có tiếng. Hãy ghi lại các câu đó.`
      : null

  return (
    <div className="practice-workspace-root speaking-workspace sv-page">
      <SiteNavbar />
      <header className="skill-page-topbar">
        <button type="button" className="subbar-exit-btn" onClick={() => { clearSession(packageVersionId); navigate(CATALOG_PATH) }}>
          <ArrowLeft aria-hidden="true" size={16} />Thoát
        </button>
        <div><span className="practice-mode-badge">Speaking</span><strong>Xem lại bài của bạn</strong></div>
        <Radio aria-hidden="true" size={21} />
      </header>

      <main className="sv-stage">
        <section className="sv-card" aria-labelledby="sv-heading">
          <div className="sv-head">
            <p className="sv-eyebrow">Đã trả lời xong</p>
            <h1 id="sv-heading" className="sv-title">Xem lại bài Speaking của bạn</h1>
            <p className="sv-lead">Nghe lại từng câu. Câu nào chưa vừa ý thì ghi lại trước khi nộp.</p>

            <p className={`sv-summary${problem ? ' has-problem' : ' is-ready'}`} role="status">
              {problem ? <CircleAlert aria-hidden="true" size={16} /> : <Check aria-hidden="true" size={16} />}
              <span>
                <strong>{recorded.length}/{questions.length} câu</strong> đã ghi âm · tổng {formatDuration(seconds)}
                {problem ? ` · ${problem}` : ' · Đã đủ bản ghi.'}
              </span>
            </p>
          </div>

          {/* Only this list scrolls, when a long test has more questions than the screen holds; the summary and the buttons stay in view. */}
          <div className="sv-scroll" role="region" aria-label="Các câu hỏi" tabIndex={0}>
          {tasks.map((task) => (
            <section className="sv-part" key={task.sectionId} aria-label={task.partNo ? `Part ${task.partNo}` : task.title}>
              <h2 className="sv-part-title">
                <span className="sq-badge">{task.partNo ? `Part ${task.partNo}` : 'Speaking'}</span>
                <span>{task.title}</span>
              </h2>
              <ol className="sv-list">
                {task.questions.map((question, index) => {
                  const recording = recordings.get(question.questionVersionId)
                  const isPlaying = player.playing === question.questionVersionId
                  const number = index + 1
                  return (
                    <li className={`sv-row${recording ? (recording.silent ? ' is-silent' : ' is-done') : ' is-missing'}`} key={question.questionVersionId}>
                      <span className="sv-no" aria-hidden="true">{number}</span>
                      <div className="sv-body">
                        <p className="sv-prompt">{parseCueCard(question.prompt).topic}</p>
                        <p className="sv-status">
                          {!recording ? 'Chưa ghi âm' : recording.silent ? 'Không thu được tiếng nói' : `Đã ghi âm · ${formatDuration(recording.durationSeconds)}`}
                        </p>
                      </div>
                      <div className="sv-controls">
                        {recording && (
                          <button
                            type="button"
                            className={`sv-play${isPlaying ? ' is-playing' : ''}`}
                            aria-label={`${isPlaying ? 'Dừng nghe' : 'Nghe lại'} câu ${number}`}
                            onClick={() => player.toggle(question.questionVersionId, recording.blob)}
                          >
                            <span className="sv-play-badge" aria-hidden="true">
                              {isPlaying
                                ? <span className="sv-eq"><i /><i /><i /></span>
                                : <Play size={13} fill="currentColor" />}
                            </span>
                            {isPlaying ? 'Đang phát' : 'Nghe lại'}
                          </button>
                        )}
                        <Link className="sv-record" to={recordPath(task, index)} aria-label={`${recording ? 'Ghi lại' : 'Ghi âm'} câu ${number}`}>
                          <Mic aria-hidden="true" size={14} />{recording ? 'Ghi lại' : 'Ghi âm'}
                        </Link>
                      </div>
                    </li>
                  )
                })}
              </ol>
            </section>
          ))}
          </div>

          <div className="sv-actions">
            <Link className="sv-back" to={backPath}><ArrowLeft aria-hidden="true" size={16} />Quay lại</Link>
            <div className="sv-continue">
              <Button type="button" disabled={problem !== null || grading.checking} aria-describedby={problem ? 'sv-continue-note' : undefined} onClick={grading.start}>
                {grading.checking ? 'Đang kiểm tra…' : 'Tiếp tục'}
              </Button>
              {problem && <p id="sv-continue-note" className="sv-note">{problem} Hoàn tất các câu này để tiếp tục.</p>}
            </div>
          </div>
        </section>
      </main>
      {grading.dialogs}
    </div>
  )
}
