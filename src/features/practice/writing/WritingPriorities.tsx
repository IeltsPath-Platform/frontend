import { useId } from 'react'
import type { WritingPriority } from './writingApi'
import { PracticeErrorButton } from './PracticeErrorButton'

/** The problems to work on first, at most three. Each has an example from the essay, what to do, and a way to practise it. */
export function WritingPriorities({ priorities, onShow }: {
  priorities: WritingPriority[]
  /** Scrolls the marked essay to the excerpt. */
  onShow: (excerpt: string) => void
}) {
  const headingId = useId()
  if (priorities.length === 0) return null
  return (
    <section className="wr-priorities" aria-labelledby={headingId}>
      <h2 id={headingId}>{priorities.length} vấn đề cần tập trung trước tiên</h2>
      <ol>
        {priorities.map((priority, index) => (
          <li key={`${priority.title}-${index}`}>
            <h3>{priority.title}</h3>
            {priority.explanation && <p>{priority.explanation}</p>}
            {priority.excerpts?.[0] && (
              <p className="wr-priority-example">
                <button type="button" className="wr-quote" onClick={() => onShow(priority.excerpts![0])}>“{priority.excerpts[0]}”</button>
              </p>
            )}
            {priority.action && <p className="wr-priority-action"><b>Cách sửa:</b> {priority.action}</p>}
            <PracticeErrorButton knowledgePointId={priority.practiceKnowledgePointId} name={priority.title} code={priority.errorCodes?.[0]} />
          </li>
        ))}
      </ol>
    </section>
  )
}
