import { boldRuns, essaySections } from '@/features/practice/writing/writingText'
import '../essay-sample.css'

interface EssaySampleTextProps {
  sample: string
  task: 'TASK_1' | 'TASK_2' | null
}

/**
 * A model answer: one paragraph per part of the essay, separated by a blank line. Phrases worth learning arrive wrapped
 * in `**double asterisks**` and are highlighted. A sample whose paragraphs do not match the parts of the task (older
 * content) is shown without part labels.
 */
export function EssaySampleText({ sample, task }: EssaySampleTextProps) {
  const paragraphs = sample.split(/\n\s*\n/).map((paragraph) => paragraph.trim()).filter(Boolean)
  const labels = task ? essaySections(task) : []
  const labelled = labels.length > 0 && labels.length === paragraphs.length
  const highlighted = paragraphs.some((paragraph) => boldRuns(paragraph).some((run) => run.bold))

  return (
    <div className="lp-essay-sample__body">
      {paragraphs.map((paragraph, index) => (
        <div className="lp-essay-sample__part" key={index}>
          {labelled ? <h4 className="lp-essay__label">{labels[index]}</h4> : null}
          <p>
            {boldRuns(paragraph).map((run, runIndex) => run.bold
              ? <mark key={runIndex}>{run.text}</mark>
              : <span key={runIndex}>{run.text}</span>)}
          </p>
        </div>
      ))}
      {highlighted ? <p className="lp-essay-sample__legend">Các cụm được tô nổi là từ vựng nên học.</p> : null}
    </div>
  )
}
