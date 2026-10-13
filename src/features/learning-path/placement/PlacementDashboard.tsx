import { useEffect, useState } from 'react'
import { CircleCheckBig, Loader2, RotateCcw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { AnswerMap } from '~types/learningPath'
import { groupAnsweredCount, groupQuestionCount, isGroupDone, type TestGroup } from './placementGroups'
import { SKILL_META, minutesSpent, type SectionTiming } from './placementSkills'

interface PlacementDashboardProps {
  /** The skills of the test, each made of one or more parts. */
  groups: TestGroup[]
  answers: AnswerMap
  /** Parts the server reports as completed; a skill with every part completed cannot be reopened. */
  completedIds: ReadonlySet<string>
  /** Per section: when it was opened and handed in, for the time noted beside a finished one. */
  timings: Record<string, SectionTiming>
  startedAt: string
  /** The attempt is being submitted after the last section was completed. */
  submitting: boolean
  error: string | null
  onOpenGroup: (groupId: string) => void
  /** Retries the automatic submit when it failed. */
  onRetrySubmit: () => void
  onRedoSurvey: () => void
}

function useElapsedSeconds(startedAt: string) {
  const start = Date.parse(startedAt)
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000)
    return () => window.clearInterval(timer)
  }, [])
  return Number.isFinite(start) ? Math.max(0, Math.floor((now - start) / 1000)) : 0
}

/** From the first part opened to the last one handed in. */
function groupTiming(group: TestGroup, timings: Record<string, SectionTiming>): SectionTiming {
  const times = (key: keyof SectionTiming) => group.sections
    .map((section) => timings[section.id]?.[key])
    .filter((value): value is string => Boolean(value))
    .sort()
  return { startedAt: times('startedAt')[0] ?? null, completedAt: times('completedAt').at(-1) ?? null }
}

const pad = (value: number) => String(value).padStart(2, '0')

/** The test hub: time since the learner started and every section with its own entry point. */
export function PlacementDashboard({
  groups, answers, completedIds, timings, startedAt, submitting, error, onOpenGroup, onRetrySubmit, onRedoSurvey,
}: PlacementDashboardProps) {
  const elapsed = useElapsedSeconds(startedAt)
  const done = groups.filter((group) => isGroupDone(group, completedIds)).length
  const allDone = groups.length > 0 && done === groups.length
  const clock = [Math.floor(elapsed / 3600), Math.floor((elapsed % 3600) / 60), elapsed % 60]

  return (
    <div className="pl-dashboard">
      <section className="pl-card pl-clock" aria-labelledby="pl-clock-title">
        <h2 className="pl-card__title" id="pl-clock-title">Bài kiểm tra đầu vào</h2>
        <div className="pl-clock__body">
          <p className="pl-clock__eyebrow">Bạn đã bắt đầu được</p>
          <p className="pl-clock__digits" role="timer" aria-label={`${clock[0]} giờ ${clock[1]} phút ${clock[2]} giây`}>
            {clock.map((value, index) => (
              <span className="pl-clock__unit" key={index}>
                <span className="pl-clock__value">{pad(value)}</span>
                <span className="pl-clock__caption">{['Giờ', 'Phút', 'Giây'][index]}</span>
              </span>
            ))}
          </p>
          <p className="pl-clock__note">Không giới hạn thời gian. Câu trả lời được lưu trên hệ thống nên có thể thoát và quay lại làm tiếp; phần nào đã nộp thì không mở lại được.</p>
        </div>
      </section>

      <section className="pl-card pl-parts" aria-labelledby="pl-parts-title">
        <header className="pl-parts__head">
          <h2 className="pl-card__title" id="pl-parts-title">Phần thi của bạn</h2>
          <span className="pl-parts__count">{done}/{groups.length} đã hoàn thành</span>
        </header>
        <ol className="pl-parts__list">
          {groups.map((group) => {
            const meta = SKILL_META[group.skill]
            const Icon = meta.icon
            const total = groupQuestionCount(group)
            const answered = groupAnsweredCount(group, answers)
            const isDone = isGroupDone(group, completedIds)
            const minutes = isDone ? minutesSpent(groupTiming(group, timings)) : null
            return (
              <li className="pl-parts__row" data-done={isDone} key={group.id}>
                <span className="pl-parts__check" aria-hidden="true">
                  {isDone ? <CircleCheckBig size={26} strokeWidth={1.9} /> : <Icon size={26} strokeWidth={1.75} />}
                </span>
                <span className="pl-parts__name">
                  <strong>{meta.label}</strong>
                </span>
                {isDone ? (
                  <span className="pl-parts__done">
                    {minutes !== null ? `${minutes} phút` : 'Đã hoàn thành'}
                  </span>
                ) : (
                  <span className="pl-parts__qty">{total} câu</span>
                )}
                <Button className="pl-btn pl-btn--accent pl-btn--sm" disabled={isDone || submitting}
                  onClick={() => onOpenGroup(group.id)} type="button">
                  {answered > 0 && !isDone ? 'Làm tiếp' : 'Làm bài'}
                </Button>
              </li>
            )
          })}
        </ol>
        <footer className="pl-parts__foot">
          {submitting ? (
            <p className="pl-parts__status" role="status"><Loader2 aria-hidden="true" className="lp-spin" size={16} />Đang nộp bài…</p>
          ) : error ? (
            <>
              <p className="lp-error" role="alert">{error}</p>
              <Button className="pl-btn pl-btn--accent" onClick={onRetrySubmit} type="button">Thử nộp lại</Button>
            </>
          ) : allDone ? (
            // Reached only when the automatic submit did not go through, e.g. the page was closed meanwhile.
            <>
              <p>Bạn đã hoàn thành tất cả các phần nhưng bài chưa được nộp.</p>
              <Button className="pl-btn pl-btn--accent" onClick={onRetrySubmit} type="button">Nộp bài</Button>
            </>
          ) : (
            <p>Làm lần lượt từng phần. Bài được nộp tự động khi bạn hoàn thành phần cuối cùng.</p>
          )}
        </footer>
      </section>

      <div className="pl-dashboard__redo">
        <Button className="pl-btn" disabled={submitting} onClick={onRedoSurvey} type="button" variant="outline">
          <RotateCcw aria-hidden="true" />Làm lại khảo sát
        </Button>
      </div>
    </div>
  )
}
