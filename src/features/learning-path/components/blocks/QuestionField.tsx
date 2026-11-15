import { CheckCircle2, XCircle } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import type { Question, QuestionResult } from '~types/learningPath'
import { ErrorHintNote } from './ErrorHintNote'

interface QuestionFieldProps {
  question: Question
  value: string
  onChange: (value: string) => void
  onBlur?: () => void
  disabled: boolean
  /**
   * Shown only while the answer still matches what was graded: the hint, and once the block is passed, the solution.
   */
  result?: QuestionResult
  /**
   * Marks each graded question right or wrong where it stands: the learner's choice (and the right option, when the grade carries
   * it) is coloured and a line says the verdict in words. Used for a submitted set shown again and for an exercise just submitted;
   * the toast only reports the score. The learner's own answer is `value`.
   */
  review?: boolean
}

/** What a reviewed question says about the learner's answer, in words as well as colour. */
function Verdict({ result, known }: { result: QuestionResult; known: boolean }) {
  if (result.correct) return <p className="lp-question__verdict is-correct"><CheckCircle2 aria-hidden="true" size={16} />Bạn trả lời đúng</p>
  return (
    <p className="lp-question__verdict is-wrong">
      <XCircle aria-hidden="true" size={16} />
      {known ? 'Bạn trả lời sai' : 'Bạn trả lời sai · đáp án bạn đã chọn không được lưu ở lần nộp này'}
    </p>
  )
}

export function QuestionField({ question, value, onChange, onBlur, disabled, result, review = false }: QuestionFieldProps) {
  const promptId = `${question.id}-prompt`
  // A hint is shown only once the question has been graded wrong: before that the learner should not see it.
  const hint = result && !result.correct ? (result.hint || question.hint || null) : null
  const verdictOf = (optionValue: string) => {
    if (!review || !result) return undefined
    if (optionValue === result.correctAnswer) return 'correct'
    // The right answer is not always sent (a block that is not passed yet keeps it back): then the learner's own choice carries
    // the verdict, green when it was right and red when it was not.
    if (optionValue !== value) return undefined
    return result.correct ? 'correct' : 'wrong'
  }

  return (
    <div className="lp-question" data-review={review ? 'true' : undefined}>
      <p id={promptId} className="lp-question__prompt">
        <span className="lp-question__num" aria-label={`Câu ${question.number}`}>{question.number}</span>
        <span>{question.prompt}</span>
      </p>
      {question.options ? (
        <RadioGroup aria-labelledby={promptId} className="lp-options" disabled={disabled} onValueChange={onChange} value={value}>
          {question.options.map((option) => {
            const optionId = `${question.id}-${option.value}`
            return (
              <label className="lp-option" data-checked={value === option.value} data-verdict={verdictOf(option.value)} htmlFor={optionId} key={option.value}>
                <RadioGroupItem id={optionId} value={option.value} />
                {option.label !== option.value && option.value.length <= 2 ? <span className="lp-option__key">{option.value}</span> : null}
                <span>{option.label}</span>
              </label>
            )
          })}
        </RadioGroup>
      ) : (
        <Input
          aria-labelledby={promptId}
          autoCapitalize="none"
          autoComplete="off"
          className="lp-gap-input h-11 text-base md:text-base"
          data-verdict={review && result ? (result.correct ? 'correct' : 'wrong') : undefined}
          disabled={disabled}
          onBlur={onBlur}
          onChange={(event) => onChange(event.target.value)}
          placeholder="Nhập câu trả lời"
          spellCheck={false}
            value={value || undefined}
        />
      )}
      {review && result ? <Verdict known={value.trim() !== ''} result={result} /> : null}
      {hint ? (
        <p className="lp-question__hint" role="note"><strong>Gợi ý:</strong> {hint}</p>
      ) : null}
      {result && !result.correct && result.error ? <ErrorHintNote hint={result.error} variant="answer" /> : null}
      {result?.correctAnswer ? (
        <div className="lp-solution">
          <p><strong>Đáp án:</strong> {result.correctAnswer}</p>
          {result.explanation ? <p>{result.explanation}</p> : null}
        </div>
      ) : null}
    </div>
  )
}
