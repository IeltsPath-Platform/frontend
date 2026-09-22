import { useState } from "react"
import { DICTATION_LINES } from "@/lib/mock/catalog"

function normalize(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9\s]/g, "").replace(/\s+/g, " ").trim()
}

export function DictationPage() {
  const [index, setIndex] = useState(0)
  const [draft, setDraft] = useState("")
  const [status, setStatus] = useState<"idle" | "ok" | "miss">("idle")
  const line = DICTATION_LINES[index]

  const speak = () => {
    if (!window.speechSynthesis) return
    window.speechSynthesis.cancel()
    const utterance = new SpeechSynthesisUtterance(line.text)
    utterance.lang = "en-GB"
    utterance.rate = 0.9
    window.speechSynthesis.speak(utterance)
  }

  const check = () => setStatus(normalize(draft) === normalize(line.text) ? "ok" : "miss")

  const next = () => {
    setIndex((current) => (current + 1) % DICTATION_LINES.length)
    setDraft("")
    setStatus("idle")
  }

  return (
    <main className="band dictation" id="main-content" tabIndex={-1}>
      <p className="kicker">{line.part}</p>
      <h1>Chép chính tả một câu trước khi vào full test.</h1>
      <p>Bấm nghe, viết lại đúng dấu câu. Câu {index + 1}/{DICTATION_LINES.length}.</p>
      <div className="dictation__box">
        <button className="cta" type="button" onClick={speak}>Nghe câu</button>
        <label>Bài chép của bạn
          <textarea value={draft} onChange={(event) => { setDraft(event.target.value); setStatus("idle") }} rows={4} />
        </label>
        <div className="hero__actions">
          <button className="cta" type="button" onClick={check}>Kiểm tra</button>
          <button className="cta cta--ghost" type="button" onClick={next}>Câu tiếp theo</button>
        </div>
        {status === "ok" ? <p className="level-note" role="status">Khớp với câu nghe.</p> : null}
        {status === "miss" ? <p className="level-note" role="status">Chưa khớp. Nghe lại và đối chiếu: {line.text}</p> : null}
      </div>
    </main>
  )
}
