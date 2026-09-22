import { useMemo, useState } from "react"
import { Link } from "react-router-dom"
import { ROADMAP } from "@/lib/mock/catalog"

const LEVELS = ["5.5", "6.0", "6.5", "7.0"]

export function RoadmapPage() {
  const [current, setCurrent] = useState("6.0")
  const [target, setTarget] = useState("7.0")
  const note = useMemo(() => {
    const gap = Number(target) - Number(current)
    if (gap <= 0) return "Band mục tiêu đang không cao hơn band hiện tại. Hãy chọn một mốc cao hơn để lộ trình có việc cần làm."
    if (gap >= 1.5) return "Chênh 1.5 band trở lên. Giữ lịch 12 tuần và thêm một bài Reading ngắn vào các ngày không thi thử."
    return "Chênh khoảng nửa band đến một band. Lịch 12 tuần bên dưới đủ dày nếu bạn làm đủ bài được giao."
  }, [current, target])

  return (
    <main className="band roadmap" id="main-content" tabIndex={-1}>
      <p className="kicker">Intensive 7.0</p>
      <h1>Lịch 12 tuần, tính từ band bạn đang có.</h1>
      <form className="level-form">
        <label>Band hiện tại
          <select value={current} onChange={(event) => setCurrent(event.target.value)}>{LEVELS.map((level) => <option key={level}>{level}</option>)}</select>
        </label>
        <label>Band mục tiêu
          <select value={target} onChange={(event) => setTarget(event.target.value)}>{LEVELS.map((level) => <option key={level}>{level}</option>)}</select>
        </label>
      </form>
      <p className="level-note">{note}</p>
      <ol className="weeks">
        {ROADMAP.map((block) => (
          <li key={block.week}>
            <span>{block.week}</span>
            <h2>{block.title}</h2>
            <ul>{block.tasks.map((task) => <li key={task}>{task}</li>)}</ul>
          </li>
        ))}
      </ol>
      <Link className="cta" to="/practice">Lấy đề cho tuần này</Link>
    </main>
  )
}
