import { useId } from 'react'
import type { EssayKnowledgeJudgment } from '~types/learningPath'
import { JUDGMENT_LABEL } from './essayCriteria'

/** How the essay did on each knowledge point the question practises, with the sentence that shows it. */
export function EssayTaskJudgments({ judgments }: { judgments: EssayKnowledgeJudgment[] | undefined }) {
  const headingId = useId()
  if (!judgments?.length) return null
  return (
    <section className="lp-essay-task-kps" aria-labelledby={headingId}>
      <h4 id={headingId}>Kiến thức của đề bài</h4>
      <ul className="lp-essay-criteria__kps">
        {judgments.map((item) => (
          <li className={`is-${item.judgment === 'PASS' ? 'good' : item.judgment === 'FAIL' ? 'weak' : 'neutral'}`} key={item.knowledgePointId}>
            <span>{item.name ?? item.code ?? 'Điểm kiến thức'}</span>
            <em>{JUDGMENT_LABEL[item.judgment]}</em>
            {item.excerpt ? <q>{item.excerpt}</q> : null}
            {item.reason ? <small>{item.reason}</small> : null}
          </li>
        ))}
      </ul>
    </section>
  )
}
