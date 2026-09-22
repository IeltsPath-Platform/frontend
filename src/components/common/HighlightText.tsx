import { useRef, useState } from "react"
import { Highlighter } from "lucide-react"
import { Button } from "@/components/ui/button"

interface HighlightTextProps {
  content: string
}

export function HighlightText({ content }: HighlightTextProps) {
  const contentRef = useRef<HTMLParagraphElement>(null)
  const [highlight, setHighlight] = useState("")

  const captureSelection = () => {
    const selection = window.getSelection()?.toString().trim() ?? ""
    if (selection && contentRef.current?.textContent?.includes(selection)) {
      setHighlight(selection)
    }
  }

  const parts = highlight ? content.split(highlight) : [content]

  return (
    <div className="highlight-text">
      <div className="highlight-text__toolbar">
        <Highlighter aria-hidden="true" size={18} />
        <span>Chọn cụm từ trong đoạn văn để tô sáng.</span>
        {highlight && (
          <Button variant="ghost" size="sm" onClick={() => setHighlight("")}>
            Xóa tô sáng
          </Button>
        )}
      </div>
      <p ref={contentRef} onMouseUp={captureSelection} onKeyUp={captureSelection} tabIndex={0}>
        {parts.map((part, index) => (
          <span key={`${part}-${index}`}>
            {part}
            {highlight && index < parts.length - 1 ? <mark>{highlight}</mark> : null}
          </span>
        ))}
      </p>
    </div>
  )
}
