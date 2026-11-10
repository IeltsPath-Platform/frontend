import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import {
  ArrowLeft,
  ArrowRight,
  Award,
  BookOpenCheck,
  CheckCircle2,
  Clock,
  Compass,
  FileCheck2,
  GraduationCap,
  ShieldCheck,
  Sparkles,
  Star,
  Trophy,
  Users,
} from 'lucide-react'
import { SiteNavbar } from '@/components/SiteNavbar'
import {
  fetchPublicExaminerDetail,
  SEEDED_EXAMINERS,
  type EnrichedExaminer,
} from '../examinerPublicApi'
import '../examiner-detail.css'

const GRADING_STEPS = [
  {
    number: '01',
    title: 'Chẩn đoán 4 tiêu chí chuẩn IDP & British Council',
    description: 'Đánh giá độc lập Task Achievement/Response, Coherence & Cohesion, Lexical Resource và Grammatical Range & Accuracy với điểm band cụ thể từng phần.',
  },
  {
    number: '02',
    title: 'Gắn thẻ lỗi trực tiếp trên từng câu văn (Inline Annotations)',
    description: 'Khoanh vùng chính xác từng cụm từ dùng sai văn phong học thuật, lỗi ngữ pháp hoặc đoạn lập luận thiếu thuyết phục ngay trên bài viết của bạn.',
  },
  {
    number: '03',
    title: 'Gợi ý nâng cấp diễn đạt lên Band 8.0+ (Band-Up Rewrites)',
    description: 'Cung cấp phương án viết lại tự nhiên, bổ sung collocations học thuật và cấu trúc câu phức giúp bài viết bứt phá điểm số.',
  },
  {
    number: '04',
    title: 'Tự động đồng bộ vào Cây tri thức & Giỏ ôn tập',
    description: 'Các mã lỗi giám khảo chỉ ra được chuyển thẳng vào lộ trình học thích ứng để bạn luyện đúng điểm yếu cho đến khi thành thạo.',
  },
] as const

const SAMPLE_CRITERIA = [
  { name: 'Task Response (TR)', score: '8.0', percent: 89 },
  { name: 'Coherence & Cohesion (CC)', score: '8.5', percent: 94 },
  { name: 'Lexical Resource (LR)', score: '8.5', percent: 94 },
  { name: 'Grammatical Range & Accuracy (GRA)', score: '8.0', percent: 89 },
] as const

function findInitialExaminer(param: string | undefined): EnrichedExaminer {
  if (!param) return SEEDED_EXAMINERS[0]
  const clean = param.trim().toLowerCase()
  return (
    SEEDED_EXAMINERS.find(
      (item) => item.id.toLowerCase() === clean || item.slug.toLowerCase() === clean,
    ) ?? SEEDED_EXAMINERS[0]
  )
}

export function ExaminerDetailPage() {
  const { mentorSlug } = useParams<{ mentorSlug: string }>()
  const currentKey = (mentorSlug ?? 'experts').trim().toLowerCase()
  const [loadedResult, setLoadedResult] = useState<{
    key: string
    examiner: EnrichedExaminer
    allExaminers: readonly EnrichedExaminer[]
  } | null>(null)

  useEffect(() => {
    const controller = new AbortController()
    fetchPublicExaminerDetail(currentKey, controller.signal)
      .then((result) => {
        if (!controller.signal.aborted) {
          setLoadedResult({
            key: currentKey,
            examiner: result.examiner,
            allExaminers: result.allExaminers,
          })
        }
      })
      .catch(() => {
        // Keep seeded fallback when backend is unreachable
      })
    return () => controller.abort()
  }, [currentKey])

  const allExaminers = loadedResult?.allExaminers ?? SEEDED_EXAMINERS
  const examiner =
    loadedResult?.key === currentKey
      ? loadedResult.examiner
      : allExaminers.find(
          (item) =>
            item.id.toLowerCase() === currentKey || item.slug.toLowerCase() === currentKey,
        ) ?? findInitialExaminer(mentorSlug)

  const bandDisplay = examiner.ieltsBand != null ? examiner.ieltsBand.toFixed(1) : '8.5'
  const topCert = examiner.certificates[0]

  return (
    <div className="exd-page">
      <a className="skip-link" href="#exd-main">Chuyển đến nội dung chính</a>
      <SiteNavbar />

      <main id="exd-main" tabIndex={-1}>
        {/* Hero Showcase Landing Section */}
        <section className="exd-hero" aria-labelledby="exd-hero-title">
          <span className="exd-hero-orb exd-hero-orb--one" aria-hidden="true" />
          <span className="exd-hero-orb exd-hero-orb--two" aria-hidden="true" />

          <div className="exd-shell">
            <div className="exd-top-bar">
              <nav className="exd-breadcrumb" aria-label="Đường dẫn trang">
                <Link to="/home#home-mentors">
                  <ArrowLeft size={15} aria-hidden="true" /> Trang chủ
                </Link>
                <span aria-hidden="true">/</span>
                <a href="#exd-directory">Đội ngũ Chuyên gia</a>
                <span aria-hidden="true">/</span>
                <span className="exd-breadcrumb-current">{examiner.displayName}</span>
              </nav>

              <div className="exd-quick-switcher" role="navigation" aria-label="Chuyển nhanh giảng viên">
                {allExaminers.map((member) => {
                  const active = member.id === examiner.id
                  return (
                    <Link
                      key={member.id}
                      to={`/mentors/${member.id}`}
                      className={`exd-switcher-pill${active ? ' is-active' : ''}`}
                      aria-current={active ? 'page' : undefined}
                    >
                      <img
                        src={member.resolvedAvatarUrl}
                        alt=""
                        width="26"
                        height="26"
                        decoding="async"
                        onError={(event) => {
                          const img = event.currentTarget
                          if (img.src !== member.fallbackAvatarUrl) {
                            img.src = member.fallbackAvatarUrl
                          }
                        }}
                      />
                      <span>{member.displayName}</span>
                    </Link>
                  )
                })}
              </div>
            </div>

            <div className="exd-hero-grid">
              <div className="exd-hero-copy">
                <div className="exd-status-row">
                  <span className="exd-pill exd-pill--live">
                    <span className="exd-live-dot" aria-hidden="true" />
                    {examiner.acceptingSubmissions ? 'Đang nhận bài chấm mới' : 'Chuyên gia Cố vấn Học thuật'}
                  </span>
                  <span className="exd-pill exd-pill--verified">
                    <ShieldCheck size={14} aria-hidden="true" /> Giám khảo IELTS Xác thực
                  </span>
                </div>

                <h1 id="exd-hero-title" className="exd-hero-title">
                  {examiner.displayName}
                </h1>
                <p className="exd-hero-headline">
                  {examiner.experienceLabel}
                </p>

                <blockquote className="exd-hero-bio">
                  {examiner.bio}
                </blockquote>

                <ul className="exd-specialties" aria-label="Chuyên môn giảng dạy">
                  {examiner.specialties.map((spec) => (
                    <li key={spec}>
                      <Sparkles size={13} aria-hidden="true" />
                      <span>{spec}</span>
                    </li>
                  ))}
                </ul>

                <div className="exd-stats-strip" role="list" aria-label="Chỉ số chuyên gia">
                  <div className="exd-stat-box" role="listitem">
                    <strong>IELTS {bandDisplay}</strong>
                    <span>Band điểm chứng nhận</span>
                  </div>
                  <div className="exd-stat-box" role="listitem">
                    <strong>{examiner.certificates.length} chứng chỉ</strong>
                    <span>Bằng cấp & Chứng nhận</span>
                  </div>
                  <div className="exd-stat-box" role="listitem">
                    <strong>{examiner.stats.essaysGraded}</strong>
                    <span>Bài luận đã chấm chữa</span>
                  </div>
                  <div className="exd-stat-box" role="listitem">
                    <strong>{examiner.stats.studentSatisfaction}</strong>
                    <span>Học viên đánh giá 5 sao</span>
                  </div>
                </div>

                <div className="exd-hero-actions">
                  <Link to="/practice-tests?skill=writing" className="exd-btn-primary">
                    Gửi bài Writing cho giảng viên <ArrowRight size={16} aria-hidden="true" />
                  </Link>
                  <Link to="/learn/placement" className="exd-btn-secondary">
                    <Compass size={16} aria-hidden="true" /> Test đầu vào 4 kỹ năng FREE
                  </Link>
                </div>
              </div>

              <div className="exd-hero-showcase">
                <div className="exd-portrait-stage">
                  <span className="exd-portrait-halo" aria-hidden="true" />
                  <span className="exd-portrait-ring" aria-hidden="true" />

                  <div className="exd-floating-badge exd-floating-badge--band">
                    <span className="exd-floating-badge-icon" aria-hidden="true">
                      <Trophy size={18} />
                    </span>
                    <div>
                      <strong>{examiner.badgeLabel}</strong>
                      <small>Chứng nhận Quốc tế</small>
                    </div>
                  </div>

                  <div className="exd-portrait-img-wrap">
                    <img
                      key={examiner.id}
                      className="exd-portrait-img"
                      src={examiner.resolvedAvatarUrl}
                      data-fallback-src={examiner.fallbackAvatarUrl}
                      alt={`Chân dung giảng viên ${examiner.displayName}`}
                      width="460"
                      height="490"
                      decoding="async"
                      onError={(event) => {
                        const img = event.currentTarget
                        if (img.src !== examiner.fallbackAvatarUrl) {
                          img.src = examiner.fallbackAvatarUrl
                        }
                      }}
                    />
                  </div>

                  {topCert ? (
                    <div className="exd-floating-badge exd-floating-badge--cert">
                      <span className="exd-floating-badge-icon" aria-hidden="true">
                        <Award size={18} />
                      </span>
                      <div>
                        <strong>{topCert.name}</strong>
                        <small>{[topCert.issuer, topCert.year].filter(Boolean).join(' · ') || 'Chứng chỉ Quốc tế'}</small>
                      </div>
                    </div>
                  ) : null}

                  <div className="exd-floating-badge exd-floating-badge--speed">
                    <span className="exd-floating-badge-icon exd-floating-badge-icon--blue" aria-hidden="true">
                      <Clock size={17} />
                    </span>
                    <div>
                      <strong>Phản hồi {examiner.stats.avgTurnaround}</strong>
                      <small>Chấm kỹ 4 tiêu chí</small>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Section 2: Database Certificates & Academic Credentials */}
        <section className="exd-section" aria-labelledby="exd-certs-title">
          <div className="exd-shell">
            <header className="exd-section-header">
              <span className="exd-eyebrow">
                <GraduationCap size={15} aria-hidden="true" /> Hồ sơ Năng lực & Bằng cấp
              </span>
              <h2 id="exd-certs-title">
                CHỨNG CHỈ QUỐC TẾ &amp; <span>THÀNH TỰU HỌC THUẬT</span>
              </h2>
              <p>
                Toàn bộ thông tin band điểm và chứng chỉ chuyên môn của {examiner.displayName} được đối soát và lưu trữ trực tiếp trên hệ thống học thuật The IELTS Space.
              </p>
            </header>

            <div className="exd-cert-grid" role="list" aria-label="Danh sách chứng chỉ của giảng viên">
              {examiner.certificates.map((cert, index) => (
                <article
                  className="exd-cert-card"
                  key={`${cert.name}-${cert.year ?? index}`}
                  role="listitem"
                >
                  <div className="exd-cert-card-top">
                    <span className="exd-cert-icon" aria-hidden="true">
                      <Award size={22} />
                    </span>
                    {cert.year ? <span className="exd-cert-year">Năm {cert.year}</span> : null}
                  </div>
                  <h3>{cert.name}</h3>
                  <p className="exd-cert-issuer">
                    {cert.issuer || 'Tổ chức Khảo thí & Đào tạo Quốc tế'}
                  </p>
                  {cert.score ? (
                    <span className="exd-cert-score">
                      <Star size={14} aria-hidden="true" /> Kết quả: {cert.score}
                    </span>
                  ) : (
                    <span className="exd-cert-score">
                      <CheckCircle2 size={14} aria-hidden="true" /> Đã xác thực hồ sơ
                    </span>
                  )}
                </article>
              ))}
            </div>
          </div>
        </section>

        {/* Section 3: 4-Step Deep Grading Methodology */}
        <section className="exd-section exd-section--soft" aria-labelledby="exd-method-title">
          <div className="exd-shell">
            <header className="exd-section-header">
              <span className="exd-eyebrow">
                <FileCheck2 size={15} aria-hidden="true" /> Quy trình Chấm chữa Chuyên sâu
              </span>
              <h2 id="exd-method-title">
                BẠN NHẬN ĐƯỢC GÌ KHI CHỌN <span>{examiner.displayName}?</span>
              </h2>
              <p>
                Không chỉ dừng ở con số tổng kết, mỗi bài Writing và Speaking gửi tới giảng viên đều được mổ xẻ chi tiết từng câu chữ để bạn tiến bộ ngay ở bài kế tiếp.
              </p>
            </header>

            <div className="exd-method-layout">
              <div className="exd-steps">
                {GRADING_STEPS.map((step) => (
                  <article className="exd-step-card" key={step.number}>
                    <span className="exd-step-num" aria-hidden="true">{step.number}</span>
                    <div>
                      <h3>{step.title}</h3>
                      <p>{step.description}</p>
                    </div>
                  </article>
                ))}
              </div>

              <aside className="exd-sample-card" aria-label="Mô phỏng phiếu chấm bài của giảng viên">
                <div className="exd-sample-head">
                  <div>
                    <strong>Phiếu Nhận Xét Chuyên Gia</strong>
                    <div style={{ fontSize: '.76rem', opacity: 0.8, marginTop: '.15rem' }}>
                      Người chấm: {examiner.displayName}
                    </div>
                  </div>
                  <span className="exd-sample-band">Overall {bandDisplay} Standard</span>
                </div>

                <div className="exd-criteria-bars">
                  {SAMPLE_CRITERIA.map((criterion) => (
                    <div className="exd-criterion-row" key={criterion.name}>
                      <div className="exd-criterion-label">
                        <span>{criterion.name}</span>
                        <strong>{criterion.score}</strong>
                      </div>
                      <div className="exd-criterion-track" aria-hidden="true">
                        <div className="exd-criterion-fill" style={{ width: `${criterion.percent}%` }} />
                      </div>
                    </div>
                  ))}
                </div>

                <div className="exd-sample-quote">
                  <p style={{ margin: '0 0 .5rem', fontWeight: 800 }}>
                    <BookOpenCheck size={15} style={{ display: 'inline', verticalAlign: '-2px', marginRight: '.35rem' }} aria-hidden="true" />
                    Trích dẫn sửa bài trực tiếp (Inline Feedback):
                  </p>
                  <p style={{ margin: 0 }}>
                    “Luận điểm ở đoạn 2 rất sắc bén. Tuy nhiên cụm <mark>make a big impact on</mark> nên nâng cấp thành{' '}
                    <mark>exert a profound influence upon</mark> để đạt điểm Lexical Resource 8.0+.”
                  </p>
                </div>
              </aside>
            </div>
          </div>
        </section>

        {/* Section 4: Interactive Examiner Directory Switcher */}
        <section id="exd-directory" className="exd-section" aria-labelledby="exd-directory-title">
          <div className="exd-shell">
            <header className="exd-section-header">
              <span className="exd-eyebrow">
                <Users size={15} aria-hidden="true" /> Đội ngũ Chuyên gia IELTS Space
              </span>
              <h2 id="exd-directory-title">
                KHÁM PHÁ CÁC <span>GIẢNG VIÊN TRUYỀN CẢM HỨNG</span>
              </h2>
              <p>
                Chọn một giảng viên bất kỳ bên dưới để xem ngay hồ sơ học thuật, chứng chỉ quốc tế và phong cách chấm chữa.
              </p>
            </header>

            <div className="exd-directory-grid">
              {allExaminers.map((member) => {
                const isCurrent = member.id === examiner.id
                return (
                  <Link
                    key={member.id}
                    to={`/mentors/${member.id}`}
                    className={`exd-member-card${isCurrent ? ' is-current' : ''}`}
                    aria-current={isCurrent ? 'page' : undefined}
                  >
                    <div className="exd-member-top">
                      <img
                        className="exd-member-avatar"
                        src={member.resolvedAvatarUrl}
                        alt=""
                        loading="lazy"
                        decoding="async"
                        onError={(event) => {
                          const img = event.currentTarget
                          if (img.src !== member.fallbackAvatarUrl) {
                            img.src = member.fallbackAvatarUrl
                          }
                        }}
                      />
                      <div className="exd-member-meta">
                        <h3>{member.displayName}</h3>
                        <span className="exd-member-band">{member.badgeLabel}</span>
                      </div>
                    </div>
                    <p className="exd-member-bio">{member.bio}</p>
                    <span className="exd-member-cta">
                      {isCurrent ? 'Đang xem hồ sơ này' : 'Xem chi tiết hồ sơ'}
                      <ArrowRight size={15} aria-hidden="true" />
                    </span>
                  </Link>
                )
              })}
            </div>
          </div>
        </section>
      </main>
    </div>
  )
}
