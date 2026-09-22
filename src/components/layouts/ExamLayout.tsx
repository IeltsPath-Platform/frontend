import type { ReactNode } from "react"
import { Clock3, Flag, Send } from "lucide-react"
import { Button } from "@/components/ui/button"

interface ExamLayoutProps {
  title: string
  timeRemaining: string
  onSubmit: () => void
  children: ReactNode
}

export function ExamLayout({ title, timeRemaining, onSubmit, children }: ExamLayoutProps) {
  return (
    <div className="exam-layout">
      <header className="exam-layout__header">
        <a className="brand" href="/dashboard">IELTS<span>Path</span></a>
        <p>{title}</p>
        <div className="exam-layout__actions">
          <span className="exam-timer"><Clock3 aria-hidden="true" size={18} /> {timeRemaining}</span>
          <Button onClick={onSubmit} size="lg"><Send aria-hidden="true" /> Nộp bài</Button>
        </div>
      </header>
      {children}
      <p className="exam-layout__hint"><Flag aria-hidden="true" size={16} /> Cờ vàng đánh dấu câu cần xem lại.</p>
    </div>
  )
}
