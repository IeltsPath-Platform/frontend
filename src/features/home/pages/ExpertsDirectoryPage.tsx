import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  ArrowRight,
  Award,
  BadgeCheck,
  BookOpenCheck,
  CheckCircle2,
  Compass,
  FileCheck2,
  RotateCcw,
  Search,
  ShieldCheck,
  Sparkles,
  Trophy,
  Users,
} from 'lucide-react'
import { OwlHero } from '@/components/OwlHero'
import { SiteNavbar } from '@/components/SiteNavbar'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import {
  fetchPublicExaminers,
  SEEDED_EXAMINERS,
  type EnrichedExaminer,
} from '../examinerPublicApi'
import { useHomeScrollReveal } from '../useHomeScrollReveal'
import '../home.css'
import '../examiner-detail.css'
import '../experts-directory.css'

export type SkillFilter = 'ALL' | 'Writing' | 'Speaking' | 'Listening' | 'Reading'
export type SortOption = 'band' | 'experience' | 'name'

const SKILL_CHIPS: ReadonlyArray<{ id: SkillFilter; label: string }> = [
  { id: 'ALL', label: 'Tất cả' },
  { id: 'Writing', label: 'Writing' },
  { id: 'Speaking', label: 'Speaking' },
  { id: 'Listening', label: 'Listening' },
  { id: 'Reading', label: 'Reading' },
]

const WORKFLOW_STEPS = [
  {
    number: '01',
    title: 'Chọn chuyên gia',
    description:
      'Xem hồ sơ năng lực, chứng chỉ quốc tế và thế mạnh chuyên môn từng kỹ năng để chọn chuyên gia đồng hành phù hợp với mục tiêu band điểm.',
  },
  {
    number: '02',
    title: 'Nộp bài',
    description:
      'Gửi bài luận Writing hoặc bản thu Speaking trực tiếp từ phòng luyện đề chuẩn cấu trúc thi thật trên hệ thống IELTS Space.',
  },
  {
    number: '03',
    title: 'Nhận nhận xét theo 4 tiêu chí',
    description:
      'Chẩn đoán độc lập Task Achievement/Response, Coherence & Cohesion, Lexical Resource và Grammatical Range & Accuracy kèm gắn thẻ lỗi trực tiếp (Inline Annotations) và gợi ý nâng cấp Band 8.0+ (Band-Up Rewrites).',
  },
  {
    number: '04',
    title: 'Ôn lại theo gợi ý',
    description:
      'Các mã lỗi giám khảo chỉ ra được tự động đồng bộ vào Cây tri thức & Giỏ ôn tập để bạn luyện đúng điểm yếu cho đến khi thành thạo.',
  },
] as const

/**
 * CẦN DUYỆT: Các câu chữ marketing cho mục "Tiêu chuẩn chuyên gia" (không tự đặt con số cố định).
 * Dễ dàng chỉnh sửa tại hằng số này sau khi đội ngũ học thuật/marketing chốt nội dung.
 */
export const EXPERT_STANDARDS_COPY = {
  sectionEyebrow: 'Cam kết Chất lượng Học thuật', // CẦN DUYỆT
  sectionTitlePrefix: 'TIÊU CHUẨN', // CẦN DUYỆT
  sectionTitleHighlight: 'CHUYÊN GIA IELTS SPACE', // CẦN DUYỆT
  sectionDescription:
    'Mỗi chuyên gia trong đội ngũ chấm chữa đều trải qua quy trình tuyển chọn, xác thực bằng cấp và giám sát chất lượng học thuật nghiêm ngặt.', // CẦN DUYỆT
  cards: [
    {
      id: 'minimum-band',
      title: 'Chuẩn band điểm IELTS học thuật & chứng chỉ sư phạm', // CẦN DUYỆT
      description:
        'Chuyên gia sở hữu chứng chỉ IELTS Academic đạt chuẩn đầu vào của hệ thống kèm chứng chỉ giảng dạy quốc tế (như CELTA, TESOL, DELTA) hoặc bằng cấp chuyên ngành ngôn ngữ.', // CẦN DUYỆT
    },
    {
      id: 'credential-verification',
      title: 'Đối soát chứng chỉ & hồ sơ năng lực minh bạch', // CẦN DUYỆT
      description:
        'Toàn bộ bảng điểm IELTS, văn bằng học thuật và chứng nhận khảo thí đều được đối soát bản gốc và lưu trữ minh bạch trên hệ thống trước khi nhận bài chấm.', // CẦN DUYỆT
    },
    {
      id: 'periodic-qa',
      title: 'Kiểm tra chất lượng chấm chữa định kỳ', // CẦN DUYỆT
      description:
        'Các phiếu chấm được hội đồng học thuật rà soát định kỳ theo rubric 4 tiêu chí IDP & British Council nhằm đảm bảo độ chính xác, tính nhất quán và chiều sâu nhận xét.', // CẦN DUYỆT
    },
  ],
} as const

function parseExperienceYears(examiner: EnrichedExaminer): number {
  const fromStats = Number.parseInt(examiner.stats.yearsExperience.replace(/\D+/g, ''), 10)
  if (!Number.isNaN(fromStats) && fromStats > 0) return fromStats
  const match = examiner.experienceLabel.match(/\d+/)
  return match ? Number.parseInt(match[0], 10) : 0
}

function matchesSkillFilter(examiner: EnrichedExaminer, skill: SkillFilter): boolean {
  if (skill === 'ALL') return true
  const needle = skill.toLowerCase()
  return examiner.specialties.some((spec) => spec.toLowerCase().includes(needle))
}

export function ExpertsDirectoryPage() {
  useHomeScrollReveal()

  const [examiners, setExaminers] = useState<readonly EnrichedExaminer[]>(SEEDED_EXAMINERS)
  const [isLoading, setIsLoading] = useState(true)
  const [isFallbackData, setIsFallbackData] = useState(false)

  const [searchQuery, setSearchQuery] = useState('')
  const [selectedSkill, setSelectedSkill] = useState<SkillFilter>('ALL')
  const [onlyAccepting, setOnlyAccepting] = useState(false)
  const [sortBy, setSortBy] = useState<SortOption>('band')

  useEffect(() => {
    const controller = new AbortController()

    fetchPublicExaminers(controller.signal)
      .then((loaded) => {
        if (controller.signal.aborted) return
        if (loaded.length > 0) {
          setExaminers(loaded)
          setIsFallbackData(false)
        } else {
          setExaminers(SEEDED_EXAMINERS)
          setIsFallbackData(true)
        }
        setIsLoading(false)
      })
      .catch(() => {
        if (controller.signal.aborted) return
        setExaminers(SEEDED_EXAMINERS)
        setIsFallbackData(true)
        setIsLoading(false)
      })

    return () => controller.abort()
  }, [])

  // Lọc trên client (danh sách nhỏ).
  // Ghi chú: nếu số chuyên gia vượt 50 thì chuyển sang phân trang và lọc ở server.
  const filteredExaminers = useMemo(() => {
    const cleanQuery = searchQuery.trim().toLowerCase()

    const filtered = examiners.filter((examiner) => {
      if (cleanQuery && !examiner.displayName.toLowerCase().includes(cleanQuery)) {
        return false
      }
      if (!matchesSkillFilter(examiner, selectedSkill)) {
        return false
      }
      if (onlyAccepting && !examiner.acceptingSubmissions) {
        return false
      }
      return true
    })

    return [...filtered].sort((a, b) => {
      if (sortBy === 'band') {
        const bandDiff = (b.ieltsBand ?? 0) - (a.ieltsBand ?? 0)
        if (bandDiff !== 0) return bandDiff
        return parseExperienceYears(b) - parseExperienceYears(a)
      }
      if (sortBy === 'experience') {
        const expDiff = parseExperienceYears(b) - parseExperienceYears(a)
        if (expDiff !== 0) return expDiff
        return (b.ieltsBand ?? 0) - (a.ieltsBand ?? 0)
      }
      return a.displayName.localeCompare(b.displayName, 'vi')
    })
  }, [examiners, searchQuery, selectedSkill, onlyAccepting, sortBy])

  // Ensure dynamically rendered cards after loading/filtering are revealed if IntersectionObserver is unavailable or already in view
  useEffect(() => {
    if (isLoading) return
    const prefersReduced = typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    if (prefersReduced || typeof IntersectionObserver === 'undefined') {
      document.querySelectorAll<HTMLElement>('[data-home-reveal]').forEach((el) => el.classList.add('is-visible'))
    }
  }, [isLoading, filteredExaminers])

  const metrics = useMemo(() => {
    const totalExperts = examiners.length
    const maxBand = examiners.reduce((max, item) => Math.max(max, item.ieltsBand ?? 0), 0)
    const highestBand = maxBand > 0 ? maxBand.toFixed(1) : '8.5'
    const totalCerts = examiners.reduce((sum, item) => sum + item.certificates.length, 0)
    const acceptingCount = examiners.filter((item) => item.acceptingSubmissions).length
    return { totalExperts, highestBand, totalCerts, acceptingCount }
  }, [examiners])

  const isFiltering = searchQuery.trim() !== '' || selectedSkill !== 'ALL' || onlyAccepting
  const showFeatured = !isLoading && filteredExaminers.length > 0 && !(isFiltering && filteredExaminers.length === 1)
  const featuredExaminer = showFeatured ? filteredExaminers[0] : null
  const heroPortraits = examiners.slice(0, 4)

  function handleResetFilters() {
    setSearchQuery('')
    setSelectedSkill('ALL')
    setOnlyAccepting(false)
    setSortBy('band')
  }

  return (
    <div className="exd-page home-page exp-page">
      <a className="skip-link" href="#exp-main">Chuyển đến nội dung chính</a>
      <SiteNavbar />

      <main id="exp-main" tabIndex={-1}>
        {/* 1. Hero Section */}
        <section className="exd-hero" aria-labelledby="exp-hero-title">
          <span className="exd-hero-orb exd-hero-orb--one" aria-hidden="true" />
          <span className="exd-hero-orb exd-hero-orb--two" aria-hidden="true" />

          <div className="exd-shell">
            <div className="exd-hero-grid">
              <div className="exd-hero-copy">
                <div className="exd-status-row">
                  <span className="exd-pill exd-pill--verified">
                    <ShieldCheck size={14} aria-hidden="true" /> ĐỘI NGŨ CHUYÊN GIA IELTS SPACE
                  </span>
                </div>

                <h1 id="exp-hero-title" className="exd-hero-title">
                  Học cùng những chuyên gia IELTS tận tâm nhất
                </h1>
                <p className="exd-hero-bio">
                  Đồng hành cùng đội ngũ giám khảo và cố vấn học thuật chuẩn quốc tế. Mỗi bài Writing &amp; Speaking được chấm chữa chi tiết theo 4 tiêu chí IDP &amp; British Council, giúp bạn bứt phá band điểm thực chất.
                </p>

                {isLoading ? (
                  <div className="exd-stats-strip" aria-label="Đang tải số liệu chuyên gia" aria-busy="true">
                    {Array.from({ length: 4 }).map((_, idx) => (
                      <div className="exd-stat-box" key={idx}>
                        <div className="exp-skeleton exp-skeleton--dark" style={{ height: '1.5rem', width: '65%', marginBottom: '.4rem' }} />
                        <div className="exp-skeleton exp-skeleton--dark" style={{ height: '.85rem', width: '85%' }} />
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="exd-stats-strip" role="list" aria-label="Số liệu đội ngũ chuyên gia">
                    <div className="exd-stat-box" role="listitem">
                      <strong>{metrics.totalExperts}</strong>
                      <span>Số chuyên gia</span>
                    </div>
                    <div className="exd-stat-box" role="listitem">
                      <strong>IELTS {metrics.highestBand}</strong>
                      <span>Band IELTS cao nhất</span>
                    </div>
                    <div className="exd-stat-box" role="listitem">
                      <strong>{metrics.totalCerts}</strong>
                      <span>Chứng chỉ quốc tế</span>
                    </div>
                    <div className="exd-stat-box" role="listitem">
                      <strong>{metrics.acceptingCount}</strong>
                      <span>Đang nhận bài chấm</span>
                    </div>
                  </div>
                )}

                <div className="exd-hero-actions">
                  <Link to="/practice-tests?skill=writing" className="exd-btn-primary">
                    Gửi bài Writing cho chuyên gia <ArrowRight size={16} aria-hidden="true" />
                  </Link>
                  <Link to="/learn/placement" className="exd-btn-secondary">
                    <Compass size={16} aria-hidden="true" /> Test đầu vào 4 kỹ năng FREE
                  </Link>
                </div>
              </div>

              <div className="exd-hero-showcase">
                {isLoading ? (
                  <div className="exp-hero-collage" aria-hidden="true">
                    <div
                      className="exp-skeleton exp-skeleton--dark"
                      style={{ width: '100%', height: '22rem', borderRadius: '1.75rem' }}
                    />
                  </div>
                ) : (
                  <div className="exp-hero-collage">
                    <span className="exp-hero-collage-halo" aria-hidden="true" />
                    <span className="exp-hero-collage-ring" aria-hidden="true" />
                    <div className="exp-collage-cards">
                      {heroPortraits.map((member, index) => (
                        <div
                          key={member.id}
                          className={`exp-collage-card exp-collage-card--${index}`}
                        >
                          <div className="exp-collage-img-wrap">
                            <span className="exp-collage-badge">
                              <Trophy size={11} aria-hidden="true" />
                              {member.badgeLabel}
                            </span>
                            <img
                              src={member.resolvedAvatarUrl}
                              alt={member.displayName}
                              width="200"
                              height="220"
                              decoding="async"
                              onError={(event) => {
                                const img = event.currentTarget
                                if (img.src !== member.fallbackAvatarUrl) {
                                  img.src = member.fallbackAvatarUrl
                                }
                              }}
                            />
                          </div>
                          <div className="exp-collage-caption">{member.displayName}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* 2. Sticky Filter Bar */}
        <section className="exp-filter-bar" aria-labelledby="exp-filter-title">
          <div className="exd-shell exp-filter-inner">
            <h2 id="exp-filter-title" className="sr-only">
              Bộ lọc và tìm kiếm chuyên gia
            </h2>

            <div className="exp-filter-top">
              <div className="exp-search-wrap">
                <Search size={16} className="exp-search-icon" aria-hidden="true" />
                <input
                  type="search"
                  className="exp-search-input"
                  placeholder="Tìm chuyên gia theo tên..."
                  aria-label="Tìm theo tên chuyên gia"
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                />
              </div>

              <div className="exp-skill-chips" role="group" aria-label="Lọc theo kỹ năng">
                {SKILL_CHIPS.map((chip) => (
                  <button
                    key={chip.id}
                    type="button"
                    className="exp-skill-chip"
                    aria-pressed={selectedSkill === chip.id}
                    onClick={() => setSelectedSkill(chip.id)}
                  >
                    {chip.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="exp-filter-bottom">
              <div className="exp-filter-controls">
                <label className="exp-switch-label" htmlFor="exp-accepting-switch">
                  <Switch
                    id="exp-accepting-switch"
                    checked={onlyAccepting}
                    onCheckedChange={setOnlyAccepting}
                    aria-label="Chỉ hiện chuyên gia đang nhận bài"
                  />
                  <span>Chỉ hiện chuyên gia đang nhận bài</span>
                </label>

                <div className="exp-sort-group">
                  <label htmlFor="exp-sort-select">Sắp xếp:</label>
                  <select
                    id="exp-sort-select"
                    className="exp-sort-select"
                    value={sortBy}
                    onChange={(event) => setSortBy(event.target.value as SortOption)}
                  >
                    <option value="band">Band cao nhất</option>
                    <option value="experience">Nhiều kinh nghiệm nhất</option>
                    <option value="name">Tên A–Z</option>
                  </select>
                </div>
              </div>

              <div className="exp-filter-meta" aria-live="polite">
                <span className="exp-count-text">
                  Đang hiện <strong>{filteredExaminers.length}</strong> chuyên gia
                </span>
                {isFallbackData ? (
                  <span className="exp-fallback-notice" role="status">
                    Đang hiển thị dữ liệu mẫu
                  </span>
                ) : null}
              </div>
            </div>
          </div>
        </section>

        {/* 3. Featured Expert Section */}
        {featuredExaminer ? (
          <section className="exp-featured-section" aria-labelledby="exp-featured-title">
            <div className="exd-shell">
              <article className="exp-featured-card" data-testid="featured-examiner-card">
                <div className="exp-featured-portrait">
                  <span className="exp-featured-band">
                    <Trophy size={13} aria-hidden="true" />
                    {featuredExaminer.badgeLabel}
                  </span>
                  <img
                    src={featuredExaminer.resolvedAvatarUrl}
                    alt={featuredExaminer.displayName}
                    width="320"
                    height="350"
                    decoding="async"
                    onError={(event) => {
                      const img = event.currentTarget
                      if (img.src !== featuredExaminer.fallbackAvatarUrl) {
                        img.src = featuredExaminer.fallbackAvatarUrl
                      }
                    }}
                  />
                </div>

                <div className="exp-featured-content">
                  <div className="exp-featured-top-tags">
                    <span className="exp-featured-ribbon">
                      <Sparkles size={13} aria-hidden="true" /> Chuyên gia tiêu biểu
                    </span>
                    {featuredExaminer.acceptingSubmissions ? (
                      <span className="exp-live-badge">
                        <span className="exp-live-badge-dot" aria-hidden="true" />
                        Đang nhận bài
                      </span>
                    ) : null}
                  </div>

                  <h2 id="exp-featured-title" className="exp-featured-name">
                    {featuredExaminer.displayName}
                  </h2>
                  <p className="exp-featured-headline">{featuredExaminer.headline}</p>

                  <blockquote className="exp-featured-quote">
                    “{featuredExaminer.bio}”
                  </blockquote>

                  <ul className="exp-featured-specs" aria-label="Chuyên môn tiêu biểu">
                    {featuredExaminer.specialties.slice(0, 4).map((spec) => (
                      <li key={spec}>
                        <CheckCircle2 size={13} aria-hidden="true" />
                        <span>{spec}</span>
                      </li>
                    ))}
                  </ul>

                  {featuredExaminer.certificates.length > 0 ? (
                    <div className="exp-featured-certs">
                      {featuredExaminer.certificates.slice(0, 2).map((cert, idx) => (
                        <div className="exp-featured-cert-item" key={`${cert.name}-${idx}`}>
                          <span className="exp-featured-cert-icon" aria-hidden="true">
                            <Award size={16} />
                          </span>
                          <div>
                            <strong>{cert.name}</strong>
                            <span>
                              {[cert.issuer, cert.score].filter(Boolean).join(' · ') || 'Chứng chỉ quốc tế'}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : null}

                  <Link to={`/mentors/${featuredExaminer.id}`} className="exd-btn-primary">
                    Xem hồ sơ chi tiết <ArrowRight size={16} aria-hidden="true" />
                  </Link>
                </div>
              </article>
            </div>
          </section>
        ) : null}

        {/* 4. Experts Directory Grid */}
        <section className="exd-section" aria-labelledby="exp-grid-title">
          <div className="exd-shell">
            <header className="exd-section-header">
              <span className="exd-eyebrow">
                <Users size={15} aria-hidden="true" /> Danh bạ Giảng viên &amp; Giám khảo
              </span>
              <h2 id="exp-grid-title">
                ĐỘI NGŨ <span>CHUYÊN GIA ĐỒNG HÀNH</span>
              </h2>
              <p>
                Chọn chuyên gia phù hợp để xem chi tiết bằng cấp quốc tế, kinh nghiệm giảng dạy và quy trình chấm chữa 4 tiêu chí.
              </p>
            </header>

            {isLoading ? (
              <div
                className="exp-grid"
                data-testid="experts-loading-skeleton"
                aria-label="Đang tải danh sách chuyên gia"
                aria-busy="true"
              >
                {Array.from({ length: 6 }).map((_, index) => (
                  <div className="exp-card-skeleton" key={index}>
                    <div className="exp-skeleton" style={{ height: '14.5rem', borderRadius: '1.1rem' }} />
                    <div className="exp-skeleton" style={{ height: '1.3rem', width: '70%' }} />
                    <div className="exp-skeleton" style={{ height: '.95rem', width: '90%' }} />
                    <div className="exp-skeleton" style={{ height: '2.2rem', width: '100%' }} />
                    <div className="exp-skeleton" style={{ height: '2.6rem', width: '100%', borderRadius: '999px' }} />
                  </div>
                ))}
              </div>
            ) : filteredExaminers.length === 0 ? (
              <div className="exp-empty-state" role="status">
                <h3>Không tìm thấy chuyên gia phù hợp</h3>
                <p>
                  Không có chuyên gia nào khớp với từ khóa hoặc bộ lọc kỹ năng bạn đã chọn. Hãy thử điều chỉnh hoặc xóa bộ lọc.
                </p>
                <Button type="button" onClick={handleResetFilters} className="home-orange-cta">
                  <RotateCcw size={15} aria-hidden="true" /> Xóa bộ lọc
                </Button>
              </div>
            ) : (
              <div className="exp-grid" role="list" aria-label="Danh sách chuyên gia">
                {filteredExaminers.map((examiner) => {
                  const visibleSpecs = examiner.specialties.slice(0, 3)
                  const remainingSpecs = Math.max(0, examiner.specialties.length - 3)
                  const firstCert = examiner.certificates[0]

                  return (
                    <article
                      key={examiner.id}
                      data-home-reveal
                      className="exp-card-item is-visible"
                      role="listitem"
                    >
                      <Link
                        to={`/mentors/${examiner.id}`}
                        className="exp-card"
                        aria-label={`Xem hồ sơ ${examiner.displayName}`}
                      >
                        <div className="exp-card-portrait">
                          <span className="exp-card-band">{examiner.badgeLabel}</span>
                          {examiner.acceptingSubmissions ? (
                            <span className="exp-card-live">
                              <span className="exp-card-live-dot" aria-hidden="true" />
                              Đang nhận bài
                            </span>
                          ) : null}
                          <span className="exp-card-portrait-halo" aria-hidden="true" />
                          <img
                            src={examiner.resolvedAvatarUrl}
                            alt={examiner.displayName}
                            width="320"
                            height="340"
                            loading="lazy"
                            decoding="async"
                            onError={(event) => {
                              const img = event.currentTarget
                              if (img.src !== examiner.fallbackAvatarUrl) {
                                img.src = examiner.fallbackAvatarUrl
                              }
                            }}
                          />
                        </div>

                        <h3 className="exp-card-name">{examiner.displayName}</h3>
                        <p className="exp-card-headline">{examiner.headline}</p>
                        {examiner.experienceLabel !== examiner.headline ? (
                          <p className="exp-card-experience">{examiner.experienceLabel}</p>
                        ) : null}

                        <div className="exp-card-chips" aria-label="Chuyên môn">
                          {visibleSpecs.map((spec) => (
                            <span key={spec} className="exp-card-chip">
                              {spec}
                            </span>
                          ))}
                          {remainingSpecs > 0 ? (
                            <span className="exp-card-chip exp-card-chip--more">
                              +{remainingSpecs}
                            </span>
                          ) : null}
                        </div>

                        <div className="exp-card-cert-row">
                          <div className="exp-card-cert-main">
                            <Award size={14} aria-hidden="true" />
                            <span>
                              {firstCert
                                ? `${firstCert.name}${firstCert.score ? ` (${firstCert.score})` : ''}`
                                : 'Chứng chỉ quốc tế'}
                            </span>
                          </div>
                          <span className="exp-card-cert-total">
                            {examiner.certificates.length} chứng chỉ
                          </span>
                        </div>

                        <div className="exp-card-stats">
                          <div className="exp-card-stat">
                            <span>Bài đã chấm</span>
                            <strong>{examiner.stats.essaysGraded}</strong>
                          </div>
                          <div className="exp-card-stat">
                            <span>Thời gian phản hồi</span>
                            <strong>{examiner.stats.avgTurnaround}</strong>
                          </div>
                        </div>

                        <span className="exp-card-cta">
                          Xem hồ sơ <ArrowRight size={15} aria-hidden="true" />
                        </span>
                      </Link>
                    </article>
                  )
                })}
              </div>
            )}
          </div>
        </section>

        {/* 5. How it works (4 steps) */}
        <section className="exd-section exd-section--soft" aria-labelledby="exp-workflow-title">
          <div className="exd-shell">
            <header className="exd-section-header">
              <span className="exd-eyebrow">
                <FileCheck2 size={15} aria-hidden="true" /> Quy trình Đồng hành 4 Bước
              </span>
              <h2 id="exp-workflow-title">
                LÀM VIỆC VỚI CHUYÊN GIA <span>NHƯ THẾ NÀO?</span>
              </h2>
              <p>
                Quy trình chấm chữa khép kín kết hợp chuyên gia học thuật và hệ thống lộ trình thích ứng trên IELTS Space.
              </p>
            </header>

            <div className="exp-process-grid" role="list" aria-label="4 bước làm việc với chuyên gia">
              {WORKFLOW_STEPS.map((step) => (
                <article className="exp-process-card" key={step.number} role="listitem">
                  <span className="exp-process-num" aria-hidden="true">
                    {step.number}
                  </span>
                  <h3>{step.title}</h3>
                  <p>{step.description}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        {/* 6. Expert Standards (3 commitment cards) */}
        <section className="exd-section" aria-labelledby="exp-standards-title">
          <div className="exd-shell">
            <header className="exd-section-header">
              <span className="exd-eyebrow">
                <BadgeCheck size={15} aria-hidden="true" /> {EXPERT_STANDARDS_COPY.sectionEyebrow}
              </span>
              <h2 id="exp-standards-title">
                {EXPERT_STANDARDS_COPY.sectionTitlePrefix}{' '}
                <span>{EXPERT_STANDARDS_COPY.sectionTitleHighlight}</span>
              </h2>
              <p>{EXPERT_STANDARDS_COPY.sectionDescription}</p>
            </header>

            <div className="exp-standards-grid" role="list" aria-label="Tiêu chuẩn chuyên gia">
              {EXPERT_STANDARDS_COPY.cards.map((item, idx) => (
                <article className="exp-standard-card" key={item.id} role="listitem">
                  <span className="exp-standard-icon" aria-hidden="true">
                    {idx === 0 ? (
                      <Trophy size={22} />
                    ) : idx === 1 ? (
                      <ShieldCheck size={22} />
                    ) : (
                      <BookOpenCheck size={22} />
                    )}
                  </span>
                  <h3>{item.title}</h3>
                  <p>{item.description}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        {/* 7. Bottom CTA Banner with Owl */}
        <section className="exd-section" aria-labelledby="exp-cta-title" style={{ paddingTop: 0 }}>
          <div className="exd-shell">
            <div className="exp-cta-banner">
              <div className="exp-cta-copy">
                <h2 id="exp-cta-title">
                  Chưa biết chọn ai? Làm test đầu vào miễn phí để được gợi ý lộ trình
                </h2>
                <p>
                  Bài kiểm tra đầu vào 4 kỹ năng chuẩn IELTS giúp xác định chính xác band điểm hiện tại và gợi ý lộ trình học cùng chuyên gia phù hợp nhất.
                </p>
                <Link to="/learn/placement" className="exd-btn-primary">
                  Làm test đầu vào miễn phí <ArrowRight size={16} aria-hidden="true" />
                </Link>
              </div>
              <div className="exp-cta-mascot">
                <OwlHero poses={['idea', 'cheer', 'confident']} size="md" />
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  )
}
