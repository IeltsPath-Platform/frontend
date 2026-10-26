import { Link, useParams } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { AdminError, AdminLoading } from '@/features/admin/components/AdminState'
import { sourceLabel, taskLabel } from '@/features/admin/examiner-review/lib/reviewLabels'
import { CRITERIA } from '@/features/admin/examiner-review/types'
import { useAdminResource } from '@/features/admin/lib/useAdminResource'
import { AdminPage } from '@/features/admin/pages/AdminPage'
import { getMyGradedReview } from '../api/examinerGradingApi'
import { AnnotatedEssay } from '../components/AnnotatedEssay'
import { SplitPane } from '../components/SplitPane'
import { timeOfDay } from '../lib/gradingLabels'
import '../examiner-grading.css'

const QUEUE = '/admin/grading/writing'

const criterionName = (key: string) => CRITERIA.find((item) => item.key === key)?.label ?? key

function finishedText(iso: string | null | undefined) {
  const date = iso ? new Date(iso) : null
  return date && !Number.isNaN(date.getTime()) ? `${date.toLocaleDateString('vi-VN')} ${timeOfDay(iso!)}` : null
}

/**
 * A job the examiner finished, read-only: the band, the four criteria with their comments, the overall feedback and the
 * essay with the marked errors. Grading is blind, so the learner is not shown.
 */
export function GradedReviewPage() {
  const { jobId = '' } = useParams()
  const review = useAdminResource(`graded-review:${jobId}`, (signal) => getMyGradedReview(jobId, signal))
  const data = review.data
  const marks = data?.annotations ?? []
  const finished = finishedText(data?.completedAt)

  return (
    <AdminPage
      actions={<Link className="adm-btn adm-btn--primary" to={`${QUEUE}?tab=done`}><ArrowLeft aria-hidden="true" size={16} />Về danh sách đã chấm</Link>}
      subtitle={data ? `${sourceLabel({ attemptType: null, source: data.source })} · ${taskLabel(data.task)}${finished ? ` · chấm lúc ${finished}` : ''}` : 'Xem lại bài bạn đã chấm.'}
      title="Bài đã chấm">
      {review.status === 'loading' ? <AdminLoading /> : null}
      {review.status === 'error' ? <AdminError message={review.error!} onRetry={review.reload} /> : null}
      {data ? (
        <SplitPane
          storageKey="examiner-grading-split"
          left={(
            <>
              {data.prompt ? <section aria-label="Đề bài" className="adm-card"><h2>Đề bài</h2><p className="adm-eg-text">{data.prompt}</p></section> : null}
              <section className="adm-card">
                <h2>Bài viết của học viên</h2>
                <AnnotatedEssay annotations={marks} essay={data.essay} onSelect={() => undefined} />
              </section>
              {marks.length > 0 ? (
                <section aria-label="Các lỗi đã ghi nhận" className="adm-card">
                  <h2>Các lỗi đã ghi nhận ({marks.length})</h2>
                  <ol className="adm-eg-errors">
                    {marks.map((mark, index) => (
                      <li key={`${mark.start}-${mark.end}`}>
                        <span aria-hidden="true" className="adm-eg-errors__n">{index + 1}</span>
                        <span className="adm-eg-errors__text"><strong>{mark.excerpt}</strong> → {mark.suggestion}</span>
                        <span className="adm-badge adm-badge--muted">{mark.errorCode}</span>
                      </li>
                    ))}
                  </ol>
                </section>
              ) : null}
            </>
          )}
          right={(
            <section aria-label="Kết quả bạn đã chấm" className="eg-result">
              <div className="eg-result__overall">
                <div>
                  <h2>Band tổng</h2>
                  <p>Kết quả bạn đã chấm</p>
                </div>
                <strong aria-label={`Band tổng ${data.band.toFixed(1)}`}>{data.band.toFixed(1)}</strong>
              </div>
              <ol className="eg-result__list">
                {data.criteria.map((item, index) => (
                  <li className="eg-result__item" key={item.criterion}>
                    <div className="eg-result__head">
                      <span aria-hidden="true" className="eg-criterion__n">{index + 1}</span>
                      <h3>{criterionName(item.criterion)}</h3>
                      <strong className="eg-result__band">{item.band.toFixed(1)}</strong>
                    </div>
                    <div aria-hidden="true" className="eg-result__bar"><span style={{ width: `${Math.min(100, (item.band / 9) * 100)}%` }} /></div>
                    {item.comment ? <p className="eg-result__comment">{item.comment}</p> : null}
                  </li>
                ))}
              </ol>
              {data.feedback ? (
                <div className="eg-result__feedback">
                  <h3>Nhận xét chung</h3>
                  <p>{data.feedback}</p>
                </div>
              ) : null}
            </section>
          )} />
      ) : null}
    </AdminPage>
  )
}
