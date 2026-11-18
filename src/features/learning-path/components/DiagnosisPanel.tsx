import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, Loader2, SearchCheck } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useConfirmDialog } from '@/lib/useConfirmDialog'
import type { DiagnosticProbeSummary, ReviewDetail } from '~types/learningPath'
import { learningApi, toApiError } from '../api'
import { userMessage } from '../api/apiError'
import { diagnosticProbePath, reviewPath } from '../lib/masteryGuide'
import { reportApiError } from '../lib/reviewGate'
import { useApiResource } from '../lib/useApiResource'
import { ApiErrorState } from './PageState'

function probeStatusText(probe: DiagnosticProbeSummary): string {
  switch (probe.status) {
    case 'OPEN':
      return 'Chưa làm'
    case 'NO_SET':
      return 'Chưa có câu hỏi cho điểm này'
    case 'SKIPPED':
      return 'Đã bỏ qua'
    case 'ANSWERED': {
      const score = probe.total === null ? '' : ` (${probe.correct ?? 0}/${probe.total} câu)`
      return `${probe.result === 'PASSED' ? 'Đạt' : 'Chưa đạt'}${score}`
    }
  }
}

/**
 * The probes a review opened on its prerequisites. The learner answers them, or skips the rest once at least one is
 * answered; the review gives no set until the diagnosis is concluded.
 */
export function DiagnosisPanel({ review, onChanged }: { review: ReviewDetail; onChanged: () => void }) {
  const sessionId = review.diagnosticSessionId ?? ''
  const diagnosis = useApiResource(`diagnostic:${sessionId}`, () => learningApi.getDiagnostic(sessionId))
  const { confirm, confirmDialog } = useConfirmDialog()
  const [skipping, setSkipping] = useState(false)
  const [skipError, setSkipError] = useState<string | null>(null)

  if (diagnosis.status === 'loading') {
    return (
      <p className="lp-hint" role="status">
        <Loader2 aria-hidden="true" className="lp-spin" size={16} /> Đang tải bài kiểm tra kiến thức nền…
      </p>
    )
  }
  if (diagnosis.status === 'error' && diagnosis.error) {
    return <ApiErrorState error={diagnosis.error} onRetry={diagnosis.reload} />
  }
  if (!diagnosis.data) return null
  const data = diagnosis.data
  const canSkip = data.probes.some((probe) => probe.status === 'ANSWERED')
  const hasOpenProbe = data.probes.some((probe) => probe.status === 'OPEN')

  async function skip() {
    const sure = await confirm({
      title: 'Bỏ qua phần kiểm tra còn lại?',
      message: 'Các bài kiểm tra chưa làm sẽ được đóng. Hệ thống dựa vào những bài bạn đã làm để chọn kiến thức cần ôn trước.',
      confirmLabel: 'Bỏ qua',
    })
    if (!sure) return
    setSkipping(true)
    setSkipError(null)
    try {
      await learningApi.skipDiagnostic(sessionId)
      onChanged()
    } catch (reason) {
      const error = toApiError(reason)
      reportApiError(error)
      setSkipError(userMessage(error))
      // A closed or concluded diagnosis changed under the learner: show the review as it is now.
      if (error.code === 'NOT_FOUND' || error.code === 'PROBE_CLOSED') onChanged()
    } finally {
      setSkipping(false)
    }
  }

  return (
    <section aria-labelledby="lp-diagnosis-title" className="lp-diagnosis">
      <h2 id="lp-diagnosis-title"><SearchCheck aria-hidden="true" size={20} />Kiểm tra kiến thức nền</h2>
      <p>
        Bạn chưa đạt bài ôn này hai lần. Hãy làm các bài kiểm tra ngắn dưới đây để tìm ra kiến thức nền còn hổng; bài ôn
        sẽ tiếp tục sau đó.
      </p>
      <ul className="lp-diagnosis__probes">
        {data.probes.map((probe) => (
          <li className={`lp-diagnosis__probe is-${probe.status.toLowerCase()}`} key={probe.probeId}>
            <div>
              <p className="lp-diagnosis__name">{probe.knowledgePoint.name}</p>
              <p className="lp-diagnosis__meta">
                <span className="lp-brow__code">{probe.knowledgePoint.code}</span>
                <span>{probeStatusText(probe)}</span>
              </p>
            </div>
            {probe.status === 'OPEN' ? (
              <Button asChild className="lp-btn lp-btn--accent">
                <Link to={diagnosticProbePath(review.reviewId, sessionId, probe.probeId)}>
                  Làm bài<ArrowRight aria-hidden="true" size={15} />
                </Link>
              </Button>
            ) : null}
          </li>
        ))}
      </ul>
      {hasOpenProbe ? (
        <div className="lp-diagnosis__actions">
          <Button className="lp-btn" disabled={!canSkip || skipping} onClick={() => void skip()} type="button">
            {skipping ? <Loader2 aria-hidden="true" className="lp-spin" size={15} /> : null}
            Bỏ qua kiểm tra
          </Button>
          {canSkip ? null : <span className="lp-diagnosis__note">Làm ít nhất một bài để có thể bỏ qua.</span>}
        </div>
      ) : (
        <div className="lp-diagnosis__actions">
          <Button className="lp-btn lp-btn--accent" onClick={onChanged} type="button">Xem kết quả kiểm tra</Button>
        </div>
      )}
      {skipError ? <p className="lp-error" role="alert">{skipError}</p> : null}
      {confirmDialog}
    </section>
  )
}

/** A review that waits for the reviews of the base points the diagnosis found weak. */
export function WaitingPanel({ review }: { review: ReviewDetail }) {
  const waitingOn = review.waitingOnReviewIds ?? []
  const sessionId = review.diagnosticSessionId ?? ''
  const diagnosis = useApiResource(`diagnostic:${sessionId}`, async () =>
    sessionId ? learningApi.getDiagnostic(sessionId) : null)
  const names = diagnosis.data?.conclusion.map((point) => point.name) ?? []

  return (
    <section aria-labelledby="lp-waiting-title" className="lp-diagnosis">
      <h2 id="lp-waiting-title">Cần ôn trước</h2>
      <p>
        Bài ôn này đang chờ bạn ôn xong kiến thức nền
        {names.length > 0 ? `: ${names.join(', ')}` : ''}. Làm các bài ôn dưới đây trước, rồi quay lại đây.
      </p>
      <ul className="lp-diagnosis__probes">
        {waitingOn.map((id, index) => (
          <li className="lp-diagnosis__probe" key={id}>
            <p className="lp-diagnosis__name">Bài ôn kiến thức nền {waitingOn.length > 1 ? index + 1 : ''}</p>
            <Button asChild className="lp-btn lp-btn--accent">
              <Link to={reviewPath(id)}>Làm bài ôn<ArrowRight aria-hidden="true" size={15} /></Link>
            </Button>
          </li>
        ))}
      </ul>
    </section>
  )
}
