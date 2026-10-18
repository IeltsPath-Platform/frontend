import { useCallback, useId, useMemo, useState } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { ChevronDown } from 'lucide-react'
import { Markdown } from './Markdown'
import { SUMMARY_COMPONENTS } from './summary-components'
import { SectionContext, type Fact } from './summary-context'
import { splitSections } from './summary-shapes'

/**
 * A lesson summary written in Markdown, shown as a banner and one collapsible card per `##` heading.
 * The headings are the author's own: nothing here depends on which lesson it is. A summary without
 * any heading is shown as plain Markdown.
 */
export function LessonSummary({ markdown, topicTitle }: { markdown: string | null; topicTitle?: string }) {
  const parsed = useMemo(() => (markdown?.trim() ? splitSections(markdown) : null), [markdown])
  if (!parsed) return <p className="lp-res-empty">Bài học này chưa có phần tóm tắt.</p>
  if (parsed.sections.length === 0) return <Markdown>{markdown ?? ''}</Markdown>

  return (
    <div className="lp-sum">
      {topicTitle ? (
        <div className="lp-sum__banner">
          <span>Topic</span>
          <strong>{topicTitle}</strong>
          <p>Tóm tắt kiến thức trọng tâm của bài học</p>
        </div>
      ) : null}

      {parsed.intro ? <Markdown>{parsed.intro}</Markdown> : null}

      <div className="lp-sum__sections">
        {parsed.sections.map((section, index) => (
          <SummarySection body={section.body} index={index} key={`${index}:${section.title}`} title={section.title} />
        ))}
      </div>
    </div>
  )
}

function SummarySection({ title, body, index }: { title: string; body: string; index: number }) {
  const [open, setOpen] = useState(true)
  const [facts, setFacts] = useState<Record<string, Fact>>({})
  const uid = useId()
  const panelId = `${uid}-panel`

  const report = useCallback((id: string, fact: Fact | null) => {
    setFacts((current) => {
      if (fact === null) {
        if (!(id in current)) return current
        return Object.fromEntries(Object.entries(current).filter(([key]) => key !== id))
      }
      const existing = current[id]
      if (existing && existing.count === fact.count && existing.unit === fact.unit) return current
      return { ...current, [id]: fact }
    })
  }, [])
  const context = useMemo(() => ({ title, report }), [title, report])

  // The first list or table of the section names it in the header.
  const first = Object.entries(facts).sort(([a], [b]) => Number(a) - Number(b))[0]?.[1]
  const letter = index < 26 ? String.fromCharCode(65 + index) : String(index + 1)

  return (
    <section className={`lp-sum__section${open ? ' is-open' : ''}`}>
      <button
        aria-controls={panelId}
        aria-expanded={open}
        className="lp-sum__head"
        onClick={() => setOpen((current) => !current)}
        type="button"
      >
        <span className="lp-sum__heading">
          <small>{`Section ${letter}`}</small>
          <h3>{title}</h3>
        </span>
        {first && first.count > 0 ? <span className="lp-sum__count">{first.count} {first.unit}</span> : null}
        <ChevronDown aria-hidden="true" className="lp-sum__chevron" size={18} />
      </button>

      <div className="lp-sum__panel" data-open={open} id={panelId} inert={!open}>
        <div className="lp-sum__panel-inner">
          <div className="lp-sum__body">
            <SectionContext.Provider value={context}>
              <ReactMarkdown components={SUMMARY_COMPONENTS} remarkPlugins={[remarkGfm]}>{body}</ReactMarkdown>
            </SectionContext.Provider>
          </div>
        </div>
      </div>
    </section>
  )
}
