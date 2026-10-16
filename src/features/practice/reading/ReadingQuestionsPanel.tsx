import type { Ref } from 'react'
import { QuestionField } from '@/features/learning-path/components/blocks/QuestionField'
import type { TestSection } from '@/features/learning-path/lib/attemptSnapshot'

/** "Questions 1-3. Do the following…" -> "Do the following…": the numbers are drawn again from the real order. */
function stripQuestionRange(text: string | null | undefined) {
  return text?.replace(/^Questions?\s+\d+\s*[-–]\s*\d+[.:]?\s*/i, '').trim() ?? ''
}

/** Area D: the questions of one passage, grouped the way the test paper groups them. */
export function ReadingQuestionsPanel({ section, numberByItem, answers, disabled, onChange, onBlur, onFocusQuestion, label = 'Câu hỏi Reading', scrollRef }: {
  section: TestSection
  label?: string
  scrollRef?: Ref<HTMLDivElement>
  numberByItem: ReadonlyMap<string, number>
  answers: Record<string, string>
  disabled: boolean
  onChange: (itemId: string, value: string) => void
  onBlur: (itemId: string) => void
  onFocusQuestion: (questionNumber: number) => void
}) {
  const items = section.items.filter((item) => item.question !== null)
  const groups = section.snapshot?.groups ?? []
  const groupIds = new Set(groups.map((group) => group.groupId))

  function renderItem(item: TestSection['items'][number]) {
    const question = item.question
    if (!question) return null
    const number = numberByItem.get(item.id) ?? 0
    return (
      <div id={`reading-question-${item.id}`} key={item.id} className="rw-question" onFocus={() => onFocusQuestion(number)}>
        <QuestionField
          question={{ ...question, number }}
          value={answers[item.id] ?? ''}
          disabled={disabled}
          onChange={(value) => onChange(item.id, value)}
          onBlur={() => onBlur(item.id)}
        />
      </div>
    )
  }

  const ungrouped = items.filter((item) => !item.question?.groupId || !groupIds.has(item.question.groupId))

  return (
    <section className="rw-questions" aria-label={label}>
      <div ref={scrollRef} className="rw-questions-scroll">
        {groups.map((group) => {
          const groupItems = items.filter((item) => item.question?.groupId === group.groupId)
          if (!groupItems.length) return null
          const numbers = groupItems.map((item) => numberByItem.get(item.id) ?? 0)
          const instructions = stripQuestionRange(group.instructions)
          return (
            <div className="rw-group" key={group.groupId}>
              <h2 className="rw-group-title">{Math.min(...numbers) === Math.max(...numbers) ? `Question ${numbers[0]}` : `Questions ${Math.min(...numbers)} - ${Math.max(...numbers)}`}</h2>
              {instructions && <p className="rw-group-instructions">{instructions}</p>}
              {groupItems.map(renderItem)}
            </div>
          )
        })}
        {ungrouped.length > 0 && (
          <div className="rw-group">
            {groups.length === 0 && (
              <h2 className="rw-group-title">
                Questions {numberByItem.get(ungrouped[0]!.id)} - {numberByItem.get(ungrouped[ungrouped.length - 1]!.id)}
              </h2>
            )}
            {ungrouped.map(renderItem)}
          </div>
        )}
      </div>
    </section>
  )
}
