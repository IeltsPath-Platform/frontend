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
   * Shown only while the answer still matches what was graded. Right or wrong is reported by a toast,
   * so the field itself only carries the hint and, once the block is passed, the solution.
   */
  result?: QuestionResult
}

export function QuestionField({ question, value, onChange, onBlur, disabled, result }: QuestionFieldProps) {
  const promptId = `${question.id}-prompt`
  // A hint is shown only once the question has been graded wrong: before that the learner should not see it.
  const hint = result && !result.correct ? (result.hint || question.hint || null) : null

  return (
    <div className="lp-question">
      <p id={promptId} className="lp-question__prompt">
        <span className="lp-question__num" aria-label={`Câu ${question.number}`}>{question.number}</span>
        <span>{question.prompt}</span>
      </p>
      {question.options ? (
        <RadioGroup aria-labelledby={promptId} className="lp-options" disabled={disabled} onValueChange={onChange} value={value}>
          {question.options.map((option) => {
            const optionId = `${question.id}-${option.value}`
            return (
              <label className="lp-option" data-checked={value === option.value} htmlFor={optionId} key={option.value}>
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
          disabled={disabled}
          onBlur={onBlur}
          onChange={(event) => onChange(event.target.value)}
          placeholder="Nhập câu trả lời"
          spellCheck={false}
            value={value || undefined}
        />
      )}
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
