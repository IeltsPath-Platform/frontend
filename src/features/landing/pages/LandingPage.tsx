import { useEffect } from "react"
import { Link } from "react-router-dom"
import reviewMascotImage from "@/assets/ielts-dino-review.png"
import { InteractiveHeroMascot } from "@/features/landing/components/InteractiveHeroMascot"
import { ARTICLES, CATALOG, SKILL_ENTRIES } from "@/lib/mock/catalog"

const practiceBenefits = [
  {
    value: "186+",
    label: "Đề Listening & Reading chuẩn Cambridge & BC",
    badge: "CAM 10-19",
    barColor: "linear-gradient(90deg, #0284c7, #38bdf8)",
    textColor: "#0284c7",
  },
  {
    value: "42",
    label: "Dạng bài chi tiết: TFNG, Heading, Map, Flowchart",
    badge: "PHÂN LOẠI",
    barColor: "linear-gradient(90deg, #d97706, #fbbf24)",
    textColor: "#d97706",
  },
  {
    value: "4",
    label: "Tiêu chí chấm điểm Writing & Speaking chuẩn Band",
    badge: "BAND DESCRIPTORS",
    barColor: "linear-gradient(90deg, #059669, #34d399)",
    textColor: "#059669",
  },
]

const skillWidgets: Record<
  string,
  {
    color: string
    bg: string
    badge: string
    actionText: string
    widgetType: "audio" | "scanner" | "meter" | "radar"
  }
> = {
  LISTENING: {
    color: "#0284c7",
    bg: "#e0f2fe",
    badge: "Audio Cam 10-19",
    actionText: "Luyện nghe ngay",
    widgetType: "audio",
  },
  READING: {
    color: "#d97706",
    bg: "#fef3c7",
    badge: "Định vị Keyword",
    actionText: "Luyện đọc ngay",
    widgetType: "scanner",
  },
  WRITING: {
    color: "#e11d48",
    bg: "#ffe4e6",
    badge: "Chấm AI trong 30s",
    actionText: "Chấm bài viết",
    widgetType: "meter",
  },
  SPEAKING: {
    color: "#059669",
    bg: "#d1fae5",
    badge: "Dự đoán Quý mới",
    actionText: "Luyện phản xạ",
    widgetType: "radar",
  },
}

const reviewBenefits = [
  ["Lời giải từng câu", "Hiểu tường tận vì sao đáp án đúng, không còn đoán mò."],
  ["Định vị manh mối", "Tự động highlight dòng văn bản và audio chứa chìa khóa."],
  ["Tra từ ngữ cảnh", "Click đúp để tra và lưu từ mới ngay trong bài đọc."],
  ["Luyện Dictation", "Nghe chép chính tả câu khó trước khi vào full test."],
]

const roadmapSteps = [
  ["Đo trình độ", "Làm 1 bài Reading và nửa bài Listening đúng áp lực giờ thật."],
  ["Sửa dạng hay sai", "Tập trung bẻ khóa dạng bài đang làm bạn mất điểm."],
  ["Viết & Nói phản xạ", "Luyện Task 2 theo 4 tiêu chí và cue card chuẩn 2 phút."],
  ["Thi thử bấm giờ", "Mỗi tuần 1 full test chuẩn áp lực, chữa bài trong 24 giờ."],
]

export function LandingPage() {
  const preview = CATALOG.slice(0, 6)

  // Smooth scroll-reveal effect on page scroll
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-revealed")
          }
        })
      },
      { threshold: 0.08, rootMargin: "0px 0px -30px 0px" }
    )

    const elements = document.querySelectorAll(".reveal-on-scroll")
    elements.forEach((el) => observer.observe(el))

    return () => observer.disconnect()
  }, [])

  return (
    <main className="landing-page" id="main-content" tabIndex={-1}>
      {/* Ambient colorful glowing background orbs */}
      <div className="ambient-blob ambient-blob--amber" aria-hidden="true"></div>
      <div className="ambient-blob ambient-blob--cyan" aria-hidden="true"></div>
      <div className="ambient-blob ambient-blob--rose" aria-hidden="true"></div>

      {/* ================= HERO SECTION (FULL BACKGROUND WITH DINO) ================= */}
      <section className="landing-page__hero landing-page__hero--full-bg" aria-labelledby="landing-title">
        {/* Full background image layer with interactive mouse-tracking dinosaur mascot */}
        <div className="hero-bg-layer">
          <InteractiveHeroMascot />
        </div>

        {/* Hero Content Container (Text + Scene Badges inside image) */}
        <div className="landing-page__hero-container">
          <div className="landing-page__hero-copy reveal-on-scroll is-revealed">
            <div className="hero-badge-eyebrow">
              <span className="live-sparkle-dot"></span>
              <span>Phòng thi IELTS chuẩn máy 2026</span>
              <span className="eyebrow-accent-tag">PRO</span>
            </div>

            <h1 id="landing-title">
              Luyện đề IELTS chuẩn máy,{" "}
              <span className="text-gradient-shimmer">chắc tay bứt Band 7.5+</span>
            </h1>

            <p className="landing-page__lead">
              Phòng thi máy mô phỏng 100% British Council & IDP. Bấm giờ chuẩn, định vị
              manh mối câu hỏi và nhận lời giải chi tiết theo 4 kỹ năng.
            </p>

            <div className="hero-actions">
              <Link className="cta cta--3d cta--hero cta--animated" to="/practice">
                <span>Bắt đầu luyện miễn phí</span>
                <span className="cta-arrow-slide" aria-hidden="true">→</span>
              </Link>
              <Link className="cta-ghost-3d" to="/roadmap">
                Xem lộ trình 12 tuần
              </Link>
            </div>

            <div className="hero-trust-row">
              <span className="hero-trust-item">
                <span className="trust-bullet trust-bullet--gold"></span> 186+ Bộ đề Cambridge 10-19
              </span>
              <span className="hero-trust-item">
                <span className="trust-bullet trust-bullet--emerald"></span> Chấm AI Writing & Speaking
              </span>
              <span className="hero-trust-item">
                <span className="trust-bullet trust-bullet--sky"></span> Miễn phí không giới hạn
              </span>
            </div>
          </div>

          {/* 3D Floating Scene Badges over the Dinosaur scene */}
          <div className="hero-scene-badges" aria-hidden="true">
            {/* Target Band 7.5+ */}
            <div className="hero-floating-badge hero-floating-badge--top">
              <div className="badge-animated-widget badge-animated-widget--amber">
                <span className="mini-status-dot"></span>
                <strong>Band 7.5+</strong>
              </div>
              <div>
                <span className="badge-subtitle">Mục tiêu bứt phá</span>
                <div className="mini-progress-bar">
                  <div className="mini-progress-fill mini-progress-fill--amber"></div>
                </div>
              </div>
            </div>

            {/* AI 30s Live Feedback */}
            <div className="hero-floating-badge hero-floating-badge--bottom-left">
              <div className="badge-animated-widget badge-animated-widget--cyan">
                <span className="radar-ping-ring"></span>
                <span className="radar-center-dot"></span>
              </div>
              <div>
                <div className="badge-pulse">
                  <strong>Chấm AI 30s</strong>
                  <span className="badge-tag-live">LIVE</span>
                </div>
                <span className="badge-subtitle">Sửa ngữ pháp & từ vựng</span>
              </div>
            </div>

            {/* Cambridge 186+ Tests */}
            <div className="hero-floating-badge hero-floating-badge--bottom-right">
              <div className="badge-animated-widget badge-animated-widget--purple">
                <span className="spinning-ring-glow"></span>
                <span className="inner-label-bold">186</span>
              </div>
              <div>
                <strong>Bộ Đề Cambridge</strong>
                <span className="badge-subtitle">Format chuẩn IDP / BC</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ================= 3D PROOF STATS ================= */}
      <section className="landing-page__proof reveal-on-scroll" aria-label="Quy mô kho luyện IELTS">
        {practiceBenefits.map((item, index) => (
          <div key={item.label} className={`proof-card-3d reveal-delay-${index + 1}`}>
            <div className="proof-card-top-bar" style={{ background: item.barColor }}></div>
            <div className="proof-card-content">
              <div className="proof-card-header">
                <span className="proof-card-badge" style={{ color: item.textColor }}>
                  {item.badge}
                </span>
                <span className="proof-card-glow-dot" style={{ backgroundColor: item.textColor }}></span>
              </div>
              <strong style={{ color: item.textColor }}>{item.value}</strong>
              <span>{item.label}</span>
            </div>
          </div>
        ))}
      </section>

      {/* ================= 4 SKILLS SECTION ================= */}
      <section className="landing-page__section landing-page__skills" aria-labelledby="skill-title">
        <div className="landing-page__heading reveal-on-scroll">
          <div className="hero-badge-eyebrow">
            <span className="live-sparkle-dot"></span>
            <span>4 Kỹ năng trọng tâm</span>
          </div>
          <h2 id="skill-title">Chọn kỹ năng mục tiêu, vào đề ngay.</h2>
          <p>
            Mỗi kỹ năng được trang bị phòng thi mô phỏng, hệ thống chia nhỏ dạng bài,
            transcript thông minh và định vị manh mối chính xác.
          </p>
        </div>

        <div className="landing-page__skill-list reveal-on-scroll">
          {SKILL_ENTRIES.map((item, index) => {
            const config = skillWidgets[item.skill] ?? {
              color: "#d97706",
              bg: "#fef3c7",
              badge: "Luyện đề",
              actionText: "Luyện ngay",
              widgetType: "meter",
            }

            return (
              <Link
                key={item.skill}
                to={`/practice?skill=${item.skill}`}
                className={`skill-card-3d skill-card-3d--${item.skill.toLowerCase()} reveal-delay-${index + 1}`}
              >
                {/* Colorful top accent gradient line */}
                <div
                  className="skill-card-accent-bar"
                  style={{ backgroundColor: config.color }}
                ></div>

                <div className="skill-card-head">
                  {/* Creative animated motion widget instead of icons */}
                  {config.widgetType === "audio" && (
                    <div className="widget-soundwave" aria-hidden="true">
                      <span className="wave-bar wave-bar-1"></span>
                      <span className="wave-bar wave-bar-2"></span>
                      <span className="wave-bar wave-bar-3"></span>
                      <span className="wave-bar wave-bar-4"></span>
                      <span className="wave-bar wave-bar-5"></span>
                    </div>
                  )}

                  {config.widgetType === "scanner" && (
                    <div className="widget-scanner" aria-hidden="true">
                      <span className="scan-line"></span>
                      <span className="scan-text-track"></span>
                    </div>
                  )}

                  {config.widgetType === "meter" && (
                    <div className="widget-meter" aria-hidden="true">
                      <div className="meter-gauge">
                        <span className="meter-needle"></span>
                      </div>
                    </div>
                  )}

                  {config.widgetType === "radar" && (
                    <div className="widget-radar" aria-hidden="true">
                      <span className="radar-circle radar-circle-1"></span>
                      <span className="radar-circle radar-circle-2"></span>
                      <span className="radar-circle radar-circle-3"></span>
                    </div>
                  )}

                  <span
                    className="skill-card-badge"
                    style={{ color: config.color, backgroundColor: config.bg }}
                  >
                    {config.badge}
                  </span>
                </div>

                <strong>{item.label}</strong>
                <p>{item.detail}</p>

                <div className="skill-card-footer" style={{ color: config.color }}>
                  <span>{config.actionText}</span>
                  <span className="card-arrow-hover" aria-hidden="true">→</span>
                </div>
              </Link>
            )
          })}
        </div>
      </section>

      {/* ================= TEST BANK SECTION ================= */}
      <section className="landing-page__bank" aria-labelledby="bank-title">
        <div className="landing-page__section-inner">
          <div className="landing-page__heading reveal-on-scroll">
            <div className="hero-badge-eyebrow">
              <span className="live-sparkle-dot"></span>
              <span>Kho đề mới cập nhật</span>
            </div>
            <h2 id="bank-title">Đề thi sát format phòng thi máy</h2>
            <p>
              Chọn lọc từ các bộ đề Cambridge IELTS 10-19 và Actual Test mới nhất
              với đầy đủ bấm giờ và chấm điểm.
            </p>
          </div>

          <div className="landing-page__test-grid reveal-on-scroll" aria-label="Sáu đề mới">
            {preview.map((test, index) => {
              const skillType =
                test.skill === "FULL_TEST"
                  ? "Full test"
                  : test.skill[0] + test.skill.slice(1).toLowerCase()
              const pillClass =
                test.skill === "FULL_TEST"
                  ? "test-pill--full"
                  : test.skill === "LISTENING"
                  ? "test-pill--listening"
                  : test.skill === "READING"
                  ? "test-pill--reading"
                  : test.skill === "WRITING"
                  ? "test-pill--writing"
                  : "test-pill--speaking"

              return (
                <Link
                  key={test.id}
                  to={`/practice?skill=${test.skill}`}
                  className={`test-card-3d reveal-delay-${(index % 3) + 1}`}
                >
                  <div className="test-card-top">
                    <span className={`test-pill ${pillClass}`}>{skillType}</span>
                    <span className="test-card-band">
                      <span className="band-rating-pip">★</span>
                      Band {test.averageBand.toFixed(1)}
                    </span>
                  </div>

                  <strong>{test.title}</strong>
                  <span className="test-card-source">
                    {test.source} · {test.questionType}
                  </span>

                  <div className="test-card-footer">
                    <span className="test-card-meta">
                      {test.questionCount} câu · {test.durationMinutes} phút
                    </span>
                    <span className="test-card-btn">Làm bài →</span>
                  </div>
                </Link>
              )
            })}
          </div>
        </div>
      </section>

      {/* ================= REVIEW & AI EXPLANATION SHOWCASE ================= */}
      <section className="landing-page__review" aria-labelledby="review-title">
        <div className="review-visual-frame reveal-on-scroll">
          <img
            src={reviewMascotImage}
            alt="Linh vật khủng long vàng đeo kính đang rà lại đáp án trên bài luyện IELTS cực nét"
            decoding="async"
            loading="lazy"
          />
        </div>

        <div className="landing-page__review-copy reveal-on-scroll">
          <div className="hero-badge-eyebrow">
            <span className="live-sparkle-dot"></span>
            <span>Phân tích sau khi nộp</span>
          </div>
          <h2 id="review-title">Biết mình sai ở đâu, không chỉ xem điểm.</h2>

          <div className="review-benefits-grid">
            {reviewBenefits.map(([title, detail], idx) => (
              <div key={title} className={`review-benefit-item reveal-delay-${idx + 1}`}>
                <div className="review-benefit-pip"></div>
                <strong>{title}</strong>
                <p>{detail}</p>
              </div>
            ))}
          </div>

          {/* Interactive 3D Question Card with animated highlighter */}
          <article className="review-question-card-3d">
            <div className="review-question-header">
              <span className="review-question-tag">Câu 4: NOT GIVEN</span>
              <span className="review-status-chip">Reading Passage 1</span>
            </div>
            <h3>
              The best hour to review vocabulary is{" "}
              <mark className="review-question-snippet-animated">10 p.m.</mark>
            </h3>
            <p>
              Passage không nêu một khung giờ cụ thể nào. Vì vậy, theo nguyên tắc chấm
              IELTS, không thể kết luận câu này True hay False.
            </p>
            <Link to="/blog/tfng-khong-phai-doan" className="review-question-link">
              <span>Đọc bí quyết xử lý dạng True / False / Not Given</span>
              <span>→</span>
            </Link>
          </article>
        </div>
      </section>

      {/* ================= 3D ROADMAP SECTION ================= */}
      <section className="landing-page__roadmap reveal-on-scroll" aria-labelledby="roadmap-title">
        <div>
          <div className="hero-badge-eyebrow" style={{ background: "rgba(255, 255, 255, 0.1)", borderColor: "rgba(255, 255, 255, 0.15)", color: "#fef3c7" }}>
            <span className="live-sparkle-dot" style={{ backgroundColor: "#f59e0b" }}></span>
            <span>Lộ trình Intensive 7.0</span>
          </div>
          <h2 id="roadmap-title">12 tuần, một nhịp học rõ ràng.</h2>
          <p>
            Dành cho người đang ở band 5.5-6.5 và muốn một lịch làm bài cụ thể, có
            mốc đo lường hàng tuần thay vì danh sách mẹo chung chung.
          </p>
          <div style={{ marginTop: "1.75rem" }}>
            <Link className="cta cta--3d" to="/roadmap">
              Khám phá Lộ trình 12 tuần →
            </Link>
          </div>
        </div>

        <ol className="roadmap-steps-3d">
          {roadmapSteps.map(([title, detail], index) => (
            <li key={title} className={`roadmap-step-item reveal-delay-${index + 1}`}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                <span className="roadmap-step-coin">0{index + 1}</span>
                <strong>{title}</strong>
              </div>
              <span>{detail}</span>
            </li>
          ))}
        </ol>
      </section>

      {/* ================= ARTICLES / BLOG SECTION ================= */}
      <section className="landing-page__section landing-page__reading" aria-labelledby="read-title">
        <div className="landing-page__heading reveal-on-scroll">
          <div className="hero-badge-eyebrow">
            <span className="live-sparkle-dot"></span>
            <span>Chiến thuật phòng thi</span>
          </div>
          <h2 id="read-title">Đọc trước khi vào đề</h2>
          <p>
            Những hướng dẫn ngắn gọn từ giám khảo và cao thủ 8.5+ để bạn xử lý đúng
            từng bẫy đề thi.
          </p>
        </div>

        <div className="landing-page__articles-grid reveal-on-scroll">
          {ARTICLES.slice(0, 3).map((article, idx) => (
            <Link
              key={article.slug}
              to={`/blog/${article.slug}`}
              className={`article-card-3d reveal-delay-${idx + 1}`}
            >
              <div className="article-card-top">
                <span className="article-kicker">{article.kicker}</span>
                <span className="article-time">
                  {article.minutes} phút đọc
                </span>
              </div>
              <strong>{article.title}</strong>
              <p>{article.lead}</p>
              <span className="article-card-link">
                Đọc bài viết →
              </span>
            </Link>
          ))}
        </div>
      </section>
    </main>
  )
}
