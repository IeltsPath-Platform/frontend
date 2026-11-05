import { Link } from 'react-router-dom'
import { BookOpen } from 'lucide-react'
import type { TreePoint } from '~types/learningPath'
import { courseTopicPath, lessonPagePath } from '../lib/routes'
import { chapterLabel } from '../lib/treeMeta'
import styles from './PointLessons.module.css'

/**
 * Where a point is taught: the lessons that teach it, each a link to the lesson with its chặng and number, so the tree
 * leads into the course. A point no lesson teaches still names the chặng that owns it, and links to it.
 */
export function PointLessons({ point, courseId }: { point: TreePoint; courseId: string }) {
  const lessons = point.lessons ?? []
  const topic = point.topic
  if (lessons.length === 0 && !topic) return null
  const headingId = `${point.knowledgePointId}-where`

  return (
    <section aria-labelledby={headingId} className={styles.where}>
      <h4 id={headingId}>Học ở đâu</h4>
      {lessons.length > 0 ? (
        <ul>
          {lessons.map((lesson) => (
            <li key={lesson.lessonId}>
              <Link className={styles.lesson} to={lessonPagePath(lesson.lessonId)}>
                <BookOpen aria-hidden="true" size={15} />
                <span>
                  <strong>{lesson.title}</strong>
                  <small>{chapterLabel(lesson.topicPosition)} · {lesson.topicName} · Bài {lesson.position}</small>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      ) : topic ? (
        <p>
          Thuộc <Link to={courseTopicPath(courseId, topic.topicId)}>{chapterLabel(topic.position)} · {topic.name}</Link>, chưa có bài học riêng cho điểm này.
        </p>
      ) : null}
    </section>
  )
}
