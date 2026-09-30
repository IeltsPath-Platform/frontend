import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, BookOpen, Check, GraduationCap, Headphones, Layers, Mic, Minus, PenLine, Sparkles, Target } from 'lucide-react'
import { SiteNavbar } from '@/components/SiteNavbar'
import { ClassMascot } from '@/components/ClassMascot'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { HOME_MENTORS, HOME_PLANS } from './homeData'
import './home.css'

export function HomePage() {
  const [mentor, setMentor] = useState<(typeof HOME_MENTORS)[number] | null>(null)
  const [plan, setPlan] = useState<(typeof HOME_PLANS)[number] | null>(null)

  return (
    <div className="home-page">
      <a className="skip-link" href="#home-main">Chuyển đến nội dung chính</a>
      <SiteNavbar />
      <main id="home-main" tabIndex={-1} className="home-main">
        <section id="home-intro" className="home-hero" aria-labelledby="home-title">
          <div className="home-hero-orbit" aria-hidden="true" />
          <div className="home-hero-shell">
            <div className="home-hero-copy">
              <span className="home-hero-tag"><Sparkles size={15} />KHÔNG GIAN HỌC IELTS CỦA BẠN</span>
              <h1 id="home-title" className="home-hero-title">Mỗi ngày một bước.<br /><em>Gần hơn band mục tiêu.</em></h1>
              <p>Học có định hướng, luyện tập chủ động và nhận phản hồi từ Mentor. Tất cả trong một không gian dành riêng cho hành trình IELTS của bạn.</p>
              <div className="home-actions">
                <Button asChild className="home-primary-action"><Link to="/practice-tests">Khám phá bài luyện <ArrowRight /></Link></Button>
                <a className="home-secondary-action" href="#home-mentors">Gặp gỡ Mentor <ArrowRight size={16} /></a>
              </div>
              <div className="home-hero-points"><span><Check size={16} />4 kỹ năng</span><span><Check size={16} />Lộ trình rõ ràng</span><span><Check size={16} />Học theo nhịp riêng</span></div>
            </div>
            <div className="home-journey" aria-label="Bốn kỹ năng hướng tới mục tiêu IELTS">
              <ClassMascot className="home-class-mascot" size="md" />
              {[{ label: 'Listening', icon: Headphones }, { label: 'Reading', icon: BookOpen }, { label: 'Writing', icon: PenLine }, { label: 'Speaking', icon: Mic }].map(({ label, icon: Icon }) => <div key={label} className={`home-skill home-skill-${label.toLowerCase()}`}><Icon size={21} /><span>{label}</span></div>)}
              <div className="home-journey-caption"><Sparkles size={15} />Hành trình lớn bắt đầu từ một bài học nhỏ</div>
            </div>
          </div>
        </section>

        <div className="home-shell">
          <section id="home-features" className="home-section" aria-labelledby="home-features-title">
            <div className="home-section-heading"><span className="home-eyebrow">HỌC CÓ PHƯƠNG PHÁP</span><h2 id="home-features-title">Không chỉ luyện đề. Hiểu cách mình tiến bộ.</h2></div>
            <div className="home-feature-grid">
              {[{ title: 'Nhìn rõ hành trình', text: 'Overview giúp bạn theo dõi kỹ năng, lịch học và mục tiêu tiếp theo.', icon: Target, to: '/overview' }, { title: 'Chủ động luyện tập', text: 'Tập trung khi thi thử. Khám phá, ghi chú và tạo Flashcard khi luyện tập.', icon: Layers, to: '/practice-tests' }, { title: 'Kết nối lớp học', text: 'Theo dõi thời khóa biểu và xem nội dung từng buổi học tại một nơi.', icon: GraduationCap, to: '/classroom' }].map(({ title, text, icon: Icon, to }) => <article className="home-feature-card" key={title}><span className="home-feature-icon"><Icon size={24} /></span><h3>{title}</h3><p>{text}</p><Link to={to}>Khám phá <ArrowRight size={16} /></Link></article>)}
            </div>
          </section>

          <section id="home-mentors" className="home-section" aria-labelledby="home-mentors-title">
            <div className="home-section-heading"><span className="home-eyebrow">NGƯỜI ĐỒNG HÀNH</span><h2 id="home-mentors-title">Mentor góp ý. Bạn tiến xa.</h2><p>Phản hồi cụ thể từ người trực tiếp chấm bài, để mỗi lần luyện tập đều có ý nghĩa.</p></div>
            <p className="home-demo-notice">Hồ sơ, học vị và chuyên môn bên dưới là dữ liệu minh họa, chưa phải thông tin đã xác minh.</p>
            <div className="home-mentor-grid">
              {HOME_MENTORS.map((item) => <article key={item.id} className="home-mentor-card"><div className="home-mentor-cover"><div className="home-avatar" role="img" aria-label={`Avatar chữ cái của ${item.name}`}>{item.initials}</div><span><GraduationCap size={16} />MENTOR</span></div><div className="home-mentor-body"><span className="home-skill-label">{item.skill}</span><h3>{item.name}</h3><p>{item.degree}</p><Button variant="outline" className="home-detail-button" onClick={() => setMentor(item)}>Xem chi tiết <ArrowRight /></Button></div></article>)}
            </div>
          </section>

          <section id="home-pricing" className="home-section" aria-labelledby="home-pricing-title">
            <div className="home-section-heading"><span className="home-eyebrow">ĐẦU TƯ CHO MỤC TIÊU</span><h2 id="home-pricing-title">Chọn không gian học phù hợp với bạn</h2><p>Từ những bài luyện đầu tiên đến hành trình có Mentor đồng hành.</p></div>
            <p className="home-demo-notice">Giá và quyền lợi minh họa cho giao diện. Chưa mở đăng ký trả phí hoặc thanh toán.</p>
            <div className="home-pricing-grid">
              {HOME_PLANS.map((item) => <article key={item.id} className={`home-price-card ${item.featured ? 'is-featured' : ''}`}><span className="home-plan-tag">{item.featured ? 'DÀNH CHO NGƯỜI LUYỆN TẬP CHỦ ĐỘNG' : 'GÓI MINH HỌA'}</span><h3>{item.name}</h3><strong className="home-price">{item.price}</strong><p>{item.period}</p><ul>{item.benefits.map((benefit) => <li key={benefit}><Check size={18} /><span>{benefit}</span></li>)}{item.unavailable.map((benefit) => <li className="home-unavailable" key={benefit}><Minus size={18} /><span>Không gồm: {benefit}</span></li>)}</ul><Button variant={item.featured ? 'default' : 'outline'} className="home-plan-button" onClick={() => setPlan(item)}>Xem gói học <ArrowRight /></Button></article>)}
            </div>
          </section>
          <footer className="home-footer"><span>IELTS Space · Your space to grow.</span><Link to="/practice-tests">Bắt đầu luyện tập <ArrowRight size={16} /></Link></footer>
        </div>
      </main>

      <Dialog open={!!mentor} onOpenChange={(open) => { if (!open) setMentor(null) }}><DialogContent><DialogHeader><DialogTitle>{mentor?.name}</DialogTitle><DialogDescription>Hồ sơ Mentor minh họa · chưa xác minh</DialogDescription></DialogHeader><p className="font-semibold">{mentor?.degree}</p><p>{mentor?.skill}</p><p>{mentor?.description}</p><p className="text-sm text-muted-foreground">Thông tin chính thức và lịch tư vấn sẽ được cập nhật khi kết nối dịch vụ Mentor.</p></DialogContent></Dialog>
      <Dialog open={!!plan} onOpenChange={(open) => { if (!open) setPlan(null) }}><DialogContent><DialogHeader><DialogTitle>{plan?.name}</DialogTitle><DialogDescription>Gói minh họa — không phát sinh đăng ký hoặc thanh toán.</DialogDescription></DialogHeader><strong className="text-2xl">{plan?.price}</strong><ul className="space-y-3">{plan?.benefits.map((benefit) => <li className="flex gap-2" key={benefit}><Check className="shrink-0" size={18} />{benefit}</li>)}</ul><Button asChild className="home-plan-button"><Link to="/practice-tests">Trải nghiệm bài luyện hiện có <ArrowRight /></Link></Button></DialogContent></Dialog>
    </div>
  )
}
