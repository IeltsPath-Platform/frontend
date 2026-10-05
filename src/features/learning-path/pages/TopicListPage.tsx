import { Link } from 'react-router-dom'
import type { CSSProperties } from 'react'
import { ArrowRight, Lock } from 'lucide-react'
import type { TopicSummary } from '~types/learningPath'
import { learningApi } from '../api'
import { NoticeBanner } from '../components/NoticeBanner'
import { ApiErrorState, LoadingState } from '../components/PageState'
import { StatusBadge } from '../components/StatusBadge'
import { topicStatusMeta } from '../lib/statusMeta'
import { useApiResource } from '../lib/useApiResource'

export function TopicListPage() {
  const topics = useApiResource('topics', () => learningApi.listTopics())

  return (
    <div className="lp-page">
      <NoticeBanner />
      <header className="lp-hero">
        <p className="lp-eyebrow">Lộ trình Reading</p>
        <h1>Đi từng chặng, mở khóa từng kỹ năng</h1>
        <p>Mỗi topic là một chặng. Học hết các bài và đạt bài kiểm tra cuối để mở chặng tiếp theo.</p>
        {topics.data ? <TrailProgress topics={topics.data} /> : null}
      </header>
      {topics.status === 'loading' ? <LoadingState label="Đang tải lộ trình…" /> : null}
      {topics.status === 'error' && topics.error ? <ApiErrorState error={topics.error} onRetry={topics.reload} /> : null}
      {topics.data?.length === 0 ? <p className="lp-empty">Chưa có topic nào được giao cho bạn.</p> : null}
      {topics.data && topics.data.length > 0 ? <TopicTrail topics={topics.data} /> : null}
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
