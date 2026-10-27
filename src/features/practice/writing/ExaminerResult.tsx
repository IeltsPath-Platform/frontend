import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { X } from 'lucide-react'
import { SiteNavbar } from '@/components/SiteNavbar'
import { ApiErrorState, LoadingState } from '@/features/learning-path/components/PageState'
import { useApiResource } from '@/features/learning-path/lib/useApiResource'
import { getExaminer, getHumanReview } from './examinerApi'
import { errorTypesByCode, getApprovedErrorTypes } from './examinerReviewsApi'
import type { LearnerErrorType } from './examinerReviewsApi'
import type { HumanReview } from './examinerApi'
import { TeacherCard } from './ExaminerList'
import { findJobOfReview } from './gradingJobApi'
import { LateExaminerNotice } from './LateExaminerNotice'
import { criterionName, markByOffsets, shownMarks } from './reviewMarks'
import type { WritingSubmission } from './writingApi'
import { loadResultContext } from './writingText'
import '../reading/reading-workspace.css'
import './writing-result.css'
import './writing-examiner.css'

const REVIEWS_PATH = '/writing-reviews'
/** Time between checks while the teacher has not finished. */
const POLL_MS = 60_000

type ErrorTypes = ReadonlyMap<string, LearnerErrorType>

/** The name of an error code the learner may be shown; the code itself while the catalogue is not at hand. */
const errorName = (types: ErrorTypes, code: string) => types.get(code)?.name ?? code

/** The abbreviation shown on the small band chips of the strip above the two panes. */
const SHORT_NAME: Record<string, string> = { taskResponse: 'TR', coherence: 'CC', lexical: 'LR', grammar: 'GRA' }

type Marked = ReturnType<typeof shownMarks>

/** The essay text; a marked piece can be opened (click or Enter) to jump to its error in the list. */
function EssayText({ segments, active, onPick }: { segments: ReturnType<typeof markByOffsets>; active?: number | null; onPick?: (number: number) => void }) {
  return (
    <section className="wr-essay" aria-label="Bài viết">
      {segments.map((segment, index) => segment.annotation
        ? (
          <span key={index}>
            <mark
              className={`wr-mark wr-mark-grammar${segment.number === active ? ' is-active' : ''}`}
              id={`mark-${segment.number}`}
              onClick={() => onPick?.(segment.number as number)}
              onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); onPick?.(segment.number as number) } }}
              role={onPick ? 'button' : undefined}
              tabIndex={onPick ? 0 : undefined}
              title={segment.annotation.suggestion ?? undefined}>{segment.text}</mark><sup>{segment.number}</sup>
          </span>
        )
        : <span key={index}>{segment.text}</span>)}
    </section>
  )
}

/** The errors to fix: what was written, what to write instead, and how to fix that kind of error. */
function Fixes({ marks, types, active, onPick }: { marks: Marked; types: ErrorTypes; active: number | null; onPick: (number: number) => void }) {
  return (
    <section className="wr-fixes" aria-label="Các lỗi giáo viên ghi nhận">
      <h3>Các lỗi cần sửa ({marks.length})</h3>
      <ol>{marks.map(({ annotation, number }) => (
        <li className={number === active ? 'is-active' : undefined} id={`fix-${number}`} key={number} onClick={() => onPick(number)}>
          {annotation.errorCode && <span className="wr-mark wr-mark-grammar">{errorName(types, annotation.errorCode)}</span>} <b>{annotation.excerpt}</b>
          {annotation.suggestion ? <> → {annotation.suggestion}</> : null}
          {annotation.errorCode && types.get(annotation.errorCode)?.fixHint ? <p className="we-fixhint">Cách sửa: {types.get(annotation.errorCode)?.fixHint}</p> : null}
        </li>
      ))}</ol>
    </section>
  )
}

/** The teacher's text with the runs of blank lines folded into one line break, so a comment is not stretched by empty space. */
const tidy = (text: string) => text.trim().replace(/\n\s*\n+/g, '\n')

/**
 * The review in two steps. Up top, in one screen: a strip with the band and the four criteria, and under it the essay beside the
 * errors to fix, each pane scrolling on its own, so the learner reads an error and the sentence it is about together. Marked
 * pieces of the essay and the errors of the list answer each other. Under that, the teacher's words in full: the overall
 * comment and the comment on each of the four criteria.
 */
function Done({ review, essay, types }: { review: HumanReview; essay: string; types: ErrorTypes }) {
  const [active, setActive] = useState<number | null>(null)
  const criteria = review.criteria ?? []
  const band = review.band ?? 0
  const segments = useMemo(() => markByOffsets(essay, review.annotations ?? []), [essay, review.annotations])
  const marks = shownMarks(segments)
  // Every kind of error in the essay once, whether the teacher listed it or only marked it in the text.
  const codes = [...new Set([...(review.errorCodes ?? []), ...(review.annotations ?? []).flatMap((item) => (item.errorCode ? [item.errorCode] : []))])]
  const explained = codes.map((code) => types.get(code)).filter((type): type is LearnerErrorType => type !== undefined)
  const hasSide = marks.length > 0 || explained.length > 0

  function pick(number: number) {
    setActive(number)
    // Each side brings the same error into view in its own pane.
    window.setTimeout(() => {
      document.getElementById(`fix-${number}`)?.scrollIntoView?.({ block: 'nearest', behavior: 'smooth' })
      document.getElementById(`mark-${number}`)?.scrollIntoView?.({ block: 'nearest', behavior: 'smooth' })
    }, 0)
  }

  return (
    <div className="we-review">
      <div className="we-scorebar">
        <section className="we-score" aria-label="Band Score">
          <span>Band tổng</span>
          <strong>{band.toFixed(1)}</strong>
        </section>
        <ul className="we-mini" aria-label="Band từng tiêu chí">
          {criteria.map((item) => (
            <li key={item.criterion} title={criterionName(item.criterion)}>
              <span>{SHORT_NAME[item.criterion] ?? criterionName(item.criterion)}</span>
              <b>{item.band.toFixed(1)}</b>
              <i aria-hidden="true"><u style={{ width: `${(item.band / 9) * 100}%` }} /></i>
            </li>
          ))}
        </ul>
        {marks.length > 0 && <p className="we-hint">Bấm vào chỗ được tô vàng trong bài để xem lỗi và cách sửa.</p>}
      </div>

      <div className={`we-split${hasSide ? '' : ' we-split--single'}`}>
        <div className="we-pane we-pane--essay">
          <div className="we-pane__head"><h2>Bài viết của bạn{marks.length > 0 ? ' đã được giáo viên đánh dấu' : ''}</h2></div>
          <EssayText active={active} onPick={marks.length > 0 ? pick : undefined} segments={segments} />
        </div>
        {hasSide && (
          <div className="we-pane we-pane--errors">
            {marks.length > 0
              ? <Fixes active={active} marks={marks} onPick={pick} types={types} />
              : <p className="we-muted">Giáo viên không đánh dấu lỗi cụ thể trong bài này.</p>}
            {explained.length > 0 && (
              <section className="we-glossary" aria-label="Các loại lỗi trong bài">
                <h3>Các loại lỗi trong bài</h3>
                <dl>{explained.map((type) => (
                  <div key={type.code}><dt>{type.name}</dt>{type.fixHint ? <dd>{type.fixHint}</dd> : null}</div>
                ))}</dl>
              </section>
            )}
          </div>
        )}
      </div>

      <section className="wr-card we-result" aria-label="Kết quả chấm bài">
        <header><h2>Nhận xét của giáo viên</h2><span>Giáo viên chấm</span></header>
        {review.feedback && (
          <div className="we-overall">
            <h3>Nhận xét chung</h3>
            <p aria-label="Nhận xét chung">{tidy(review.feedback)}</p>
          </div>
        )}
        <h3 className="we-sub">Nhận xét theo từng tiêu chí</h3>
        <div className="we-criteria">
          {criteria.map((item) => (
            <article className="we-criterion" key={item.criterion}>
              <div className="we-criterion__head">
                <h4>{criterionName(item.criterion)}</h4>
                <b aria-label={`Band ${item.band.toFixed(1)}`}>{item.band.toFixed(1)}</b>
              </div>
              <i className="we-criterion__bar" aria-hidden="true"><u style={{ width: `${(item.band / 9) * 100}%` }} /></i>
              {item.comment && <p>{tidy(item.comment)}</p>}
            </article>
          ))}
        </div>
        {(review.errorCodes ?? []).length > 0 && (
          <div className="we-codes-row">
            <span>Các loại lỗi giáo viên ghi nhận</span>
            <ul className="we-codes" aria-label="Loại lỗi giáo viên ghi nhận">{(review.errorCodes ?? []).map((code) => <li key={code} title={types.get(code)?.fixHint ?? undefined}>{errorName(types, code)}</li>)}</ul>
          </div>
        )}
      </section>
    </div>
  )
}
/** The essay on its own, while the teacher has not graded it. */
function EssayPlain({ essay }: { essay: string }) {
  const segments = useMemo(() => markByOffsets(essay, []), [essay])
  return (
    <>
      <h2 className="wr-h2">Bài viết của bạn</h2>
      <EssayText segments={segments} />
    </>
  )
}

/** The page checks again by itself every minute, and the X in the top bar leaves it, so there are no buttons here. */
function Waiting({ essay }: { essay: string }) {
  return (
    <div className="we-waiting">
      <section className="wr-card" aria-label="Đang chờ giáo viên chấm">
        <header><h2>Đang chờ giáo viên chấm</h2></header>
        <p className="we-pill">Chưa có kết quả</p>
        <p>Bài của bạn đã được gửi. Giáo viên có tối đa 48 giờ để chấm; kết quả sẽ hiện ở trang này khi giáo viên chấm xong. Bạn có thể đóng trang và quay lại sau.</p>
      </section>
      <EssayPlain essay={essay} />
    </div>
  )
}

/** The learner gave up a late request: nobody grades the essay, and the credit is back. */
function Cancelled({ essay }: { essay: string }) {
  return (
    <div className="we-waiting">
      <section className="wr-card" aria-label="Đã hủy yêu cầu chấm bài">
        <header><h2>Đã hủy yêu cầu chấm bài</h2></header>
        <p className="we-pill">Không còn chấm</p>
        <p>Bạn đã hủy yêu cầu này, giáo viên sẽ không chấm bài nữa. Lượt giáo viên chấm của bạn đã được hoàn lại, bạn có thể viết lại hoặc gửi bài này cho một giáo viên khác.</p>
      </section>
      <EssayPlain essay={essay} />
    </div>
  )
}

/** An essay sent to a teacher: who grades it, then the review once it is done (checked again every minute until then). */
export function ExaminerResult({ submission, submissionId }: { submission: WritingSubmission; submissionId: string }) {
  const review = useApiResource(`writing-review:${submissionId}`, () => getHumanReview(submissionId))
  const { reload } = review
  const done = review.data?.status === 'DONE'
  const cancelled = review.data?.status === 'CANCELLED'
  const essay = submission.essayText ?? ''
  const context = useMemo(() => loadResultContext(submissionId), [submissionId])
  const examinerId = review.data?.examinerId ?? null
  const reviewId = review.data?.reviewSubmissionId ?? null
  // The profile and the job are extras: when either cannot be read the review still shows.
  const profile = useApiResource(`examiner:${examinerId ?? ''}`, () => (examinerId ? getExaminer(examinerId).catch(() => null) : Promise.resolve(null)))
  const job = useApiResource(`writing-job:${reviewId ?? ''}`, () => (reviewId ? findJobOfReview(reviewId).catch(() => null) : Promise.resolve(null)))
  const { reload: reloadJob } = job
  // What each marked error means; read only once there is a review to read, and the review still shows without it.
  const catalogue = useApiResource(`approved-error-types:${done}`, () => (done ? getApprovedErrorTypes().catch(() => []) : Promise.resolve([])))
  const types = useMemo(() => errorTypesByCode(catalogue.data), [catalogue.data])
  const refresh = useCallback(() => { reload(); reloadJob() }, [reload, reloadJob])

  useEffect(() => {
    if (done || cancelled) return undefined
    const id = window.setInterval(refresh, POLL_MS)
    return () => window.clearInterval(id)
  }, [done, cancelled, refresh])

  if (review.status === 'loading') return <LoadingState label="Đang tải kết quả chấm bài…" />
  if (review.status === 'error' && review.error) return <ApiErrorState error={review.error} onRetry={reload} />
  const data = review.data
  if (!data) return null
  return (
    <div className={`wr-page`}>
      <SiteNavbar />
      <header className="wr-top"><Link className="rw-exit" to={REVIEWS_PATH} aria-label="Về danh sách bài giáo viên chấm"><X size={16} aria-hidden="true" /></Link></header>
      <main className={`wr-main`}>
        <div className="we-headline">
          <h1 className="wr-h2">{context?.title ?? 'Bài Writing'}: giáo viên chấm</h1>
          {done && <Link className="we-all-reviews" to={REVIEWS_PATH}>Xem tất cả bài giáo viên đã chấm</Link>}
        </div>
        {data.examinerId && <TeacherCard examiner={profile.data} />}
        {!done && !cancelled && job.data && <LateExaminerNotice job={job.data} examinerName={profile.data?.displayName} onChanged={refresh} />}
        {done ? <Done review={data} essay={essay} types={types} /> : cancelled ? <Cancelled essay={essay} /> : <Waiting essay={essay} />}
      </main>
    </div>
  )
}
