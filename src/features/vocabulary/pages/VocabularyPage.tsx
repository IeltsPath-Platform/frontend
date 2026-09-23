import { useState } from "react"
import { VOCAB_TOPICS } from "@/lib/mock/catalog"

const STORAGE_KEY = "ieltspath-vocab"

export function VocabularyPage() {
  const [saved, setSaved] = useState<string[]>(() => {
    if (typeof window === "undefined") return []
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    try {
      return JSON.parse(raw) as string[]
    } catch {
      return []
    }
  })
  const [open, setOpen] = useState<string | null>(null)
  const [topicId, setTopicId] = useState(VOCAB_TOPICS[0].id)
  const topic = VOCAB_TOPICS.find((item) => item.id === topicId) ?? VOCAB_TOPICS[0]

  const toggleSave = (word: string) => {
    const next = saved.includes(word) ? saved.filter((item) => item !== word) : [...saved, word]
    setSaved(next)
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
  }

  return (
    <main className="band vocab" id="main-content" tabIndex={-1}>
      <header className="practice__head">
        <div>
          <p className="kicker">Sổ từ</p>
          <h1>Từ trong bài, không phải danh sách rời.</h1>
          <p>Lật thẻ để xem nghĩa theo ngữ cảnh. Từ đã lưu nằm ở cột bên phải để ôn lại.</p>
        </div>
        <p className="saved-count"><strong>{saved.length}</strong> từ đang lưu trên máy này</p>
      </header>
      <div className="vocab__layout">
        <div>
          <div className="chip-row" role="tablist" aria-label="Chủ đề">
            {VOCAB_TOPICS.map((item) => (
              <button key={item.id} type="button" role="tab" aria-selected={item.id === topic.id} onClick={() => setTopicId(item.id)}>{item.title}</button>
            ))}
          </div>
          <ul className="cards">
            {topic.words.map((entry) => {
              const key = `${topic.id}-${entry.word}`
              const flipped = open === key
              return (
                <li key={key}>
                  <button type="button" className={flipped ? "is-open" : ""} onClick={() => setOpen(flipped ? null : key)} aria-expanded={flipped}>
                    <strong>{entry.word}</strong>
                    {flipped ? <><span>{entry.meaning}</span><em>{entry.example}</em></> : <span>Bấm để xem nghĩa</span>}
                  </button>
                  <button type="button" className="text-link" onClick={() => toggleSave(entry.word)}>{saved.includes(entry.word) ? "Bỏ lưu" : "Lưu vào sổ"}</button>
                </li>
              )
            })}
          </ul>
        </div>
        <aside>
          <h2>Đã lưu</h2>
          {saved.length === 0 ? <p>Chưa có từ nào. Lưu một thẻ để lần sau không phải tìm lại.</p> : <ul>{saved.map((word) => <li key={word}>{word}</li>)}</ul>}
        </aside>
      </div>
    </main>
  )
}
