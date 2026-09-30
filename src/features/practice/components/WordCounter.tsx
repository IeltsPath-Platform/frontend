import { FileText } from 'lucide-react'
import { countWords } from '../lib/time'

interface WordCounterProps {
  value: string
  target: number
}

export function WordCounter({ value, target }: WordCounterProps) {
  const wordCount = countWords(value)
  const isTargetMet = wordCount >= target

  return (
    <p className={`word-counter${isTargetMet ? ' is-target-met' : ''}`} role="status" aria-live="polite">
      <FileText aria-hidden="true" size={16} />
      <span><strong>{wordCount}</strong> / {target} từ</span>
      <span className="word-counter-status">{isTargetMet ? 'Đạt yêu cầu' : `Còn ${target - wordCount} từ`}</span>
    </p>
  )
}
