import { BookOpen, Layers } from 'lucide-react'
import type { CourseRef } from '~types/learningPath'
import { COURSE_SKILLS } from '../lib/courseSkills'
import { LearnHero, type HeroFact } from './LearnHero'

interface CourseHeroProps {
  course: CourseRef | null
  /** Lessons across the four skills; the fact is left out while there are none. */
  lessonCount: number
  /** Every topic of the course is passed. */
  done: boolean
}

/** Header of one course: illustration, name and size. */
export function CourseHero({ course, lessonCount, done }: CourseHeroProps) {
  const facts: HeroFact[] = course
    ? [
        { icon: <Layers aria-hidden="true" size={15} />, label: `${COURSE_SKILLS.length} kỹ năng` },
        ...(lessonCount > 0 ? [{ icon: <BookOpen aria-hidden="true" size={15} />, label: `${lessonCount} bài học` }] : []),
      ]
    : []

  return (
    <LearnHero
      band={course?.bandLevel ?? null}
      coverImageUrl={course?.bannerImageUrl?.trim() || course?.coverImageUrl}
      done={done ? 'Bạn đã qua tất cả các chặng.' : null}
      eyebrow={course ? `Band ${course.bandLevel.toFixed(1)} · Lộ trình khóa học` : 'Lộ trình khóa học'}
      facts={facts}
      lead={course?.description}
      title={course?.title ?? 'Lộ trình khóa học'}
    />
  )
}
