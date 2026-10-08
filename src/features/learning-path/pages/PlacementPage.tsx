import { useEffect, useEffectEvent, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { AssessmentAttempt, AttemptItemResponse } from '~types/learningPath'
import { learningApi, toApiError } from '../api'
import { NoticeBanner } from '../components/NoticeBanner'
import { ApiErrorState, LoadingState } from '../components/PageState'
import { parseAttemptStructure, type TestSection } from '../lib/attemptSnapshot'
import { reportApiError } from '../lib/reviewGate'
import { useApiResource } from '../lib/useApiResource'
import { useAttemptAnswers } from '../lib/useAttemptAnswers'
import { ObjectiveSectionRunner } from '../placement/ObjectiveSectionRunner'
import { PlacementDashboard } from '../placement/PlacementDashboard'
import type { SectionRunnerProps } from '../placement/PlacementExamShell'
import { PlacementResultView } from '../placement/PlacementResultView'
import { PlacementStepper } from '../placement/PlacementStepper'
import { PlacementSurvey } from '../placement/PlacementSurvey'
import { SpeakingSectionRunner } from '../placement/SpeakingSectionRunner'
import { WritingSectionRunner } from '../placement/WritingSectionRunner'
import { skillOf, type SectionTiming } from '../placement/placementSkills'
import '../placement/placement.css'

const POLL_INTERVAL_MS = 2_000
const POLL_ATTEMPTS = 45

const sleep = (ms: number) => new Promise<void>((resolve) => { window.setTimeout(resolve, ms) })

type View = 'survey' | 'test' | 'grading' | 'result'

/** Where a learner lands: no usable attempt → survey, one in progress → the test, a submitted one → its result. */
function viewFor(attempt: AssessmentAttempt | null): View {
  if (!attempt || attempt.status === 'EXPIRED' || attempt.status === 'CANCELLED') return 'survey'
  return attempt.status === 'IN_PROGRESS' ? 'test' : 'grading'
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
  const [view, setView] = useState<View>(() => viewFor(initialAttempt))
  const [surveyProgress, setSurveyProgress] = useState(0)
  const [testProgress, setTestProgress] = useState(0)
  const placement = useApiResource('placement-test', () => learningApi.getPlacementTest())
  const usableAttempt = viewFor(attempt) !== 'survey' ? attempt : null

  // Without an attempt of their own, a learner the gate reports as placed has nothing to do here.
  if (!usableAttempt && placement.status === 'error' && placement.error) {
    if (placement.error.code === 'PLACEMENT_ALREADY_DONE') return <Navigate replace to="/learn" />
    if (placement.error.code === 'NO_PLACEMENT_TEST') {
      return <p className="lp-empty">Chưa có bài kiểm tra đầu vào nào được mở. Hãy quay lại sau.</p>
    }
    return <ApiErrorState error={placement.error} onRetry={placement.reload} />
  }

  async function startTest() {
    if (usableAttempt) {
      setView('test')
      return
    }
    if (!placement.data) throw new Error('Bài kiểm tra chưa sẵn sàng.')
    const created = await learningApi.createAttempt({
      packageVersionId: placement.data.packageVersionId, attemptType: 'PLACEMENT_TEST', mode: 'STANDARD', channel: 'WEB', expiresAt: null,
    })
    setAttempt(created)
    setView('test')
  }

  const step = view === 'survey' ? 0 : view === 'test' ? 1 : 2

  return (
    <div className="lp-page pl-page">
      <NoticeBanner />
      <PlacementStepper current={step} wide={view === 'result'} progress={view === 'survey' ? surveyProgress : view === 'test' ? testProgress : view === 'result' ? 1 : 0} />

      {view === 'survey' ? (
        <PlacementSurvey onContinue={startTest} onProgress={(answered, total) => setSurveyProgress(answered / total)} />
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

      {view === 'grading' ? <PlacementGrading onGraded={() => setView('result')} /> : null}
      {view === 'result' && usableAttempt ? <PlacementResultView attemptId={usableAttempt.id} /> : null}
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
  if (data.data.sections.length === 0) return <p className="lp-empty">Đề này chưa có câu hỏi.</p>
  return <PlacementHub attempt={attempt} data={data.data} onProgress={onProgress} onRedoSurvey={onRedoSurvey} onSubmitted={onSubmitted} />
}

function PlacementHub({ attempt, data, onProgress, onSubmitted, onRedoSurvey }: PlacementTestProps & { data: TestData }) {
  const { sections } = data
  const { answers, saveStates, saveAnswer, setAnswer } = useAttemptAnswers(attempt.id, data.responses)
  const [activeSectionId, setActiveSectionId] = useState<string | null>(null)
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
  const completedShare = sections.length ? completedIds.size / sections.length : 0

  useEffect(() => {
    reportProgress(completedShare)
  }, [completedShare])

  /** Submits the whole attempt; runs on its own once the last section is completed. */
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

  /** Opens a section and tells the server when the learner first did; that is the start of its clock. */
  function openSection(sectionId: string) {
    setActiveSectionId(sectionId)
    if (timings[sectionId]?.startedAt) return
    setTimings((previous) => ({ ...previous, [sectionId]: { startedAt: new Date().toISOString(), completedAt: null } }))
    // The clock is only a note beside the finished section, so a failed call must not stop the learner.
    learningApi.startAttemptSection(attempt.id, sectionId).catch(() => {})
  }

  /** Hands a section in on the server, closes it and submits the test when no section is left open. */
  async function completeSection(sectionId: string) {
    await learningApi.completeAttemptSection(attempt.id, sectionId)
    setTimings((previous) => ({
      ...previous,
      [sectionId]: { startedAt: previous[sectionId]?.startedAt ?? null, completedAt: new Date().toISOString() },
    }))
    const next = new Set(completedIds).add(sectionId)
    setCompletedIds(next)
    setActiveSectionId(null)
    if (sections.every((section) => next.has(section.id))) await submit()
  }

  const activeIndex = sections.findIndex((section) => section.id === activeSectionId)
  const active = sections[activeIndex]
  const runnerProps: SectionRunnerProps | null = active ? {
    attemptId: attempt.id,
    section: active,
    partNumber: activeIndex + 1,
    answers,
    saveStates,
    setAnswer,
    saveAnswer,
    onExit: () => setActiveSectionId(null),
    onComplete: () => completeSection(active.id),
  } : null
  const skill = active ? skillOf(active) : null

  return (
    <>
      <PlacementDashboard
        answers={answers}
        completedIds={completedIds}
        error={error}
        onOpenSection={openSection}
        onRedoSurvey={onRedoSurvey}
        onRetrySubmit={() => void submit()}
        sections={sections}
        startedAt={attempt.startedAt}
        submitting={submitting}
        timings={timings}
      />
      {runnerProps && skill === 'WRITING' ? <WritingSectionRunner key={runnerProps.section.id} {...runnerProps} /> : null}
      {runnerProps && skill === 'SPEAKING' ? <SpeakingSectionRunner key={runnerProps.section.id} {...runnerProps} /> : null}
      {runnerProps && skill !== 'WRITING' && skill !== 'SPEAKING' ? <ObjectiveSectionRunner key={runnerProps.section.id} {...runnerProps} /> : null}
    </>
  )
}

type GradingPhase = 'grading' | 'slow' | 'failed'

/** After submitting, Learning stores the band asynchronously; courses open once it has. */
function PlacementGrading({ onGraded }: { onGraded: () => void }) {
  const [phase, setPhase] = useState<GradingPhase>('grading')
  const [error, setError] = useState<string | null>(null)
  const graded = useEffectEvent(onGraded)

  useEffect(() => {
    if (phase !== 'grading') return
    let live = true
    void (async () => {
      for (let tries = 0; tries < POLL_ATTEMPTS && live; tries += 1) {
        try {
          await learningApi.listCourses()
          if (live) graded()
          return
        } catch (reason) {
          const apiError = toApiError(reason)
          if (apiError.code !== 'PLACEMENT_REQUIRED') {
            if (live) { setError(apiError.message); setPhase('failed') }
            return
          }
        }
        await sleep(POLL_INTERVAL_MS)
      }
      if (live) setPhase('slow')
    })()
    return () => { live = false }
  }, [phase])

  return (
    <section className="lp-state lp-state--panel pl-grading" aria-live="polite">
      {phase === 'grading' ? <Loader2 aria-hidden="true" className="lp-spin" size={28} /> : null}
      <h1>{phase === 'failed' ? 'Chưa lấy được kết quả' : phase === 'slow' ? 'Kết quả đang được chấm' : 'Đang chấm bài của bạn…'}</h1>
      <p>
        {phase === 'failed'
          ? error
          : phase === 'slow'
            ? 'Việc chấm đang lâu hơn bình thường. Bài của bạn đã được nộp, hãy kiểm tra lại sau ít phút.'
            : 'Bài luận được chấm tự động nên có thể mất tới một phút. Đừng đóng trang này.'}
      </p>
      {phase !== 'grading' ? (
        <Button className="lp-btn" onClick={() => { setError(null); setPhase('grading') }} type="button">Kiểm tra lại</Button>
      ) : null}
    </section>
  )
}
