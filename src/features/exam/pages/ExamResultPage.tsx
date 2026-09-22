import { useMemo } from "react"
import { Link, useParams } from "react-router-dom"
import { CATALOG, REVIEW_KEYS } from "@/lib/mock/catalog"
import { TEST_BANK } from "@/lib/mock/exams"

interface Attempt {
  examId: string
  answers: Record<string, string>
  words?: number
}

function readAttempt(examId: string): Attempt {
  const raw = window.sessionStorage.getItem("ieltspath-attempt")
  if (!raw) return { examId, answers: {} }
  const parsed = JSON.parse(raw) as Attempt
  return parsed.examId === examId ? parsed : { examId, answers: {} }
}

export function ExamResultPage() {
  const { examId = "" } = useParams()
  const exam = CATALOG.find((item) => item.id === examId) ?? TEST_BANK.find((item) => item.id === examId)
  const attempt = useMemo(() => readAttempt(examId), [examId])
  const checked = REVIEW_KEYS.map((item) => ({
    ...item,
    yours: attempt.answers[String(item.number)] ?? "Bỏ trống",
    correct: (attempt.answers[String(item.number)] ?? "").toUpperCase() === item.answer,
  }))
  const showReview = exam?.skill === "READING" || exam?.skill === "FULL_TEST" || !exam
  const right = checked.filter((item) => item.correct).length
  const band = exam?.skill === "WRITING" ? 6.5 : showReview ? Math.min(8, 5 + right * 0.5) : Math.min(8, 5.5 + Object.keys(attempt.answers).length * 0.05)

  return (
    <main className="band result" id="main-content" tabIndex={-1}>
      <p className="kicker">Kết quả</p>
      <h1>{exam?.title ?? "Bài luyện"}</h1>
      <section className="result__score" aria-label="Điểm">
        <div><span>Band ước lượng</span><strong>{band.toFixed(1)}</strong></div>
        {showReview ? <div><span>Câu đối chiếu</span><strong>{right}/{checked.length}</strong></div> : null}
        <div><span>Đã trả lời</span><strong>{Object.keys(attempt.answers).length}</strong></div>
        {attempt.words ? <div><span>Số từ Writing</span><strong>{attempt.words}</strong></div> : null}
      </section>
      <p>Điểm này tính trên phần đối chiếu có lời giải trong bản luyện, không phải điểm thi chính thức.</p>
      {exam?.skill === "WRITING" ? <p><Link to="/assistant">Mở phần chấm 4 tiêu chí</Link> để xem Task Response, Coherence, Lexical Resource và Grammar.</p> : null}
      {showReview ? <ol className="review">
        {checked.map((item) => (
          <li key={item.number} className={item.correct ? "is-right" : "is-wrong"}>
            <header><span>Câu {item.number}</span><strong>{item.correct ? "Đúng" : "Cần xem lại"}</strong></header>
            <p>{item.prompt}</p>
            <p>Bạn chọn: {item.yours}. Đáp án: {item.answer}.</p>
            <p><b>Vị trí:</b> {item.locate}</p>
            <p>{item.why}</p>
          </li>
        ))}
      </ol> : <p>Bài nghe, viết và nói được lưu số câu đã làm. Phần đối chiếu TRUE / FALSE / NOT GIVEN hiện khi bạn nộp bài Reading.</p>}
      <div className="hero__actions">
        <Link className="cta" to={`/exams/${examId}/start`}>Làm lại</Link>
        <Link className="cta cta--ghost" to="/practice">Về kho đề</Link>
        <Link className="cta cta--ghost" to="/vocabulary">Ôn từ vừa gặp</Link>
      </div>
    </main>
  )
}
