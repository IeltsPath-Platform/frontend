import { Headphones } from 'lucide-react'

// "Section 3: Planning a river survey" -> the label is shown as a chip, so the title keeps only the topic.
const LABEL_PREFIX = /^(?:Section|Part)\s*\d+\s*[:.-]\s*/i
const QUESTION_RANGE = /Questions?\s+\d+\s*[-–]\s*\d+/i

/**
 * Practice layout: the line above the questions that says which section this is, its topic, what to do, and how many of its
 * questions are done.
 */
export function ListeningSectionHeader({ sectionLabel, title, instructions, numbers, answeredNumbers }: {
  sectionLabel: string
  title: string
  instructions: string | null
  /** Numbers of the questions of this section. */
  numbers: readonly number[]
  answeredNumbers: ReadonlySet<number>
}) {
  const first = numbers[0]
  const last = numbers[numbers.length - 1]
  const done = numbers.filter((number) => answeredNumbers.has(number)).length
  // The text of the data names the numbers of the whole test ("Questions 21-30"); this screen numbers what it shows.
  const hint = instructions && first !== undefined && last !== undefined
    ? instructions.replace(QUESTION_RANGE, `Questions ${first}–${last}`)
    : instructions

  return (
    <header className="lw-hero">
      <div className="lw-hero-text">
        <span className="lw-hero-chip"><Headphones size={14} aria-hidden="true" />{sectionLabel}</span>
        <h1>{title.replace(LABEL_PREFIX, '')}</h1>
        {hint && <p>{hint}</p>}
      </div>
      <p className="lw-hero-progress" aria-label={`Đã trả lời ${done} trên ${numbers.length} câu`}>
        <strong>{done}</strong>/{numbers.length} câu
        <span className="lw-hero-bar" aria-hidden="true"><i style={{ width: `${numbers.length ? (done / numbers.length) * 100 : 0}%` }} /></span>
      </p>
    </header>
  )
}
