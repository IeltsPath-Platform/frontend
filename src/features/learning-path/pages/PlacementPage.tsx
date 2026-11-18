import { useEffect, useEffectEvent, useMemo, useState } from 'react'
import { StudyActivityTracker } from '@/features/study-time/StudyActivityTracker'
import { AiWaitPanel } from '@/components/loading/AiWaitPanel'
import { essayWaitNote } from '@/components/loading/aiWaitNotes'
import { Button } from '@/components/ui/button'
import type { AssessmentAttempt, AttemptItemResponse, PlacementPool } from '~types/learningPath'
import { learningApi, toApiError } from '../api'
import { LearnTrail } from '../components/LearnTrail'
import { NoticeBanner } from '../components/NoticeBanner'
import { ApiErrorState, LoadingState } from '../components/PageState'
import { parseAttemptStructure, type TestSection } from '../lib/attemptSnapshot'
import { reportApiError } from '../lib/reviewGate'
import { useApiResource } from '../lib/useApiResource'
import { useAttemptAnswers } from '../lib/useAttemptAnswers'
import { ObjectiveSectionRunner } from '../placement/ObjectiveSectionRunner'
import { PlacementDashboard } from '../placement/PlacementDashboard'
import type { SectionRunnerProps } from '../placement/PlacementExamShell'
import { groupSections } from '../placement/placementGroups'
import { PlacementResultView } from '../placement/PlacementResultView'
import { PlacementPoolPicker } from '../placement/PlacementPoolPicker'
import { PLACEMENT_POLL_ATTEMPTS, PLACEMENT_POLL_INTERVAL_MS } from '../placement/placementPolling'
import { PlacementStepper } from '../placement/PlacementStepper'
import { PlacementSurvey } from '../placement/PlacementSurvey'
import { SpeakingSectionRunner } from '../placement/SpeakingSectionRunner'
import { WritingSectionRunner } from '../placement/WritingSectionRunner'
import type { SectionTiming } from '../placement/placementSkills'
import { StatusArt } from '@/components/StatusArt'
import '../placement/placement.css'

const sleep = (ms: number) => new Promise<void>((resolve) => { window.setTimeout(resolve, ms) })

type View = 'survey' | 'pool' | 'resume' | 'test' | 'grading' | 'result'

/** Where a learner lands: no usable attempt → survey, one in progress → the test, a submitted one → its result. */
function viewFor(attempt: AssessmentAttempt | null): View {
  if (!attempt || attempt.status === 'EXPIRED' || attempt.status === 'CANCELLED') return 'survey'
  return attempt.status === 'IN_PROGRESS' ? 'resume' : 'grading'
}

/** The placement every learner takes once: survey → four-skill test → result. All progress lives on the server. */
export function PlacementPage() {
  // Wrapped because useApiResource treats null data as still loading, and "no attempt yet" is a real answer.
  const current = useApiResource('placement-current', async () => ({ attempt: await learningApi.getCurrentPlacementAttempt() }))
  if (current.status === 'loading') return <LoadingState label="Đang tải bài kiểm tra đầu vào…" />
  if (current.status === 'error' && current.error) return <ApiErrorState error={current.error} onRetry={current.reload} />
  return <PlacementFlow initialAttempt={current.data?.attempt ?? null} />
}

function PlacementFlow({ initialAttempt }: { initialAttempt: AssessmentAttempt | null }) {
  const [attempt, setAttempt] = useState(initialAttempt)
  const [viewState, setView] = useState<View>(() => viewFor(initialAttempt))
  const [selectedPool, setSelectedPool] = useState<PlacementPool | null>(null)
  const [startError, setStartError] = useState<string | null>(null)
  const [starting, setStarting] = useState(false)
  const [cancelling, setCancelling] = useState(false)
  const [cancelError, setCancelError] = useState<string | null>(null)
  const [surveyProgress, setSurveyProgress] = useState(0)
  const [testProgress, setTestProgress] = useState(0)
  const options = useApiResource('placement-options', () => learningApi.getPlacementOptions())
  const abandonedWithPlacement = (attempt?.status === 'CANCELLED' || attempt?.status === 'EXPIRED') && options.data?.hasPlacement
  const view = viewState === 'survey' && abandonedWithPlacement ? 'pool' : viewState
  const usableAttempt = viewFor(attempt) !== 'survey' ? attempt : null

  async function startTest() {
    setSelectedPool(null)
    setStartError(null)
    setView('pool')
  }

  async function startSelectedPool() {
    const requestedPool = selectedPool
    if ((!requestedPool && !options.data?.openAssignment) || !options.data || starting) return
    setStarting(true)
    setStartError(null)
    let assignment = options.data.openAssignment
    try {
      if (options.data.retakesLeft <= 0 && !assignment) throw Object.assign(new Error('Bạn đã dùng hết lượt làm lại trong 24 giờ.'), { code: 'PLACEMENT_LIMIT_REACHED' })
      if (!assignment) {
        if (!requestedPool) return
        assignment = await learningApi.assignPlacementTest(requestedPool)
      }
      const created = await learningApi.createAttempt({
        packageVersionId: assignment.packageVersionId, attemptType: 'PLACEMENT_TEST', mode: 'STANDARD', channel: 'WEB', expiresAt: null,
      })
      setAttempt(created)
      setView('test')
    } catch (reason) {
      if (assignment) await learningApi.releasePlacementAssignment(assignment.assignmentId).catch(() => {})
      const error = toApiError(reason)
      const next = options.data.nextRetakeAt
      const when = next ? new Date(next).toLocaleString('vi-VN', { dateStyle: 'short', timeStyle: 'short' }) : null
      setStartError(error.code === 'PLACEMENT_LIMIT_REACHED'
        ? `Bạn đã dùng hết lượt làm lại trong 24 giờ.${when ? ` Có thể làm lại từ ${when}.` : ''}`
        : error.code === 'NO_PLACEMENT_TEST'
          ? 'Kho này hiện chưa có đề được xuất bản. Hãy chọn kho khác.'
          : `${error.message.replace(/[.!?]?$/, '.')} Hãy thử lại.`)
    } finally {
      setStarting(false)
    }
  }

  async function cancelOpenAttempt() {
    if (!usableAttempt || cancelling) return
    setCancelling(true)
    setCancelError(null)
    try {
      await learningApi.cancelAttempt(usableAttempt.id)
      setAttempt({ ...usableAttempt, status: 'CANCELLED' })
      setSelectedPool(null)
      setView('pool')
      options.reload()
    } catch (reason) {
      setCancelError(`${toApiError(reason).message.replace(/[.!?]?$/, '.')} Hãy thử lại.`)
    } finally {
      setCancelling(false)
    }
  }

  const step = view === 'survey' ? 0 : view === 'pool' || view === 'resume' ? 1 : view === 'test' ? 2 : 3

  return (
    <div className="lp-page pl-page">
      <NoticeBanner />
      <LearnTrail items={[{ label: 'Khóa học', to: '/learn' }, { label: 'Test đầu vào' }]} />
      <PlacementStepper current={step} wide={view === 'result'} progress={view === 'survey' ? surveyProgress : view === 'test' ? testProgress : view === 'result' ? 1 : 0} />

      {view === 'survey' ? (
        <PlacementSurvey onContinue={startTest} onProgress={(answered, total) => setSurveyProgress(answered / total)} />
      ) : null}

      {view === 'pool' ? options.status === 'loading' ? <LoadingState label="Đang tải các kho đề…" />
        : options.status === 'error' && options.error ? <ApiErrorState error={options.error} onRetry={options.reload} />
          : options.data ? <PlacementPoolPicker error={startError} onSelect={(pool) => { setSelectedPool(pool); setStartError(null) }} onStart={() => void startSelectedPool()} options={options.data} selectedPool={selectedPool} starting={starting} /> : null : null}

      {view === 'resume' && usableAttempt ? (
        <section className="lp-state lp-state--panel pl-resume" aria-labelledby="pl-resume-title">
          <h1 id="pl-resume-title">Bạn có một lượt thi đang làm</h1>
          <p>Câu trả lời đã lưu sẽ được giữ nguyên khi bạn tiếp tục.</p>
          {cancelError ? <p className="lp-error" role="alert">{cancelError}</p> : null}
          <div className="pl-resume__actions">
            <Button className="pl-btn pl-btn--accent" onClick={() => setView('test')} type="button">Tiếp tục</Button>
            <Button className="pl-btn" disabled={cancelling} onClick={() => void cancelOpenAttempt()} type="button" variant="outline">
              {cancelling ? 'Đang hủy…' : 'Hủy lượt thi này'}
            </Button>
          </div>
        </section>
      ) : null}

      {view === 'test' && usableAttempt ? (
        <PlacementTest
          attempt={usableAttempt}
          key={usableAttempt.id}
          onProgress={setTestProgress}
          onRedoSurvey={() => { setSurveyProgress(0); setView('survey') }}
          onSubmitted={(submitted) => { setAttempt(submitted); setView('grading') }}
        />
      ) : null}

      {view === 'grading' && usableAttempt ? <PlacementGrading attemptId={usableAttempt.id} onGraded={() => setView('result')} /> : null}
      {view === 'result' && usableAttempt ? <PlacementResultView attemptId={usableAttempt.id} onRetake={() => { setSelectedPool(null); options.reload(); setView('pool') }} /> : null}
    </div>
  )
}

interface PlacementTestProps {
  attempt: AssessmentAttempt
  /** Share of sections handed in, 0..1, for the stepper. */
  onProgress: (completed: number) => void
  onSubmitted: (attempt: AssessmentAttempt) => void
  onRedoSurvey: () => void
}

interface TestData {
  sections: TestSection[]
  responses: AttemptItemResponse[]
}

/** Loads the attempt's structure and its saved responses, then hands both to the hub. */
function PlacementTest({ attempt, onProgress, onSubmitted, onRedoSurvey }: PlacementTestProps) {
  const data = useApiResource<TestData>(`placement-attempt:${attempt.id}`, async () => {
    const [structure, responses] = await Promise.all([
      learningApi.getAttemptStructure(attempt.id),
      learningApi.listAttemptResponses(attempt.id),
    ])
    return { sections: parseAttemptStructure(structure), responses }
  })
  if (data.status === 'loading') return <LoadingState label="Đang tải đề…" />
  if (data.status === 'error' && data.error) return <ApiErrorState error={data.error} onRetry={data.reload} />
  if (!data.data) return null
  if (data.data.sections.length === 0) return <StatusArt compact kind="empty" title="Đề này chưa có câu hỏi." />
  return <PlacementHub attempt={attempt} data={data.data} onProgress={onProgress} onRedoSurvey={onRedoSurvey} onSubmitted={onSubmitted} />
}

function PlacementHub({ attempt, data, onProgress, onSubmitted, onRedoSurvey }: PlacementTestProps & { data: TestData }) {
  const { sections } = data
  // Each skill is one entry on the dashboard; its parts (sections) are completed together.
  const groups = useMemo(() => groupSections(sections), [sections])
  const { answers, saveStates, saveAnswer, setAnswer } = useAttemptAnswers(attempt.id, data.responses)
  const [activeGroupId, setActiveGroupId] = useState<string | null>(null)
  const [completedIds, setCompletedIds] = useState<ReadonlySet<string>>(
    () => new Set(sections.filter((section) => section.completedAt).map((section) => section.id)),
  )
  // When each section was opened and handed in; from the server on load, then kept up to date while the learner works.
  const [timings, setTimings] = useState<Record<string, SectionTiming>>(
    () => Object.fromEntries(sections.map((section) => [section.id, { startedAt: section.startedAt, completedAt: section.completedAt }])),
  )
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const reportProgress = useEffectEvent(onProgress)
  const completedShare = groups.length ? groups.filter((group) => group.sections.every((section) => completedIds.has(section.id))).length / groups.length : 0

  useEffect(() => {
    reportProgress(completedShare)
  }, [completedShare])

  /** Submits the whole attempt; runs on its own once every section is completed. */
  async function submit() {
    setSubmitting(true)
    setError(null)
    try {
      onSubmitted(await learningApi.submitAttempt(attempt.id))
    } catch (reason) {
      const apiError = toApiError(reason)
      reportApiError(apiError)
      setError(`${apiError.message.replace(/[.!?]?$/, '.')} Hãy thử nộp lại.`)
      setSubmitting(false)
    }
  }

  /** Tells the server when the learner first opened a part; that is the start of its clock. */
  function openSection(sectionId: string) {
    if (timings[sectionId]?.startedAt) return
    setTimings((previous) => ({ ...previous, [sectionId]: { startedAt: new Date().toISOString(), completedAt: null } }))
    // The clock is only a note beside the finished skill, so a failed call must not stop the learner.
    learningApi.startAttemptSection(attempt.id, sectionId).catch(() => {})
  }

  /** Hands in every open part of a skill, one after another, and submits the test when no section is left open. */
  async function completeGroup(groupId: string) {
    const group = groups.find((candidate) => candidate.id === groupId)
    if (!group) return
    const done = new Set(completedIds)
    for (const section of group.sections) {
      if (done.has(section.id)) continue
      // A part the learner never opened still gets its clock started, so it can be completed.
      if (!timings[section.id]?.startedAt) {
        await learningApi.startAttemptSection(attempt.id, section.id).catch(() => {})
        setTimings((previous) => ({ ...previous, [section.id]: { startedAt: new Date().toISOString(), completedAt: null } }))
      }
      await learningApi.completeAttemptSection(attempt.id, section.id)
      done.add(section.id)
      setTimings((previous) => ({
        ...previous,
        [section.id]: { startedAt: previous[section.id]?.startedAt ?? null, completedAt: new Date().toISOString() },
      }))
      setCompletedIds(new Set(done))
    }
    setActiveGroupId(null)
    if (sections.every((section) => done.has(section.id))) await submit()
  }

  const activeGroup = groups.find((group) => group.id === activeGroupId)
  const runnerProps: SectionRunnerProps | null = activeGroup ? {
    attemptId: attempt.id,
    group: activeGroup,
    answers,
    saveStates,
    setAnswer,
    saveAnswer,
    onOpenPart: openSection,
    onExit: () => setActiveGroupId(null),
    onComplete: () => completeGroup(activeGroup.id),
  } : null

  return (
    <>
      <StudyActivityTracker sourceType="ASSESSMENT" sourceId={attempt.id} />
      <PlacementDashboard
        answers={answers}
        completedIds={completedIds}
        error={error}
        groups={groups}
        onOpenGroup={setActiveGroupId}
        onRedoSurvey={onRedoSurvey}
        onRetrySubmit={() => void submit()}
        startedAt={attempt.startedAt}
        submitting={submitting}
        timings={timings}
      />
      {runnerProps && runnerProps.group.skill === 'WRITING' ? <WritingSectionRunner key={runnerProps.group.id} {...runnerProps} /> : null}
      {runnerProps && runnerProps.group.skill === 'SPEAKING' ? <SpeakingSectionRunner key={runnerProps.group.id} {...runnerProps} /> : null}
      {runnerProps && runnerProps.group.skill !== 'WRITING' && runnerProps.group.skill !== 'SPEAKING' ? <ObjectiveSectionRunner key={runnerProps.group.id} {...runnerProps} /> : null}
    </>
  )
}

type GradingPhase = 'grading' | 'slow' | 'failed'

/** After submitting, Learning stores the band asynchronously; courses open once it has. */
/** Waits for the result: the placement result is not found until every essay is graded and the attempt completes. */
function PlacementGrading({ attemptId, onGraded }: { attemptId: string; onGraded: () => void }) {
  const [phase, setPhase] = useState<GradingPhase>('grading')
  const [error, setError] = useState<string | null>(null)
  const graded = useEffectEvent(onGraded)

  useEffect(() => {
    if (phase !== 'grading') return
    let live = true
    void (async () => {
      for (let tries = 0; tries < PLACEMENT_POLL_ATTEMPTS && live; tries += 1) {
        try {
          await learningApi.getPlacementResult(attemptId)
          if (live) graded()
          return
        } catch (reason) {
          const apiError = toApiError(reason)
          if (apiError.code !== 'NOT_FOUND') {
            if (live) { setError(apiError.message); setPhase('failed') }
            return
          }
        }
        await sleep(PLACEMENT_POLL_INTERVAL_MS)
      }
      if (live) setPhase('slow')
    })()
    return () => { live = false }
  }, [phase, attemptId])

  return (
    phase === 'grading' ? (
      <div className="pl-grading">
        <AiWaitPanel
          hint="Bài luận được chấm tự động nên có thể mất tới một phút. Đừng đóng trang này."
          note={essayWaitNote}
          title="Đang chấm bài của bạn"
        />
      </div>
    ) : (
    <section className="lp-state lp-state--panel pl-grading" aria-live="polite">
      <h1>{phase === 'failed' ? 'Chưa lấy được kết quả' : 'Kết quả đang được chấm'}</h1>
      <p>
        {phase === 'failed'
          ? error
          : 'Việc chấm đang lâu hơn bình thường. Bài của bạn đã được nộp, hãy kiểm tra lại sau ít phút.'}
      </p>
      <Button className="lp-btn" onClick={() => { setError(null); setPhase('grading') }} type="button">Kiểm tra lại</Button>
    </section>
    )
  )
}
