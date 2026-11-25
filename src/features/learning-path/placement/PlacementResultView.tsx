import { useEffect, useState, type CSSProperties } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, ChevronsRight, Lightbulb } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useAuthSession } from '@/features/auth/authSession'
import type { CourseSummary, LearningGoal, PlacementOptions, PlacementResult } from '~types/learningPath'
import { learningApi } from '../api'
import { ApiErrorState, LoadingState } from '../components/PageState'
import { useApiResource } from '../lib/useApiResource'
import { BAND_STEPS, bandStep, daysUntil, feasibility, hoursPerWeek, stepLabel } from './placementReport'
import { titleLabel, titleTopic } from './placementGroups'
import { SKILL_META } from './placementSkills'
import { NotGradedReport, ObjectiveReport, SpeakingReport, WritingReport } from './ReportSkillPanels'
import { PLACEMENT_POLL_ATTEMPTS, PLACEMENT_POLL_INTERVAL_MS } from './placementPolling'
import { placementPoolLabel } from './placementPools'

const SKILL_ORDER = ['READING', 'LISTENING', 'WRITING', 'SPEAKING'] as const

interface ResultData {
  result: PlacementResult
}

interface CoursePathState {
  /** Every course by band; the placement marks one as recommended. */
  courses: CourseSummary[]
  options: PlacementOptions | null
  bandApplied: boolean
}

const pause = (ms: number) => new Promise<void>((resolve) => { window.setTimeout(resolve, ms) })

/** Why a course that is not the recommended one might still matter. */
function courseNote(course: CourseSummary, recommendedBand: number | null) {
  if (recommendedBand === null) return 'Khóa học'
  return course.bandLevel < recommendedBand ? 'Ôn nền tảng' : 'Nâng cao'
}

/** Step 3: the placement report — bands against the target, how reachable it is, and the detail of every skill. */
export function PlacementResultView({ attemptId, onRetake }: { attemptId: string; onRetake: () => void }) {
  const { userName } = useAuthSession()
  const resource = useApiResource<ResultData>(`placement-result:${attemptId}`, async () => {
    return { result: await learningApi.getPlacementResult(attemptId) }
  })
  const [goal, setGoal] = useState<LearningGoal | null>(null)
  const [coursePath, setCoursePath] = useState<CoursePathState>({ courses: [], options: null, bandApplied: false })
  useEffect(() => {
    if (!resource.data) return
    let active = true
    void learningApi.getActiveLearningGoal().then(
      (value) => { if (active) setGoal(value) },
      () => { if (active) setGoal(null) },
    )
    return () => { active = false }
  }, [resource.data])
  useEffect(() => {
    const data = resource.data
    if (!data) return
    let active = true
    void (async () => {
      let options: PlacementOptions | null = null
      let bandApplied = data.result.overallBand === null
      if (data.result.overallBand !== null) {
        for (let tries = 0; tries < PLACEMENT_POLL_ATTEMPTS && active; tries += 1) {
          try {
            options = await learningApi.getPlacementOptions()
            if (active) setCoursePath((current) => ({ ...current, options }))
            if (options.currentBand === data.result.overallBand) { bandApplied = true; break }
          } catch {
            break
          }
          if (tries < PLACEMENT_POLL_ATTEMPTS - 1) await pause(PLACEMENT_POLL_INTERVAL_MS)
        }
      }
      if (!active) return
      if (!bandApplied) {
        setCoursePath((current) => ({ ...current, options, bandApplied: false }))
        return
      }
      const courses = await learningApi.listCourses().catch(() => [])
      if (active) setCoursePath({ courses: [...courses].sort((a, b) => a.bandLevel - b.bandLevel), options, bandApplied: true })
    })()
    return () => { active = false }
  }, [resource.data])
  if (resource.status === 'loading') return <LoadingState label="Đang tải báo cáo…" />
  if (resource.status === 'error' && resource.error) return <ApiErrorState error={resource.error} onRetry={resource.reload} />
  if (!resource.data) return null

  const { result } = resource.data
  const { courses, options, bandApplied } = coursePath
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
            {SKILL_ORDER.map((skill) => (
              <li key={skill}><span>{SKILL_META[skill].label}</span><strong>{bySkill.has(skill) ? bySkill.get(skill)!.toFixed(1) : 'Chưa chấm'}</strong></li>
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

      <section className="pl-report__placement-actions" aria-label="Làm lại bài kiểm tra đầu vào">
        <p>Kết quả bài làm này cập nhật band hiện tại của bạn.</p>
        <Button className="pl-btn" onClick={onRetake} type="button" variant="outline">
          Làm lại bài test đầu vào{options ? options.retakesLeft > 0 ? ` · còn ${options.retakesLeft} lượt` : ' · hết lượt' : ''}
        </Button>
        {options?.retakesLeft === 0 && options.nextRetakeAt ? <p role="status">Mở lượt tiếp theo: {new Date(options.nextRetakeAt).toLocaleString('vi-VN', { dateStyle: 'short', timeStyle: 'short' })}</p> : null}
      </section>

      {result.partial ? <p className="pl-report__partial" role="status">Một phần bài thi chưa thể chấm tự động. Kết quả chỉ tính các kỹ năng đã có band; kỹ năng chưa chấm không bị tính là 0.</p> : null}
      {result.reachedCeiling && result.pool && result.pool !== 'BAND_5_9' ? (
        <section className="pl-report__higher-pool" aria-label="Gợi ý kho đề cao hơn">
          <div><h2>Bạn đạt mức tối đa của kho {placementPoolLabel(result.pool)}</h2><p>Thử kho cao hơn để kết quả phản ánh đầy đủ hơn trình độ của bạn.</p></div>
          <Button className="pl-btn pl-btn--accent" onClick={onRetake} type="button">Chọn kho cao hơn<ArrowRight aria-hidden="true" size={18} /></Button>
        </section>
      ) : null}

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
            {SKILL_ORDER.map((skill) => {
              // One block per skill however many parts the test split it into; its band comes from the skill list.
              const sections = result.sections.filter((section) => section.skill === skill)
              if (!bySkill.has(skill)) return <NotGradedReport key={skill} skill={skill} />
              const band = bySkill.get(skill) ?? null
              if (skill === 'READING' || skill === 'LISTENING') {
                const parts = sections.map((section, index) => ({
                  name: titleTopic(section.title) || titleLabel(section.title, index),
                  questions: section.questions,
                }))
                return <ObjectiveReport band={band} key={skill} parts={parts} skill={skill} />
              }
              if (skill === 'WRITING') {
                const tasks = sections.flatMap((section) => section.essays).map((essay, index) => ({
                  title: essay.task === 'TASK_1' ? 'Task 1' : essay.task === 'TASK_2' ? 'Task 2' : `Task ${index + 1}`,
                  essay,
                }))
                return <WritingReport band={band} key={skill} tasks={tasks} />
              }
              return <SpeakingReport band={band} feedback={result.speakingFeedback ?? null} key={skill} />
            })}
          </div>
        )}
      </section>

      {courses.length > 0 || (result.overallBand !== null && !bandApplied) ? (
        <section className="pl-report__block" aria-labelledby="pl-report-courses">
          <h2 className="pl-report__heading" id="pl-report-courses">Lộ trình khóa học</h2>
          <ul className="pl-courses">
            {courses.map((course) => (
              <li className="pl-course" data-recommended={course.recommended} key={course.id}>
                <span className="pl-course__badge">{course.recommended ? 'Đề xuất cho bạn' : courseNote(course, recommendedBand)}</span>
                <h3>{course.title}</h3>
                <p className="pl-course__band">Band {course.bandLevel.toFixed(1)}</p>
                {course.description ? <p className="pl-course__description">{course.description}</p> : null}
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
          {result.overallBand !== null && !bandApplied ? <p className="pl-report__courses-waiting" role="status">Đang đồng bộ band mới để tải lộ trình khóa học được gợi ý.</p> : null}
        </section>
      ) : null}
    </article>
  )
}
