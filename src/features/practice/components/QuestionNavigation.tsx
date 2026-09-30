import { ArrowLeft, ArrowRight } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface QuestionNavigationProps {
  questionNumbers: readonly number[]
  currentQuestion: number
  onPrevious: () => void
  onNext: () => void
}

export function QuestionNavigation({
  questionNumbers,
  currentQuestion,
  onPrevious,
  onNext,
}: QuestionNavigationProps) {
  const currentIndex = questionNumbers.indexOf(currentQuestion)

  return (
    <nav className="question-navigation" aria-label="Điều hướng câu hỏi">
      <Button type="button" variant="outline" className="question-navigation-button" disabled={currentIndex <= 0} onClick={onPrevious}>
        <ArrowLeft aria-hidden="true" size={18} />
        <span>Back</span>
      </Button>
      <Button type="button" variant="default" className="question-navigation-button question-navigation-next" disabled={currentIndex === -1 || currentIndex >= questionNumbers.length - 1} onClick={onNext}>
        <span>Next</span>
        <ArrowRight aria-hidden="true" size={18} />
      </Button>
    </nav>
  )
}
