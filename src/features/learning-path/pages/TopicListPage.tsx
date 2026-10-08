import { Link, useParams } from 'react-router-dom'
import type { CSSProperties } from 'react'
import { ArrowLeft, ArrowRight, Lock } from 'lucide-react'
import type { TopicSummary } from '~types/learningPath'
import { learningApi } from '../api'
import { NoticeBanner } from '../components/NoticeBanner'
import { ApiErrorState, LoadingState } from '../components/PageState'
import { StatusBadge } from '../components/StatusBadge'
import { topicStatusMeta } from '../lib/statusMeta'
import { useApiResource } from '../lib/useApiResource'

/** Topics of one course, picked on the course list screen. */
export function TopicListPage() {
  const { courseId = '' } = useParams()
  const resource = useApiResource('topics', () => learningApi.listTopics())
  const topics = resource.data?.filter((topic) => topic.course?.id === courseId) ?? null
  const course = topics?.[0]?.course ?? null

  return (
    <div className="lp-page">
      <NoticeBanner />
      <Link className="lp-back" to="/learn"><ArrowLeft aria-hidden="true" size={16} />Danh sách course</Link>
      <header className="lp-hero">
        <p className="lp-eyebrow">{course ? `Course · Band ${course.bandLevel.toFixed(1)}` : 'Course'}</p>
        <h1>{course?.title ?? 'Lộ trình của course'}</h1>
        <p>Mỗi topic là một chặng. Học hết các bài và đạt bài kiểm tra cuối để mở chặng tiếp theo trong course.</p>
        {topics ? <TrailProgress topics={topics} /> : null}
      </header>
      {resource.status === 'loading' ? <LoadingState label="Đang tải lộ trình…" /> : null}
      {resource.status === 'error' && resource.error ? <ApiErrorState error={resource.error} onRetry={resource.reload} /> : null}
      {topics?.length === 0 ? <p className="lp-empty">Course này chưa có topic nào.</p> : null}
      {topics && topics.length > 0 ? <TopicTrail topics={topics} /> : null}
    </div>
  )
}

export function TopicTrail({ topics }: { topics: TopicSummary[] }) {
  return (
    <ol className="lp-trail" aria-label="Các chặng trong lộ trình">
      {[...topics].sort((a, b) => a.sequenceOrder - b.sequenceOrder).map((topic, index) => (
        <TopicStation index={index} key={topic.id} topic={topic} />
      ))}
    </ol>
  )
}

function TrailProgress({ topics }: { topics: TopicSummary[] }) {
  const passed = topics.filter((topic) => topic.status === 'PASSED').length
  return (
    <p className="lp-hero__meter">
      <strong>{passed}/{topics.length}</strong> chặng đã qua
    </p>
  )
}

function TopicStation({ topic, index }: { topic: TopicSummary; index: number }) {
  const meta = topicStatusMeta(topic.status)
  const Icon = meta.icon
  const locked = topic.status === 'LOCKED'
  const reasonId = `${topic.id}-reason`
  const body = (
    <>
      <div className="lp-station__top">
        <span className="lp-station__code">{topic.code}</span>
        <StatusBadge meta={meta} />
      </div>
      <h2>{topic.title}</h2>
      <p>{topic.description}</p>
      <div className="lp-station__foot">
        <span>{topic.completedLessons}/{topic.totalLessons} bài đã xong</span>
        {topic.lockedReason?.includes('Premium') ? <span className="lp-badge lp-tone-locked">Premium</span> : null}
        {locked ? <Lock aria-hidden="true" size={16} /> : <ArrowRight aria-hidden="true" size={18} />}
      </div>
      {locked && topic.lockedReason ? <p className="lp-station__reason" id={reasonId}>{topic.lockedReason}</p> : null}
    </>
  )

  return (
    <li className={`lp-station lp-station--${topic.status.toLowerCase()}`} style={{ '--i': index } as CSSProperties}>
      <span className="lp-station__node" aria-hidden="true"><Icon size={22} /></span>
      <span className="lp-station__step">Chặng {topic.sequenceOrder}</span>
      {locked ? (
        <div className="lp-station__card" aria-describedby={topic.lockedReason ? reasonId : undefined} aria-disabled="true">{body}</div>
      ) : (
        <Link className="lp-station__card" to={`/learn/topics/${topic.id}`}>{body}</Link>
      )}
    </li>
  )
}
