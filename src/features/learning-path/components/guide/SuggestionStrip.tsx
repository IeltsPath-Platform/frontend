import type { CSSProperties, ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { ArrowDown, ArrowRight, BookOpen, CalendarClock, Dumbbell, ListChecks, Loader2, Sprout, Timer } from 'lucide-react'
import type { Suggestion, SuggestionReason, SuggestionType } from '~types/learningPath'
import { learningApi } from '../../api'
import { reasonMeta, suggestionCtaLabel, suggestionTypeLabel } from '../../lib/masteryGuide'
import { useApiResource } from '../../lib/useApiResource'
import { useStartBasketReview } from '../../lib/useStartBasketReview'
import { skillLabel } from '../../lib/courseMeta'

/** Where a suggestion that is opened from the course list points: the list of courses on the same page. */
const COURSE_LIST_ANCHOR = '#lp-courses-title'

const REASON_ICON: Record<SuggestionReason, typeof Dumbbell> = {
  CONSOLIDATE: Dumbbell,
  DUE: CalendarClock,
  NEXT_IN_TREE: Sprout,
}

const TYPE_ICON: Record<SuggestionType, typeof BookOpen> = {
  PRACTICE_SET: ListChecks,
  PRACTICE_TEST: Timer,
  LESSON: BookOpen,
}

/**
 * Up to five optional things worth doing next, most useful first. The first one is drawn large because the order is the
 * priority. It is a suggestion only: a failed or empty answer leaves no trace on the page, and nothing here blocks the
 * course below.
 */
export function SuggestionStrip() {
  const resource = useApiResource('suggestions', () => learningApi.getSuggestions())
  const { busyId, start } = useStartBasketReview()

  if (resource.status === 'loading') return <SuggestionSkeleton />
  const items = resource.status === 'success' ? (resource.data ?? []) : []
  if (items.length === 0) return null

  return (
    <section aria-labelledby="lp-guide-title" className="lp-guide">
      <header className="lp-guide__head">
        <div>
          <p className="lp-eyebrow">Gợi ý hôm nay</p>
          <h2 id="lp-guide-title">Vài việc nhỏ giúp bạn chắc hơn</h2>
        </div>
        <p className="lp-guide__note">Chỉ là gợi ý. Bỏ qua cũng không ảnh hưởng đến lộ trình của bạn.</p>
        <Link className="lp-guide__basket" to="/learn/review-basket">
          Giỏ ôn tập
          <ArrowRight aria-hidden="true" size={15} />
        </Link>
      </header>

      <ol className="lp-guide__list">
        {items.map((suggestion, index) => (
          <SuggestionCard
            busy={busyId === suggestion.knowledgePointId}
            index={index}
            key={`${suggestion.type}:${suggestion.id}`}
            onStart={() => void start(suggestion.knowledgePointId)}
            suggestion={suggestion}
            locked={busyId !== null}
          />
        ))}
      </ol>
    </section>
  )
}

function SuggestionCard({ suggestion, index, busy, locked, onStart }: {
  suggestion: Suggestion
  index: number
  busy: boolean
  /** Another suggestion is starting, so this one waits. */
  locked: boolean
  onStart: () => void
}) {
  const reason = reasonMeta(suggestion.reason)
  const ReasonIcon = REASON_ICON[suggestion.reason]
  const TypeIcon = TYPE_ICON[suggestion.type]
  const skill = skillLabel(suggestion.skill)
  const label = suggestionCtaLabel(suggestion)

  return (
    <li
      className={`lp-sug lp-sug--${reason.tone}${index === 0 ? ' is-lead' : ''}`}
      style={{ '--i': index } as CSSProperties}
    >
      <span aria-hidden="true" className="lp-sug__index">{String(index + 1).padStart(2, '0')}</span>

      <span className="lp-sug__reason" title={reason.hint}>
        <ReasonIcon aria-hidden="true" size={14} />
        {reason.label}
      </span>

      <div className="lp-sug__body">
        <h3 className="lp-sug__title">{suggestion.title}</h3>
        <p className="lp-sug__meta">
          <span className="lp-sug__type">
            <TypeIcon aria-hidden="true" size={14} />
            {suggestionTypeLabel(suggestion.type)}
          </span>
          {skill ? <span>{skill}</span> : null}
          {suggestion.band !== null ? <span className="lp-sug__band">Band {suggestion.band.toFixed(1)}</span> : null}
          {suggestion.knowledgePointCode ? <span className="lp-sug__code">{suggestion.knowledgePointCode}</span> : null}
        </p>
      </div>

      <SuggestionAction busy={busy} disabled={locked} label={label} onStart={onStart} suggestion={suggestion} />
    </li>
  )
}

function SuggestionAction({ suggestion, label, busy, disabled, onStart }: {
  suggestion: Suggestion
  label: string
  busy: boolean
  disabled: boolean
  onStart: () => void
}): ReactNode {
  const action = suggestion.action
  if (action.kind === 'LESSON') {
    return (
      <Link className="lp-sug__cta" to={`/learn/lessons/${action.lessonId}`}>
        {label}
        <ArrowRight aria-hidden="true" size={15} />
      </Link>
    )
  }
  if (action.kind === 'BASKET_REVIEW') {
    return (
      <button aria-busy={busy} className="lp-sug__cta" disabled={disabled} onClick={onStart} type="button">
        {busy ? <Loader2 aria-hidden="true" className="lp-spin" size={15} /> : null}
        {busy ? 'Đang mở…' : label}
        {busy ? null : <ArrowRight aria-hidden="true" size={15} />}
      </button>
    )
  }
  return (
    <a className="lp-sug__cta lp-sug__cta--quiet" href={COURSE_LIST_ANCHOR}>
      {label}
      <ArrowDown aria-hidden="true" size={15} />
    </a>
  )
}

function SuggestionSkeleton() {
  return (
    <section aria-busy="true" aria-label="Đang tải gợi ý" className="lp-guide">
      <div className="lp-guide__list lp-guide__list--loading">
        <span className="lp-skeleton-box lp-guide__ghost lp-guide__ghost--lead" />
        <span className="lp-skeleton-box lp-guide__ghost" />
        <span className="lp-skeleton-box lp-guide__ghost" />
      </div>
    </section>
  )
}
