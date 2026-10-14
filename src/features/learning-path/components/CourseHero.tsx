import { Gauge, Route } from 'lucide-react'
import type { CourseRef } from '~types/learningPath'
import { entryBand } from '../lib/courseMeta'
import { LearnHero, type HeroFact } from './LearnHero'

interface CourseHeroProps {
  course: CourseRef | null
  topicCount: number
  /** Every topic of the course is passed. */
  done: boolean
}

/** Header of one course: illustration, name and size. */
export function CourseHero({ course, topicCount, done }: CourseHeroProps) {
  const facts: HeroFact[] = course
    ? [
        ...(topicCount > 0 ? [{ icon: <Route aria-hidden="true" size={15} />, label: `${topicCount} chặng topic` }] : []),
        { icon: <Gauge aria-hidden="true" size={15} />, label: `Đầu vào ~${entryBand(course.bandLevel)}` },
      ]
    : []

  return (
    <LearnHero
      band={course?.bandLevel ?? null}
      done={done ? 'Bạn đã qua tất cả các chặng.' : null}
      eyebrow={course ? `Band ${course.bandLevel.toFixed(1)} · Lộ trình khóa học` : 'Lộ trình khóa học'}
      facts={facts}
      title={course?.title ?? 'Lộ trình khóa học'}
    />
  )
}
