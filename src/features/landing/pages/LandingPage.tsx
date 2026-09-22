import { ArrowRight, BookOpenCheck, BrainCircuit, ChartNoAxesCombined, Check, GraduationCap, Headphones, PenLine, Quote, Sparkles } from "lucide-react"
import { Link } from "react-router-dom"
import heroImage from "@/assets/ielts-study-hero.png"
import { PublicHeader } from "@/components/common/PublicHeader"
import { Button } from "@/components/ui/button"

const learningPaths = [
  {
    title: "Luyện đề 4 kỹ năng",
    description: "Kho Reading, Listening, Writing và Speaking để bạn luyện đúng phần đang yếu.",
    icon: Headphones,
    to: "/auth/login",
    accent: "free",
  },
  {
    title: "AI Review có định hướng",
    description: "Hiểu lỗi trong Writing bằng feedback theo từng câu, thay vì chỉ nhận một con số.",
    icon: BrainCircuit,
    to: "/assistant",
    accent: "review",
  },
  {
    title: "Lộ trình Band 7.5",
    description: "Chọn từng mục tiêu tuần để biến một band mong muốn thành kế hoạch có thể làm được.",
    icon: ChartNoAxesCombined,
    to: "/auth/register",
    accent: "plan",
  },
]

export function LandingPage() {
  return (
    <div className="landing">
      <a className="skip-link" href="#main-content">Bỏ qua điều hướng</a>
      <PublicHeader />
      <main id="main-content" tabIndex={-1}>
        <section className="landing-hero" aria-labelledby="landing-title">
          <div className="landing-hero__copy">
            <p className="landing-kicker"><Sparkles aria-hidden="true" /> Không học một mình</p>
            <h1 id="landing-title">Học đều mỗi ngày.<br /><span>Band tiến mỗi tuần.</span></h1>
            <p>IELTSPath chia nhỏ hành trình 4 kỹ năng thành những bài luyện rõ ràng, để bạn luôn biết mình đang tiến về đâu.</p>
            <div className="landing-hero__actions">
              <Button asChild size="lg"><Link to="/auth/register">Bắt đầu lộ trình <ArrowRight aria-hidden="true" /></Link></Button>
              <Button asChild variant="outline" size="lg"><Link to="/exams">Xem kho đề</Link></Button>
            </div>
            <ul className="landing-proof" aria-label="Các lợi ích chính">
              <li><Check aria-hidden="true" /> Mô phỏng thi máy</li>
              <li><Check aria-hidden="true" /> Feedback dễ hiểu</li>
              <li><Check aria-hidden="true" /> Theo dõi tiến bộ</li>
            </ul>
          </div>
          <figure className="landing-hero__art">
            <img src={heroImage} alt="Minh họa một người học IELTS chăm chú học cùng tai nghe, sách và đồng hồ học tập." />
            <figcaption><BookOpenCheck aria-hidden="true" /> 15 phút tập trung hôm nay cũng tạo khác biệt.</figcaption>
          </figure>
        </section>

        <section className="landing-entry" aria-labelledby="entry-title">
          <div className="landing-section-heading"><p className="landing-kicker">Chọn nơi bắt đầu</p><h2 id="entry-title">Một platform, ba cách để tiến về mục tiêu.</h2></div>
          <div className="landing-entry__grid">
            {learningPaths.map((path) => {
              const Icon = path.icon
              return (
                <article className={`learning-card learning-card--${path.accent}`} key={path.title}>
                  <div className="learning-card__icon"><Icon aria-hidden="true" /></div>
                  <h3>{path.title}</h3>
                  <p>{path.description}</p>
                  <Link to={path.to}>Khám phá <ArrowRight aria-hidden="true" /></Link>
                </article>
              )
            })}
          </div>
        </section>

        <section className="landing-path" id="learning-path" aria-labelledby="path-title">
          <div className="landing-path__steps">
            <p className="landing-kicker">Học có nhịp, không bị ngợp</p>
            <h2 id="path-title">Chỉ cần bạn dành thời gian.<br /><span>Phần còn lại, IELTSPath giúp sắp xếp.</span></h2>
            <ol>
              <li><span>01</span><div><strong>Nhìn rõ điểm xuất phát</strong><p>Chọn kỹ năng và band mục tiêu phù hợp với bạn.</p></div></li>
              <li><span>02</span><div><strong>Luyện theo phiên ngắn</strong><p>Tập trung một việc quan trọng mỗi lần học.</p></div></li>
              <li><span>03</span><div><strong>Đọc feedback, sửa ngay</strong><p>Biết vì sao sai để không lặp lại ở bài tiếp theo.</p></div></li>
            </ol>
          </div>
          <aside className="landing-path__panel" aria-label="Mẫu kế hoạch học tập">
            <div className="path-panel__header"><span><GraduationCap aria-hidden="true" /> Kế hoạch tuần này</span><strong>7.5</strong></div>
            <div className="path-panel__progress"><p>3 / 5 phiên đã hoàn thành</p><div><span /></div></div>
            <ul><li><Check aria-hidden="true" /> Reading: Matching headings</li><li><Check aria-hidden="true" /> Listening: Note completion</li><li><PenLine aria-hidden="true" /> Writing: Topic sentences</li></ul>
            <Button asChild variant="secondary"><Link to="/auth/register">Tạo lộ trình của tôi <ArrowRight aria-hidden="true" /></Link></Button>
          </aside>
        </section>

        <section className="landing-story" aria-labelledby="story-title">
          <Quote aria-hidden="true" />
          <div><p className="landing-kicker">Trải nghiệm học tập</p><h2 id="story-title">“Khi biết mình cần sửa gì, việc luyện IELTS trở nên nhẹ nhàng hơn hẳn.”</h2><p>IELTSPath được thiết kế để biến những buổi tự học rời rạc thành một hành trình có phản hồi, có định hướng và có động lực tiếp tục.</p></div>
        </section>
      </main>
      <footer className="landing-footer"><div><Link className="brand brand--public" to="/home"><GraduationCap aria-hidden="true" /> IELTS<span>Path</span></Link><p>Nền tảng luyện thi IELTS theo nhịp học của bạn.</p></div><Button asChild variant="outline"><Link to="/auth/login">Vào không gian học <ArrowRight aria-hidden="true" /></Link></Button></footer>
    </div>
  )
}
