import { useEffect, useState } from 'react'
import { ArrowRight, Trash2 } from 'lucide-react'
import type { WritingCorrection, WritingErrorGroup } from './writingApi'
import { PracticeErrorButton } from './PracticeErrorButton'
import { buildFixes, countFixes, fixId, groupFixes, type ActiveFix, type FixItem } from './writingFixes'

function Fix({ item, active }: { item: FixItem; active: boolean }) {
  return (
    <li
      className={`wr-fix wr-fix--${item.tone}${item.suggestionOnly ? ' is-suggestion' : ''}${item.long ? ' is-long' : ''}${active ? ' is-active' : ''}`}
      id={fixId(item.number)} tabIndex={-1}
    >
      <header className="wr-fix__head">
        <span className="wr-fix__no" aria-label={`Lỗi ${item.number}`}>{item.number}</span>
        <span className={`wr-mark wr-mark-${item.tone}`}>{item.suggestionOnly ? 'Gợi ý' : item.label}</span>
        {item.name ? <span className="wr-fix__name">{item.name}</span> : null}
      </header>
      <div className="wr-fix__diff">
        <del>{item.excerpt}</del>
        <ArrowRight aria-label="sửa thành" className="wr-fix__arrow" size={14} />
        {item.suggestion
          ? <ins>{item.suggestion}</ins>
          : <ins className="is-removed"><Trash2 aria-hidden="true" size={13} />Bỏ đoạn này</ins>}
      </div>
      {item.reason ? <p className="wr-fix__why"><b>Tại sao sai?</b> {item.reason}</p> : null}
      {item.rule ? <p className="wr-fix__why"><b>Quy tắc:</b> {item.rule}</p> : null}
      {item.example ? <p className="wr-fix__why wr-fix__example">Ví dụ tương tự: “{item.example.wrong}” → “{item.example.right}”</p> : null}
      {item.suggestionOnly ? <p className="wr-fix__why">Câu vẫn đúng; đây chỉ là cách diễn đạt hay hơn.</p> : null}
      <div className="wr-fix__practice"><PracticeErrorButton code={item.code} knowledgePointId={item.practiceKnowledgePointId} name={item.name ?? item.label} /></div>
    </li>
  )
}

const prefersReducedMotion = () => typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches

/**
 * The mistakes of the essay as numbered cards in the order they appear in it: what was written, what it should be and why.
 * A bar shows how the mistakes split by category, and its buttons narrow the list to one category. When the learner picks a
 * mark in the essay ({@code active}) the list scrolls to its card, which stays highlighted until another mark is picked.
 */
export function WritingFixList({ corrections, errorGroups = [], active = null }: {
  corrections: readonly WritingCorrection[]
  /** The error kinds of the whole essay: their rule, a similar example and the practice set. */
  errorGroups?: readonly WritingErrorGroup[]
  active?: ActiveFix | null
}) {
  const items = buildFixes(corrections, errorGroups)
  const groups = groupFixes(items)
  const { errors, suggestions } = countFixes(items)
  const [filter, setFilter] = useState<string | null>(null)
  const [seenTick, setSeenTick] = useState(0)

  // A card the category filter hides cannot be scrolled to: picking its mark clears the filter first, in the same render.
  if (active && active.tick !== seenTick) {
    setSeenTick(active.tick)
    const target = items.find((item) => item.number === active.number)
    if (filter !== null && target && target.label !== filter) setFilter(null)
  }

  const activeTick = active?.tick
  const activeNumber = active?.number
  useEffect(() => {
    if (activeTick === undefined || activeNumber === undefined) return
    const card = document.getElementById(fixId(activeNumber))
    card?.scrollIntoView({ block: 'center', behavior: prefersReducedMotion() ? 'auto' : 'smooth' })
    card?.focus({ preventScroll: true })
  }, [activeTick, activeNumber])

  const shown = filter ? items.filter((item) => item.label === filter) : items

  return (
    <section className="wr-fixlist" aria-label="Các lỗi cần sửa">
      <header className="wr-fixlist__head">
        <h3>Các lỗi cần sửa</h3>
        <p className="wr-muted">{errors} lỗi{suggestions > 0 ? ` · ${suggestions} gợi ý diễn đạt` : ''}</p>
      </header>

      {groups.length > 1 ? (
        <div className="wr-fixlist__bar" aria-hidden="true">
          {groups.map((group) => <span className={`wr-fixlist__seg wr-fixlist__seg--${group.tone}`} key={group.label} style={{ flexGrow: group.count }} />)}
        </div>
      ) : null}
      <div className="wr-fixlist__filters" role="group" aria-label="Lọc lỗi theo loại">
        <button aria-pressed={filter === null} className="wr-fixlist__filter" onClick={() => setFilter(null)} type="button">
          Tất cả <span>{items.length}</span>
        </button>
        {groups.map((group) => (
          <button
            aria-pressed={filter === group.label} className={`wr-fixlist__filter wr-fixlist__filter--${group.tone}`} key={group.label}
            onClick={() => setFilter(filter === group.label ? null : group.label)} type="button"
          >
            {group.label} <span>{group.count}</span>
          </button>
        ))}
      </div>

      <ol className="wr-fixlist__cards">{shown.map((item) => <Fix active={activeNumber === item.number} item={item} key={item.key} />)}</ol>
    </section>
  )
}
