import { useId, useState, type CSSProperties } from 'react'
import { ArrowLeft, ArrowRight, CalendarDays, Clock, Loader2, PartyPopper } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { ClassMascot } from '@/components/ClassMascot'
import type { LearningGoalRequest } from '~types/learningPath'
import { learningApi, toApiError } from '../api'

interface Choice<T> { label: string; value: T }

const MINUTE_CHOICES: Choice<number>[] = [
  { label: 'Dưới 1 tiếng', value: 45 },
  { label: 'Khoảng 1 – 2 tiếng', value: 90 },
  { label: 'Khoảng 2 – 3 tiếng', value: 150 },
  { label: 'Trên 3 tiếng', value: 210 },
]

const BAND_CHOICES: Choice<number>[] = [
  { label: 'Dưới IELTS 5.5', value: 5.5 },
  { label: 'IELTS 6.0', value: 6 },
  { label: 'IELTS 6.5', value: 6.5 },
  { label: 'IELTS 7.0', value: 7 },
  { label: 'IELTS 7.5', value: 7.5 },
  { label: 'IELTS 8.0 trở lên', value: 8 },
]

const QUESTIONS = [
  'Bạn dự định thi IELTS khi nào?',
  'Bạn có thể dành bao nhiêu thời gian học mỗi ngày?',
  'Mục tiêu điểm IELTS của bạn là?',
] as const

/** `yyyy-mm` of the six months after the current one. */
function upcomingMonths(from = new Date()): Choice<string>[] {
  return Array.from({ length: 6 }, (_, index) => {
    const date = new Date(from.getFullYear(), from.getMonth() + index + 1, 1)
    const month = date.getMonth() + 1
    return { label: `Tháng ${month}/${date.getFullYear()}`, value: `${date.getFullYear()}-${String(month).padStart(2, '0')}` }
  })
}

/** Last day of a `yyyy-mm` month: a planned exam month counts as a future date for the whole month. */
function monthToExamDate(month: string) {
  const [year, monthNumber] = month.split('-').map(Number)
  const last = new Date(year, monthNumber, 0).getDate()
  return `${month}-${String(last).padStart(2, '0')}`
}

const formatExamMonth = (examDate: string | null) => {
  if (!examDate) return 'Chưa xác định'
  const [year, month] = examDate.split('-')
  return `${Number(month)}/${year}`
}

const hoursPerWeek = (minutesPerDay: number) => Math.round((minutesPerDay * 7) / 60)

interface PlacementSurveyProps {
  /** Starts (or resumes) the test once the learner confirms the summary. */
  onContinue: () => Promise<void>
  /** Reported so the stepper can fill while the learner answers. */
  onProgress: (answered: number, total: number) => void
}

/** Three chat-style questions that become the learner's study goal before the test. */
export function PlacementSurvey({ onContinue, onProgress }: PlacementSurveyProps) {
  const [step, setStep] = useState(0)
  const [examDate, setExamDate] = useState<string | null | undefined>(undefined)
  const [minutes, setMinutes] = useState<number | null>(null)
  const [band, setBand] = useState<number | null>(null)
  const [customMonth, setCustomMonth] = useState('')
  const [showCustom, setShowCustom] = useState(false)
  const [summary, setSummary] = useState<LearningGoalRequest | null>(null)
  const [saveWarning, setSaveWarning] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [continuing, setContinuing] = useState(false)
  const [continueError, setContinueError] = useState<string | null>(null)
  const bubbleId = useId()
  const months = upcomingMonths()

  function goTo(next: number) {
    setStep(next)
    onProgress(next, QUESTIONS.length)
  }

  function chooseExam(value: string | null) {
    setExamDate(value === null ? null : monthToExamDate(value))
    goTo(1)
  }

  function chooseMinutes(value: number) {
    setMinutes(value)
    goTo(2)
  }

  async function chooseBand(value: number) {
    setBand(value)
    if (minutes === null || examDate === undefined) return
    const goal: LearningGoalRequest = { targetBand: value, examDate, availableMinutesPerDay: minutes }
    setSaving(true)
    setSaveWarning(null)
    try {
      await learningApi.saveLearningGoal(goal)
    } catch (reason) {
      // The goal only tailors suggestions; the test can go on without it.
      setSaveWarning(`Chưa lưu được mục tiêu lên hệ thống (${toApiError(reason).message}). Bạn vẫn có thể làm bài.`)
    } finally {
      setSaving(false)
    }
    onProgress(QUESTIONS.length, QUESTIONS.length)
    setSummary(goal)
  }

  async function continueToTest() {
    setContinuing(true)
    setContinueError(null)
    try {
      await onContinue()
    } catch (reason) {
      setContinueError(`${toApiError(reason).message.replace(/[.!?]?$/, '.')} Hãy thử lại.`)
      setContinuing(false)
    }
  }

  return (
    <section className="pl-survey" aria-labelledby={bubbleId}>
      <div className="pl-survey__question" key={step}>
        <ClassMascot className="pl-survey__mascot" size="sm" />
        <p className="pl-survey__bubble" id={bubbleId}>{QUESTIONS[step]}</p>
      </div>

      {step === 0 ? (
        <div className="pl-survey__answers" key="exam">
          <div className="pl-chips">
            {months.map((month) => (
              <button className="pl-chip" data-selected={examDate === monthToExamDate(month.value)} key={month.value} onClick={() => chooseExam(month.value)} type="button">
                {month.label}
              </button>
            ))}
            <button className="pl-chip" aria-expanded={showCustom} data-selected={showCustom} onClick={() => setShowCustom((open) => !open)} type="button">
              Thời gian khác <CalendarDays aria-hidden="true" size={18} />
            </button>
            <button className="pl-chip" data-selected={examDate === null} onClick={() => chooseExam(null)} type="button">Chưa có kế hoạch</button>
          </div>
          {showCustom ? (
            <form className="pl-survey__custom" onSubmit={(event) => { event.preventDefault(); if (customMonth) chooseExam(customMonth) }}>
              <label htmlFor={`${bubbleId}-month`}>Chọn tháng thi</label>
              <input id={`${bubbleId}-month`} min={months[0]?.value} onChange={(event) => setCustomMonth(event.target.value)} type="month" value={customMonth} />
              <Button className="pl-btn pl-btn--accent" disabled={!customMonth} type="submit">Chọn<ArrowRight aria-hidden="true" /></Button>
            </form>
          ) : null}
        </div>
      ) : null}

      {step === 1 ? (
        <div className="pl-survey__answers pl-options-list" key="minutes">
          {MINUTE_CHOICES.map((choice) => (
            <button className="pl-option-row" data-selected={minutes === choice.value} key={choice.value} onClick={() => chooseMinutes(choice.value)} type="button">{choice.label}</button>
          ))}
        </div>
      ) : null}

      {step === 2 ? (
        <div className="pl-survey__answers pl-options-list" key="band">
          {BAND_CHOICES.map((choice) => (
            <button className="pl-option-row" data-selected={band === choice.value} disabled={saving} key={choice.value} onClick={() => void chooseBand(choice.value)} type="button">
              {choice.label}
              {saving && band === choice.value ? <Loader2 aria-hidden="true" className="lp-spin" size={18} /> : null}
            </button>
          ))}
        </div>
      ) : null}

      {step > 0 ? (
        <button className="pl-survey__back" onClick={() => goTo(step - 1)} type="button">
          <ArrowLeft aria-hidden="true" size={16} />Câu trước
        </button>
      ) : null}

      <Dialog open={summary !== null} onOpenChange={(open) => { if (!open && !continuing) setSummary(null) }}>
        <DialogContent className="lp-tokens pl-summary">
          {summary ? (
            <>
              <DialogHeader className="pl-summary__head">
                <PartyPopper aria-hidden="true" className="pl-summary__icon" size={34} />
                <DialogTitle>Bạn đã hoàn thành khảo sát!</DialogTitle>
                <DialogDescription>Mục tiêu này giúp hệ thống gợi ý lộ trình phù hợp sau bài kiểm tra đầu vào.</DialogDescription>
              </DialogHeader>
              <p className="pl-summary__facts">
                <span><CalendarDays aria-hidden="true" size={18} />{formatExamMonth(summary.examDate)}</span>
                <span><Clock aria-hidden="true" size={18} />~{hoursPerWeek(summary.availableMinutesPerDay)}h/tuần</span>
              </p>
              <BandChart target={summary.targetBand} />
              {saveWarning ? <p className="lp-hint" role="status">{saveWarning}</p> : null}
              {continueError ? <p className="lp-error" role="alert">{continueError}</p> : null}
              <Button className="pl-btn pl-btn--accent pl-btn--block" disabled={continuing} onClick={() => void continueToTest()} type="button">
                {continuing ? <Loader2 aria-hidden="true" className="lp-spin" /> : null}
                {continuing ? 'Đang mở bài test…' : 'Tiếp tục'}
              </Button>
            </>
          ) : null}
        </DialogContent>
      </Dialog>
    </section>
  )
}

const CHART_BANDS = [5.5, 6, 6.5, 7, 7.5, 8]

/** Bars from ≤5.5 to ≥8.0: reached bands in green, the target in orange, the rest greyed out. */
export function BandChart({ target }: { target: number }) {
  return (
    <figure className="pl-band-chart" aria-label={`Band mục tiêu ${target.toFixed(1)}`}>
      {CHART_BANDS.map((value, index) => {
        const tone = value < target ? 'below' : value === target ? 'target' : 'above'
        const label = index === 0 ? `≤${value.toFixed(1)}` : index === CHART_BANDS.length - 1 ? `≥${value.toFixed(1)}` : value.toFixed(1)
        return (
          <div className={`pl-band-chart__col pl-band-chart__col--${tone}`} key={value}>
            {tone === 'target' ? <span className="pl-band-chart__tip" style={{ '--pl-tip': (index + 2) / (CHART_BANDS.length + 1) } as CSSProperties}>Band mục tiêu</span> : null}
            <span className="pl-band-chart__bar" style={{ '--pl-bar': (index + 2) / (CHART_BANDS.length + 1) } as CSSProperties} />
            <span className="pl-band-chart__label">{label}</span>
          </div>
        )
      })}
    </figure>
  )
}
