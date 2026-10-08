import type { CSSProperties } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, ChevronsRight, Lightbulb } from 'lucide-react'
import { useAuthSession } from '@/features/auth/authSession'
import type { CourseSummary, LearningGoal, PlacementResult } from '~types/learningPath'
import { learningApi } from '../api'
import { ApiErrorState, LoadingState } from '../components/PageState'
import { useApiResource } from '../lib/useApiResource'
import { BAND_STEPS, bandStep, daysUntil, feasibility, hoursPerWeek, stepLabel } from './placementReport'
import { SKILL_META } from './placementSkills'
import { EssayReport, ObjectiveReport, SpeakingReport } from './ReportSkillPanels'

const SKILL_ORDER = ['READING', 'LISTENING', 'WRITING', 'SPEAKING'] as const

interface ResultData {
  result: PlacementResult
  /** Every course by band; the placement marks one as recommended. */
  courses: CourseSummary[]
  goal: LearningGoal | null
}

/** Why a course that is not the recommended one might still matter. */
function courseNote(course: CourseSummary, recommendedBand: number | null) {
  if (recommendedBand === null) return 'Khóa học'
  return course.bandLevel < recommendedBand ? 'Ôn nền tảng' : 'Nâng cao'
}

/** Step 3: the placement report — bands against the target, how reachable it is, and the detail of every skill. */
export function PlacementResultView({ attemptId }: { attemptId: string }) {
  const { userName } = useAuthSession()
  const resource = useApiResource<ResultData>(`placement-result:${attemptId}`, async () => {
    const [result, courses, goal] = await Promise.all([
      learningApi.getPlacementResult(attemptId),
      learningApi.listCourses(),
      // The goal only adds the target side of the report; the bands still show without it.
      learningApi.getActiveLearningGoal().catch(() => null),
    ])
    return { result, courses: [...courses].sort((a, b) => a.bandLevel - b.bandLevel), goal }
  })
  if (resource.status === 'loading') return <LoadingState label="Đang tải báo cáo…" />
  if (resource.status === 'error' && resource.error) return <ApiErrorState error={resource.error} onRetry={resource.reload} />
  if (!resource.data) return null

  const { result, courses, goal } = resource.data
  const recommendedBand = courses.find((course) => course.recommended)?.bandLevel ?? null
  const overall = result.overallBand ?? 0
  const bySkill = new Map(result.skills.map((entry) => [entry.skill, entry.band]))
  const days = goal ? daysUntil(goal.examDate) : null
  const plan = feasibility(overall, goal)
  const current = bandStep(overall)
  const target = goal ? bandStep(goal.targetBand) : null

  return (
    <article className="pl-report" aria-labelledby="pl-report-title">
      <header className="pl-report__intro">
        <p className="pl-report__meta">IELTS Academic · {result.completedAt ? new Date(result.completedAt).toLocaleDateString('vi-VN') : ''}</p>
        <h1 id="pl-report-title">Báo cáo kết quả bài test</h1>
        <p className="pl-report__name">{userName}</p>
        <p className="pl-report__lead">
          Dưới đây là phân tích trình độ dựa trên bài test đầu vào: điểm ước lượng, đánh giá khả năng đạt mục tiêu và nhận xét chi tiết từng kỹ năng.
        </p>
      </header>

      <section className="pl-report__scores" aria-label="Band hiện tại và mục tiêu">
        <div className="pl-report-card">
          <h2>Estimated overall band score</h2>
          <p className="pl-report-card__big pl-report-card__big--current">{result.overallBand !== null ? overall.toFixed(1) : '–'}</p>
          <ul className="pl-report-card__skills">
            {SKILL_ORDER.filter((skill) => bySkill.has(skill)).map((skill) => (
              <li key={skill}><span>{SKILL_META[skill].label}</span><strong>{(bySkill.get(skill) ?? 0).toFixed(1)}</strong></li>
            ))}
          </ul>
        </div>
        <ChevronsRight aria-hidden="true" className="pl-report__arrow" size={28} />
        <div className="pl-report-card">
          <h2>Target band</h2>
          <p className="pl-report-card__big pl-report-card__big--target">{goal ? goal.targetBand.toFixed(1) : '–'}</p>
          <ul className="pl-report-card__skills pl-report-card__skills--target">
            <li><span>Số ngày còn lại</span><strong>{days !== null ? `${days} ngày` : 'Chưa chọn'}</strong></li>
            <li><span>Thời gian học</span><strong>{goal ? `${hoursPerWeek(goal.availableMinutesPerDay)} giờ/tuần` : '–'}</strong></li>
          </ul>
        </div>
      </section>

      <section className="pl-report__block" aria-labelledby="pl-report-feasible">
        <h2 className="pl-report__heading" id="pl-report-feasible">Đánh giá khả thi</h2>
        <div className="pl-report__feasible">
          <div className="pl-band-steps" role="img" aria-label={`Band hiện tại ${overall.toFixed(1)}${goal ? `, mục tiêu ${goal.targetBand.toFixed(1)}` : ''}`}>
            {BAND_STEPS.map((step, index) => {
              const state = step === current ? 'current' : step === target ? 'target' : 'rest'
              return (
                <div className="pl-band-steps__col" data-state={state} key={step}>
                  {state === 'target' ? <span className="pl-band-steps__tag">Band mục tiêu</span> : null}
                  {state === 'current' ? <span className="pl-band-steps__tag pl-band-steps__tag--current">Bạn ở đây</span> : null}
                  <span className="pl-band-steps__bar" style={{ '--pl-step': index } as CSSProperties} />
                  <span className="pl-band-steps__label">{stepLabel(step)}</span>
                </div>
              )
            })}
          </div>
          <div className="pl-report__advice">
            <p>{plan.text}</p>
            <p className="pl-report__tip"><Lightbulb aria-hidden="true" size={18} /><span><strong>Gợi ý:</strong> {plan.tip}</span></p>
          </div>
        </div>
      </section>

      <section className="pl-report__block" aria-labelledby="pl-report-detail">
        <h2 className="pl-report__heading" id="pl-report-detail">Phân tích chi tiết</h2>
        {result.sections.length === 0 ? (
          <p className="lp-hint">Chưa có dữ liệu chi tiết cho bài làm này.</p>
        ) : (
          <div className="pl-report__panels">
            {result.sections.map((section, index) => {
              if (section.skill === 'READING' || section.skill === 'LISTENING') {
                return <ObjectiveReport band={bySkill.get(section.skill) ?? null} key={index} questions={section.questions} skill={section.skill} />
              }
              if (section.skill === 'WRITING') {
                return section.essays.map((essay, essayIndex) => {
                  const label = essay.task === 'TASK_1' ? 'Writing Task 1' : essay.task === 'TASK_2' ? 'Writing Task 2' : 'Writing'
                  return <EssayReport essay={essay} key={`${index}-${essayIndex}`} title={label} />
                })
              }
              return <SpeakingReport band={bySkill.get('SPEAKING') ?? null} key={index} />
            })}
          </div>
        )}
      </section>

      {courses.length > 0 ? (
        <section className="pl-report__block" aria-labelledby="pl-report-courses">
          <h2 className="pl-report__heading" id="pl-report-courses">Lộ trình khóa học</h2>
          <ul className="pl-courses">
            {courses.map((course) => (
              <li className="pl-course" data-recommended={course.recommended} key={course.id}>
                <span className="pl-course__badge">{course.recommended ? 'Đề xuất cho bạn' : courseNote(course, recommendedBand)}</span>
                <h3>{course.title}</h3>
                <p className="pl-course__band">Band {course.bandLevel.toFixed(1)}</p>
                <p className="pl-course__meta">
                  {course.topicCount} topic{course.passedTopicCount > 0 ? ` · đã qua ${course.passedTopicCount}/${course.topicCount}` : ''}
                </p>
                <Link className={`pl-btn pl-course__cta ${course.recommended ? 'pl-btn--accent' : 'pl-course__cta--outline'}`}
                  to={`/learn/courses/${course.id}`}>
                  {course.recommended ? 'Bắt đầu học' : 'Xem khóa học'}<ArrowRight aria-hidden="true" size={18} />
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </article>
  )
}
