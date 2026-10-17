import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import type { SkillType } from '@/types/practice'
import { PRACTICE_SKILL_CONFIG } from '../lib/practiceSkillConfig'
import { SiteNavbar } from '@/components/SiteNavbar'
import { LoadingState, ApiErrorState } from '@/features/learning-path/components/PageState'
import { useApiResource } from '@/features/learning-path/lib/useApiResource'
import { buildReadingResultView } from '../lib/readingResultView'
import { rateFormats } from '../lib/practiceAnalysis'
import { ReadingReview } from './ReadingReview'
import { parseSections } from './readingSections'
import { ResultAnalysis, ResultDetailTable, ResultHero, ResultSummary } from './ReadingResultSections'
import { getAttemptResponses, getAttemptStructure, getReadingAttempt, getReadingResult, restartReadingAttempt } from './readingPracticeApi'
import type { AttemptResponse, ReadingScope } from './readingPracticeApi'
import './reading-practice.css'
import './reading-result.css'

function responseForAnswers(responses: AttemptResponse[]) {
  return responses.map((response) => ({ attemptItemId: response.attemptItemId, payload: response.payload }))
}

/** The result of a Reading or Listening practice attempt; both come from the same attempt API. */
export function ReadingResultPage({ review = false, skill = 'reading' }: { review?: boolean; skill?: SkillType }) {
  const { attemptId = '' } = useParams()
  const config = PRACTICE_SKILL_CONFIG[skill]
  const catalogPath = `/practice-tests?skill=${skill}`
  const attemptBase = `/practice/${skill}/attempts`
  const navigate = useNavigate()
  const [retryError, setRetryError] = useState('')
  const [retrying, setRetrying] = useState(false)
  const resource = useApiResource(`${skill}-result:${attemptId}`, async () => {
    const attempt = await getReadingAttempt(attemptId)
    if (attempt.status !== 'SUBMITTED') return { attempt, result: null, structure: null, responses: [] as AttemptResponse[] }
    const [result, structure, responses] = await Promise.all([
      getReadingResult(attemptId), getAttemptStructure(attemptId), getAttemptResponses(attemptId),
    ])
    return { attempt, result, structure, responses }
  })

  useEffect(() => {
    if (resource.status === 'success' && resource.data?.attempt.status !== 'SUBMITTED') {
      navigate(`${attemptBase}/${attemptId}`, { replace: true })
    }
  }, [attemptBase, attemptId, navigate, resource.data?.attempt.status, resource.status])

  if (resource.status === 'loading') return <LoadingState label={`Đang tải kết quả ${config.label}…`} />
  if (resource.status === 'error' && resource.error) return <ApiErrorState error={resource.error} onRetry={resource.reload} />
  if (!resource.data?.result || !resource.data.structure) return <LoadingState label="Đang mở bài làm…" />
  const { attempt, result, structure, responses } = resource.data
  const view = buildReadingResultView({ structure, responses: responseForAnswers(responses), result, attempt: {
    startedAt: attempt.startedAt ?? null,
    submittedAt: attempt.submittedAt ?? null,
  } })

  async function retry() {
    setRetrying(true)
    setRetryError('')
    try {
      const restarted = await restartReadingAttempt(attempt.packageVersionId ?? '', attempt.scope as ReadingScope, structure.sections.map((section) => section.contentSectionId), attempt.mode === 'TIMED' ? 'exam' : 'practice')
      navigate(`${attemptBase}/${restarted.id}?mode=${restarted.mode === 'TIMED' ? 'exam' : 'practice'}`)
    } catch (cause) {
      setRetryError(cause instanceof Error ? cause.message : 'Không tạo lại được bài làm.')
    } finally { setRetrying(false) }
  }

  const transcripts = new Map((result.sectionSolutions ?? []).flatMap((entry) => (entry.transcript ? [[entry.attemptSectionId, entry.transcript] as const] : [])))
  if (review) return <ReadingReview attemptId={attemptId} sections={parseSections(structure)} view={view} skill={skill} transcripts={transcripts} />

  const rated = rateFormats(view.byFormat)
  const scopeLabel = view.scope === 'PART' ? (view.sections[0]?.title ?? `Một ${config.partLabel.toLowerCase()}`) : `Toàn bộ đề (${view.sections.length} ${config.partLabel.toLowerCase()})`

  return <div className="rr-page"><SiteNavbar /><main className="rr-main">
    <Link className="rr-back" to={catalogPath}><ArrowLeft size={17} aria-hidden="true" /> Danh mục</Link>
    <div className="rr-top">
      <ResultHero view={view} />
      <ResultSummary view={view} reviewTo={`${attemptBase}/${attemptId}/review`} onRetry={() => void retry()} retrying={retrying} catalogTo={catalogPath} />
    </div>
    {retryError && <p role="alert" className="rr-error">{retryError}</p>}
    <ResultDetailTable rated={rated} scopeLabel={scopeLabel} />
    <ResultAnalysis view={view} rated={rated} partLabel={config.partLabel} catalogTo={catalogPath} practiceHref={(code) => `${catalogPath}&format=${code}`} />
  </main></div>
}
