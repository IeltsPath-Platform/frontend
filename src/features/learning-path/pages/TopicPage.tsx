import { useParams } from 'react-router-dom'
import { BookOpen, Clock3, ListChecks } from 'lucide-react'
import { learningApi } from '../api'
import { LearnHero, type HeroFact } from '../components/LearnHero'
import { LearnTrail } from '../components/LearnTrail'
import { NoticeBanner } from '../components/NoticeBanner'
import { ApiErrorState, LoadingState } from '../components/PageState'
import { SegmentMeter } from '../components/SegmentMeter'
import { TopicLessonsView } from '../components/TopicLessonsPanel'
import { skillLabel } from '../lib/courseMeta'
import { totalLessonMinutes } from '../lib/lessonMinutes'
import { courseTopicPath } from '../lib/routes'
import { useApiResource } from '../lib/useApiResource'
import { useSyncPendingReviews } from '../lib/useSyncPendingReviews'

/** One topic: where it sits in its course, how far the learner is, its lessons and its test. */
export function TopicPage() {
  const { topicId = '' } = useParams()
  const resource = useApiResource(`topic:${topicId}`, () => learningApi.getTopicLessons(topicId))
  useSyncPendingReviews(resource.status === 'success' ? resource.data?.pendingReviews : undefined, { allowClear: true })

  if (resource.status === 'loading') return <LoadingState label="Đang tải chặng học…" />
  if (resource.status === 'error' && resource.error) return <ApiErrorState error={resource.error} onRetry={resource.reload} />
  if (!resource.data) return null

  const { topic, lessons, finalTest } = resource.data
  const course = topic.course
  const number = String(topic.sequenceOrder).padStart(2, '0')
  const skill = skillLabel(topic.skill)
  const minutes = totalLessonMinutes(lessons)
  const completed = lessons.filter((lesson) => lesson.status === 'COMPLETED').length

  const facts: HeroFact[] = [
    { icon: <BookOpen aria-hidden="true" size={15} />, label: `${lessons.length} bài học` },
    ...(minutes > 0 ? [{ icon: <Clock3 aria-hidden="true" size={15} />, label: `khoảng ${minutes} phút` }] : []),
    {
      icon: <ListChecks aria-hidden="true" size={15} />,
      label: (
        <span className="lp-hero__progress">
          <SegmentMeter done={completed} total={lessons.length} unit="bài" />
          {completed}/{lessons.length} bài đã xong
        </span>
      ),
    },
  ]

  return (
    <div className="lp-page lp-topic-page">
      <NoticeBanner />
      <LearnTrail
        items={[
          { label: 'Khóa học', to: '/learn' },
          ...(course ? [{ label: course.title, to: courseTopicPath(course.id, topic.id) }] : []),
          { label: `Chặng ${number} · ${topic.title}` },
        ]}
      />

      <LearnHero
        band={course?.bandLevel ?? null}
        done={finalTest.testStatus === 'PASSED'
          ? `Bạn đã qua chặng này${finalTest.lastPercent !== null ? ` · ${finalTest.lastPercent}%` : ''}`
          : null}
        eyebrow={[`Chặng ${number}`, skill, course?.title].filter(Boolean).join(' · ')}
        facts={facts}
        lead={topic.description}
        title={topic.title}
      />

      <section className="lp-section" aria-labelledby="lp-topic-lessons">
        <h2 id="lp-topic-lessons">Bài học trong chặng</h2>
        <div className="lp-topic-sheet">
          <TopicLessonsView finalTest={finalTest} lessons={lessons} onChanged={resource.reload} showCounts={false} topicId={topic.id} />
        </div>
      </section>
    </div>
  )
}
