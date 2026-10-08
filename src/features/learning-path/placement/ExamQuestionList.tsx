import { Bookmark, CloudOff } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import type { AnswerMap, Question } from '~types/learningPath'
import type { TestItem } from '../lib/attemptSnapshot'
import type { SaveState } from '../lib/useAttemptAnswers'

type GroupKind = 'tfng' | 'ynng' | 'choice' | 'gap'

interface QuestionGroup {
  kind: GroupKind
  entries: { item: TestItem; index: number }[]
}

const LEGENDS: Partial<Record<GroupKind, { intro: string; rows: [string, string][] }>> = {
  tfng: {
    intro: 'Do the following statements agree with the information given in the passage?',
    rows: [
      ['TRUE', 'if the statement agrees with the information'],
      ['FALSE', 'if the statement contradicts the information'],
      ['NOT GIVEN', 'if there is no information on this'],
    ],
  },
  ynng: {
    intro: 'Do the following statements agree with the views of the writer?',
    rows: [
      ['YES', 'if the statement agrees with the views of the writer'],
      ['NO', 'if the statement contradicts the views of the writer'],
      ['NOT GIVEN', 'if it is impossible to say what the writer thinks about this'],
    ],
  },
}

function kindOf(question: Question | null): GroupKind {
  const values = question?.options?.map((option) => option.value.toUpperCase())
  if (!values) return 'gap'
  if (values.includes('NOT_GIVEN') || values.includes('NOT GIVEN')) return values.includes('YES') ? 'ynng' : 'tfng'
  return 'choice'
}

/** Consecutive questions of the same kind share one heading and instruction, as on the paper. */
function groupItems(items: TestItem[]): QuestionGroup[] {
  const groups: QuestionGroup[] = []
  items.forEach((item, index) => {
    const kind = kindOf(item.question)
    const last = groups.at(-1)
    if (last?.kind === kind) last.entries.push({ item, index })
    else groups.push({ kind, entries: [{ item, index }] })
  })
  return groups
}

const listLetters = (letters: string[]) =>
  letters.length > 1 ? `${letters.slice(0, -1).join(', ')} or ${letters.at(-1)}` : letters.join('')

function instruction(group: QuestionGroup) {
  if (group.kind === 'gap') return 'Complete the sentences below. Write your answer in each gap.'
  if (group.kind === 'choice') {
    const letters = group.entries[0].item.question?.options?.map((option) => option.value) ?? []
    return `Choose the correct letter, ${listLetters(letters)}.`
  }
  return LEGENDS[group.kind]?.intro ?? ''
}

interface ExamQuestionListProps {
  items: TestItem[]
  answers: AnswerMap
  saveStates: Record<string, SaveState>
  current: number
  flagged: ReadonlySet<string>
  disabled: boolean
  onFocusItem: (index: number) => void
  onChange: (item: TestItem, value: string) => void
  onBlur: (item: TestItem) => void
  onToggleFlag: (itemId: string) => void
}

/** Questions grouped like the computer-based test: "Questions 1–6", the task instruction, then plain answer rows. */
export function ExamQuestionList(props: ExamQuestionListProps) {
  const { items, answers, saveStates, current, flagged, disabled, onFocusItem, onChange, onBlur, onToggleFlag } = props

  return (
    <div className="pl-qlist">
      {groupItems(items).map((group) => {
        const first = group.entries[0].item.question?.number
        const last = group.entries.at(-1)?.item.question?.number
        const legend = LEGENDS[group.kind]
        return (
          <section className="pl-qgroup" key={group.entries[0].item.id}>
            <h3 className="pl-qgroup__title">{first === last ? `Question ${first}` : `Questions ${first}–${last}`}</h3>
            <p className="pl-qgroup__intro">{instruction(group)}</p>
            {legend ? (
              <dl className="pl-qgroup__legend">
                {legend.rows.map(([term, meaning]) => (
                  <div key={term}><dt>{term}</dt><dd>{meaning}</dd></div>
                ))}
              </dl>
            ) : null}
            {group.entries.map(({ item, index }) => item.question ? (
              <div className="pl-q" data-current={index === current} id={`pl-q-${item.id}`} key={item.id}
                onFocusCapture={() => onFocusItem(index)}>
                <QuestionRow
                  disabled={disabled}
                  flagged={flagged.has(item.id)}
                  onBlur={() => onBlur(item)}
                  onChange={(value) => onChange(item, value)}
                  onToggleFlag={() => onToggleFlag(item.id)}
                  question={item.question}
                  value={answers[item.id] ?? ''}
                />
                {saveStates[item.id] === 'error' ? (
                  <p className="lp-save lp-save--error"><CloudOff aria-hidden="true" size={14} />Chưa lưu được, sẽ thử lại khi nộp phần này</p>
                ) : null}
              </div>
            ) : null)}
          </section>
        )
      })}
    </div>
  )
}

interface QuestionRowProps {
  question: Question
  value: string
  disabled: boolean
  flagged: boolean
  onChange: (value: string) => void
  onBlur: () => void
  onToggleFlag: () => void
}

function QuestionRow({ question, value, disabled, flagged, onChange, onBlur, onToggleFlag }: QuestionRowProps) {
  const promptId = `${question.id}-prompt`
  const flag = (
    <button aria-label={flagged ? `Bỏ đánh dấu câu ${question.number}` : `Đánh dấu câu ${question.number} để xem lại`}
      aria-pressed={flagged} className="pl-q__flag" onClick={onToggleFlag} type="button">
      <Bookmark aria-hidden="true" fill={flagged ? 'currentColor' : 'none'} size={16} />
    </button>
  )

  if (!question.options) {
    // The answer box sits in the gap of the sentence ("within ______."), or after it when there is no gap.
    const [before, ...rest] = question.prompt.split(/_{3,}/)
    const input = (
      <Input aria-label={`Câu ${question.number}`} autoCapitalize="none" autoComplete="off" className="pl-q__gap"
        disabled={disabled} onBlur={onBlur} onChange={(event) => onChange(event.target.value)} spellCheck={false} value={value} />
    )
    return (
      <p className="pl-q__stem pl-q__stem--gap" id={promptId}>
        <span className="pl-q__num">{question.number}</span>
        <span className="pl-q__text">{before}{input}{rest.join(' ')}</span>
        {flag}
      </p>
    )
  }

  return (
    <>
      <p className="pl-q__stem" id={promptId}>
        <span className="pl-q__num">{question.number}</span>
        <span className="pl-q__text">{question.prompt}</span>
        {flag}
      </p>
      <RadioGroup aria-labelledby={promptId} className="pl-q__options" disabled={disabled} onValueChange={onChange} value={value}>
        {question.options.map((option) => {
          const optionId = `${question.id}-${option.value}`
          return (
            <label className="pl-q__option" data-checked={value === option.value} htmlFor={optionId} key={option.value}>
              <RadioGroupItem id={optionId} value={option.value} />
              {option.label !== option.value && option.value.length === 1 ? <span className="pl-q__key">{option.value}</span> : null}
              <span>{option.label}</span>
            </label>
          )
        })}
      </RadioGroup>
    </>
  )
}
