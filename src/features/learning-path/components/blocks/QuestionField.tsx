import { Check, X } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import type { Question, QuestionResult } from '~types/learningPath'

interface QuestionFieldProps {
  question: Question
  value: string
  onChange: (value: string) => void
  onBlur?: () => void
  disabled: boolean
  /** Shown only while the answer still matches what was graded. */
  result?: QuestionResult
}

export function QuestionField({ question, value, onChange, onBlur, disabled, result }: QuestionFieldProps) {
  const promptId = `${question.id}-prompt`
  const tone = result ? (result.correct ? 'correct' : 'wrong') : 'idle'

  return (
    <div className={`lp-question lp-question--${tone}`}>
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
                {option.label !== option.value ? <span className="lp-option__key">{option.value}</span> : null}
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
      {result ? (
        <p className="lp-question__mark">
          {result.correct ? <Check aria-hidden="true" size={16} /> : <X aria-hidden="true" size={16} />}
          {result.correct ? 'Đúng' : 'Sai'}
        </p>
      ) : null}
      {!result?.correct && (result?.hint || question.hint) ? (
        <p className="lp-question__hint" role="note"><strong>Gợi ý:</strong> {result?.hint || question.hint}</p>
      ) : null}
      {result?.correctAnswer ? (
        <div className="lp-solution">
          <p><strong>Đáp án:</strong> {result.correctAnswer}</p>
          {result.explanation ? <p>{result.explanation}</p> : null}
        </div>
      ) : null}
    </div>
  )
}
