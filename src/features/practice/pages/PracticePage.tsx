import { useMemo, useState } from "react"
import { Link, useSearchParams } from "react-router-dom"
import { CATALOG, QUESTION_TYPES, type CatalogSkill } from "@/lib/mock/catalog"
import { useAuthStore } from "@/features/auth/store/useAuthStore"

const SKILLS: { id: "ALL" | CatalogSkill; label: string }[] = [
  { id: "ALL", label: "Tất cả" },
  { id: "FULL_TEST", label: "Full test" },
  { id: "LISTENING", label: "Listening" },
  { id: "READING", label: "Reading" },
  { id: "WRITING", label: "Writing" },
  { id: "SPEAKING", label: "Speaking" },
]

const SOURCES = ["Tất cả", "Cambridge 18", "Cambridge 19", "Cambridge 20", "Đề thi thật", "Dự đoán", "Luyện kỹ năng"]

export function PracticePage() {
  const [params, setParams] = useSearchParams()
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated)
  const skill = (params.get("skill") as CatalogSkill | null) ?? "ALL"
  const [source, setSource] = useState("Tất cả")
  const [query, setQuery] = useState("")
  const [type, setType] = useState(params.get("type") ?? "Tất cả")

  const tests = useMemo(() => CATALOG.filter((test) => {
    const skillOk = skill === "ALL" || test.skill === skill
    const sourceOk = source === "Tất cả" || test.source === source
    const typeOk = type === "Tất cả" || test.questionType === type
    const queryOk = `${test.title} ${test.questionType}`.toLowerCase().includes(query.trim().toLowerCase())
    return skillOk && sourceOk && typeOk && queryOk
  }), [query, skill, source, type])

  const setSkill = (next: "ALL" | CatalogSkill) => {
    const updated = new URLSearchParams(params)
    if (next === "ALL") updated.delete("skill")
    else updated.set("skill", next)
    setParams(updated, { replace: true })
  }

  return (
    <main className="band practice" id="main-content" tabIndex={-1}>
      <header className="practice__head">
        <div>
          <p className="kicker">Kho đề</p>
          <h1>Luyện đúng kỹ năng, đúng dạng.</h1>
          <p>Chọn full test khi muốn canh giờ, hoặc một dạng câu hỏi khi muốn sửa lỗi lặp lại.</p>
        </div>
        <label className="search">Tìm đề
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Cambridge, map, task 2…" />
        </label>
      </header>

      <div className="practice__layout">
        <aside className="filters" aria-label="Bộ lọc đề">
          <fieldset>
            <legend>Kỹ năng</legend>
            {SKILLS.map((item) => (
              <button key={item.id} type="button" aria-pressed={skill === item.id || (item.id === "ALL" && skill === "ALL")} onClick={() => setSkill(item.id)}>{item.label}</button>
            ))}
          </fieldset>
          <fieldset>
            <legend>Nguồn đề</legend>
            {SOURCES.map((item) => (
              <button key={item} type="button" aria-pressed={source === item} onClick={() => setSource(item)}>{item}</button>
            ))}
          </fieldset>
          <fieldset>
            <legend>Dạng câu hỏi</legend>
            <button type="button" aria-pressed={type === "Tất cả"} onClick={() => setType("Tất cả")}>Tất cả dạng</button>
            {QUESTION_TYPES.map((item) => (
              <button key={item.id} type="button" aria-pressed={type === item.label} onClick={() => setType(item.label)}>{item.label}</button>
            ))}
          </fieldset>
        </aside>

        <section aria-live="polite">
          <p className="result-count">{tests.length} đề</p>
          {tests.length === 0 ? <p className="empty">Không có đề khớp bộ lọc. Bỏ bớt một điều kiện để xem lại kho.</p> : (
            <ul className="catalog">
              {tests.map((test) => {
                const start = `/exams/${test.id}/start`
                return (
                  <li key={test.id}>
                    <div>
                      <p>{test.source}</p>
                      <h2>{test.title}</h2>
                      <p>{test.questionType} · {test.questionCount} câu · {test.durationMinutes} phút · {test.attempts.toLocaleString("vi-VN")} lượt làm</p>
                    </div>
                    <div className="catalog__meta">
                      <strong>{test.averageBand.toFixed(1)}</strong>
                      <span>Band trung bình</span>
                      <Link className="cta" to={isAuthenticated ? start : "/auth/login"} state={{ from: start }}>Làm bài</Link>
                    </div>
                  </li>
                )
              })}
            </ul>
          )}
        </section>
      </div>
    </main>
  )
}
