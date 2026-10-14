import { useContext, useLayoutEffect, type ReactNode } from 'react'
import { Check, Info } from 'lucide-react'
import { SectionContext, type Fact } from './summary-context'
import { classifyList, listItems, meaningful, type HNode, type ListItem } from './summary-shapes'

function ReportFact({ id, fact }: { id: string; fact: Fact }) {
  const { report } = useContext(SectionContext)
  const { count, unit } = fact
  useLayoutEffect(() => {
    report(id, { count, unit })
    return () => report(id, null)
  }, [id, count, unit, report])
  return null
}

/** Renders the inline parts of a syntax tree: text, bold, italic, code and links. */
function Inline({ nodes }: { nodes: HNode[] }): ReactNode {
  return nodes.map((node, index) => {
    if (node.type === 'text') return node.value
    if (node.type !== 'element') return null
    const children = <Inline nodes={node.children ?? []} />
    switch (node.tagName) {
      case 'strong': return <strong key={index}>{children}</strong>
      case 'em': return <em key={index}>{children}</em>
      case 'code': return <code key={index}>{children}</code>
      case 'br': return <br key={index} />
      case 'a': {
        const href = typeof node.properties?.href === 'string' ? node.properties.href : undefined
        return <a href={href} key={index} target="_blank" rel="noopener noreferrer">{children}</a>
      }
      case 'ul':
      case 'ol': {
        const Tag = node.tagName
        return <Tag className="lp-sum__nested" key={index}>{children}</Tag>
      }
      case 'li': return <li key={index}>{children}</li>
      case 'p': return <span key={index}>{children}</span>
      default: return <span key={index}>{children}</span>
    }
  })
}

const GROUP_TONES = ['blue', 'green', 'red', 'violet', 'amber'] as const

export function ListBlock({ node }: { node: HNode }) {
  const { title } = useContext(SectionContext)
  const id = String(node.position?.start?.line ?? 0)
  const items = listItems(node)

  if (node.tagName === 'ol') {
    return (
      <>
        <ReportFact fact={{ count: items.length, unit: 'mục' }} id={id} />
        <ol className="lp-sum-steps">
          {items.map((item, index) => (
            <li key={index}><Inline nodes={item.content} /></li>
          ))}
        </ol>
      </>
    )
  }

  const shape = classifyList(items, title)

  if (shape.kind === 'chips') {
    const total = shape.groups.reduce((sum, group) => sum + group.words.length, 0)
    return (
      <>
        <ReportFact fact={{ count: total, unit: 'từ' }} id={id} />
        <div className="lp-sum-groups">
          {shape.groups.map((group, index) => (
            <div className={`lp-sum-group lp-sum-group--${GROUP_TONES[index % GROUP_TONES.length]}`} key={index}>
              <p className="lp-sum-group__label">
                <i aria-hidden="true" />
                <Inline nodes={group.label} /> <span>({group.words.length})</span>
              </p>
              <ul className="lp-sum-chips">
                {group.words.map((word, wordIndex) => <li key={wordIndex}>{word}</li>)}
              </ul>
            </div>
          ))}
        </div>
      </>
    )
  }

  if (shape.kind === 'cards') {
    return (
      <>
        <ReportFact fact={{ count: shape.items.length, unit: 'mục' }} id={id} />
        <ul className="lp-sum-cards">
          {shape.items.map((item, index) => <Card index={index} item={item} key={index} />)}
        </ul>
      </>
    )
  }

  if (shape.kind === 'checks') {
    return (
      <>
        <ReportFact fact={{ count: shape.items.length, unit: 'cụm' }} id={id} />
        <ul className="lp-sum-checks">
          {shape.items.map((item, index) => (
            <li key={index}>
              <Check aria-hidden="true" size={15} strokeWidth={2.5} />
              <span><Inline nodes={item.content} /></span>
            </li>
          ))}
        </ul>
      </>
    )
  }

  return (
    <>
      <ReportFact fact={{ count: shape.items.length, unit: 'mục' }} id={id} />
      <ul className="lp-sum-bullets">
        {shape.items.map((item, index) => (
          <li key={index}><Inline nodes={item.content} /></li>
        ))}
      </ul>
    </>
  )
}

function Card({ item, index }: { item: ListItem; index: number }) {
  return (
    <li className="lp-sum-card">
      <p className="lp-sum-card__head">
        <span className="lp-sum-card__no" aria-hidden="true">{index + 1}</span>
        <strong><Inline nodes={item.lead ?? []} /></strong>
      </p>
      {item.description.length > 0 ? (
        <p className="lp-sum-card__text"><Inline nodes={item.description} /></p>
      ) : null}
      {item.examples.map((example, exampleIndex) => (
        <q className="lp-sum-card__example" key={exampleIndex}>{example.replace(/^["“”']+|["“”']+$/g, '')}</q>
      ))}
    </li>
  )
}

export function TableBlock({ node, children }: { node: HNode; children?: ReactNode }) {
  const body = meaningful(node.children).find((child) => child.tagName === 'tbody')
  const rows = meaningful(body?.children).length
  return (
    <>
      <ReportFact fact={{ count: rows, unit: 'mục' }} id={String(node.position?.start?.line ?? 0)} />
      <div className="lp-sum-table"><table>{children}</table></div>
    </>
  )
}

export function SummaryNote({ children }: { children?: ReactNode }) {
  return (
    <aside className="lp-sum-note">
      <Info aria-hidden="true" size={18} />
      <div>{children}</div>
    </aside>
  )
}
