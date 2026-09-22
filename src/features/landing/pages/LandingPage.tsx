import { Link } from "react-router-dom"
import { ARTICLES, CATALOG, SKILL_ENTRIES } from "@/lib/mock/catalog"

const skillClass: Record<string, string> = {
  LISTENING: "skill-listening",
  READING: "skill-reading",
  WRITING: "skill-writing",
  SPEAKING: "skill-speaking",
}

export function LandingPage() {
  const preview = CATALOG.slice(0, 6)

  return (
    <main id="main-content" tabIndex={-1}>
      <section className="hero">
        <div className="hero__copy">
          <p className="kicker">Phòng thi trên máy</p>
          <h1>Luyện đề IELTS đủ 4 kỹ năng.</h1>
          <p>Làm bài với đồng hồ, bảng câu hỏi và bài đọc cạnh nhau. Nộp xong là có điểm, lời giải và vị trí thông tin trong bài.</p>
          <div className="hero__actions">
            <Link className="cta" to="/practice">Luyện đề miễn phí</Link>
            <Link className="cta cta--ghost" to="/roadmap">Xem lộ trình 7.0</Link>
          </div>
          <ul className="hero__facts">
            <li><strong>186</strong><span>đề Listening và Reading</span></li>
            <li><strong>42</strong><span>dạng câu hỏi tách riêng</span></li>
            <li><strong>4</strong><span>tiêu chí chấm Writing</span></li>
          </ul>
        </div>
        <aside className="console" aria-label="Minh họa màn hình làm bài Reading">
          <header><span>Reading · Cambridge 18 Test 2</span><strong>47:12</strong></header>
          <div className="console__split">
            <p>Researchers caution that a garden cannot solve every environmental problem, yet its value often lies in the habits it encourages.</p>
            <ol>
              <li><b>1</b> Urban gardens help neighbours meet. <em>TRUE</em></li>
              <li><b>2</b> Gardens fix every city problem. <em>FALSE</em></li>
              <li><b>3</b> The best review hour is 10 p.m. <em>NOT GIVEN</em></li>
              <li className="is-current"><b>4</b> Fixed sea walls are no longer built.</li>
            </ol>
          </div>
          <footer>
            {Array.from({ length: 14 }, (_, index) => <span key={index} className={index < 3 ? "is-done" : index === 3 ? "is-now" : ""}>{index + 1}</span>)}
          </footer>
        </aside>
      </section>

      <section className="band" aria-labelledby="skill-title">
        <div className="section-head">
          <h2 id="skill-title">Chọn một kỹ năng và vào đề.</h2>
          <Link to="/practice">Mở cả kho đề</Link>
        </div>
        <div className="skill-row">
          {SKILL_ENTRIES.map((item) => (
            <Link className={`skill-tile ${skillClass[item.skill]}`} key={item.skill} to={`/practice?skill=${item.skill}`}>
              <span>{item.count}</span>
              <strong>{item.label}</strong>
              <p>{item.detail}</p>
            </Link>
          ))}
        </div>
      </section>

      <section className="band band--paper" aria-labelledby="bank-title">
        <div className="section-head">
          <h2 id="bank-title">Đề vừa được mở</h2>
          <Link to="/practice">Lọc theo sách và dạng bài</Link>
        </div>
        <div className="test-table" role="table" aria-label="Sáu đề mới">
          {preview.map((test) => (
            <Link role="row" className="test-row" key={test.id} to={`/practice?skill=${test.skill}`}>
              <span className={`pill ${skillClass[test.skill] ?? "skill-full"}`}>{test.skill === "FULL_TEST" ? "Full test" : test.skill[0] + test.skill.slice(1).toLowerCase()}</span>
              <span><strong>{test.title}</strong><small>{test.source} · {test.questionType}</small></span>
              <span>{test.questionCount} câu · {test.durationMinutes} phút</span>
              <span>Band TB {test.averageBand.toFixed(1)}</span>
            </Link>
          ))}
        </div>
      </section>

      <section className="band split" aria-labelledby="after-title">
        <div>
          <p className="kicker">Sau khi nộp</p>
          <h2 id="after-title">Biết mình sai ở đâu, không chỉ biết bao nhiêu câu đúng.</h2>
          <ul className="check-list">
            <li><strong>Lời giải từng câu</strong><span>Giải thích vì sao TRUE, FALSE hoặc NOT GIVEN.</span></li>
            <li><strong>Định vị trong bài</strong><span>Nhảy tới câu chứa manh mối, hoặc thấy rõ khi bài không nói.</span></li>
            <li><strong>Tra từ ngay tại chỗ</strong><span>Nghĩa theo đúng đoạn đang đọc, rồi lưu vào sổ.</span></li>
            <li><strong>Dictation</strong><span>Nghe lại một câu và chép chính tả trước khi làm full test.</span></li>
          </ul>
        </div>
        <article className="explain-card">
          <p>Câu 4 · NOT GIVEN</p>
          <h3>The best hour to review vocabulary is 10 p.m.</h3>
          <p>Bài chỉ nói một lần ôn ngắn trước khi ngủ thường xuyên có ích hơn là học khuya. Không có giờ cụ thể, nên không thể kết luận câu này đúng hay sai.</p>
          <Link to="/blog/tfng-khong-phai-doan">Đọc cách xử lý dạng này</Link>
        </article>
      </section>

      <section className="band course" aria-labelledby="course-title">
        <div>
          <p className="kicker">12 tuần</p>
          <h2 id="course-title">Lộ trình Intensive 7.0</h2>
          <p>Dành cho bạn đang quanh band 5.5–6.5 và muốn một lịch làm bài cụ thể, không phải danh sách mẹo.</p>
          <Link className="cta" to="/roadmap">Mở lịch 12 tuần</Link>
        </div>
        <ol>
          <li><strong>Đo trình độ</strong><span>Một bài Reading và nửa bài Listening, đúng giờ.</span></li>
          <li><strong>Sửa dạng hay sai</strong><span>Chỉ luyện dạng đang mất điểm, không làm lan man.</span></li>
          <li><strong>Viết và nói</strong><span>Task 2 có chấm 4 tiêu chí, cue card đủ 2 phút.</span></li>
          <li><strong>Thi thử</strong><span>Một full test mỗi tuần, xem lại trong 24 giờ.</span></li>
        </ol>
      </section>

      <section className="band" aria-labelledby="read-title">
        <div className="section-head"><h2 id="read-title">Đọc trước khi vào đề</h2><Link to="/blog">Tất cả bài viết</Link></div>
        <div className="article-row">
          {ARTICLES.slice(0, 3).map((article) => (
            <Link key={article.slug} to={`/blog/${article.slug}`}>
              <span>{article.kicker} · {article.minutes} phút</span>
              <strong>{article.title}</strong>
              <p>{article.lead}</p>
            </Link>
          ))}
        </div>
      </section>
    </main>
  )
}
