import { ArrowRight, BookOpen, Check, Headphones, Mic, PenLine, Sparkles } from 'lucide-react'
import { Link } from 'react-router-dom'
import { ClassMascot } from '@/components/ClassMascot'
import { Button } from '@/components/ui/button'

const HERO_SKILLS = [
  { label: 'Listening', icon: Headphones },
  { label: 'Reading', icon: BookOpen },
  { label: 'Writing', icon: PenLine },
  { label: 'Speaking', icon: Mic },
] as const

export function HomeHeroSection() {
  return (
    <section id="home-hero" className="home-hero" aria-labelledby="home-hero-title">
      <div className="home-hero-shell">
        <div className="home-hero-copy">
          <span className="home-hero-tag"><Sparkles aria-hidden="true" />KHÔNG GIAN HỌC IELTS CỦA BẠN</span>
          <h1 id="home-hero-title" className="home-hero-title">Mỗi ngày một bước.<br /><em>Gần hơn band mục tiêu.</em></h1>
          <p>Học có định hướng, luyện tập chủ động và nhận phản hồi từ Mentor. Tất cả trong một không gian dành riêng cho hành trình IELTS của bạn.</p>
          <div className="home-hero-actions">
            <Button asChild className="home-hero-primary"><Link to="/practice-tests">Khám phá bài luyện <ArrowRight aria-hidden="true" /></Link></Button>
            <a className="home-hero-secondary" href="#home-mentors">Gặp gỡ Mentor <ArrowRight aria-hidden="true" /></a>
          </div>
          <div className="home-hero-points" aria-label="Quyền lợi học tập nổi bật">
            <span><Check aria-hidden="true" />4 kỹ năng</span>
            <span><Check aria-hidden="true" />Lộ trình rõ ràng</span>
            <span><Check aria-hidden="true" />Học theo nhịp riêng</span>
          </div>
        </div>

        <div className="home-hero-journey" aria-label="Bốn kỹ năng hướng tới mục tiêu IELTS">
          <div className="home-hero-orbit" aria-hidden="true" />
          <ClassMascot className="home-hero-mascot" size="md" imageAlt="Khủng long mascot IELTS Space" />
          {HERO_SKILLS.map(({ label, icon: Icon }) => (
            <div key={label} className={`home-hero-skill home-hero-skill-${label.toLowerCase()}`}>
              <Icon aria-hidden="true" /><span>{label}</span>
            </div>
          ))}
          <div className="home-hero-caption"><Sparkles aria-hidden="true" />Hành trình lớn bắt đầu từ một bài học nhỏ</div>
        </div>
      </div>
    </section>
  )
}
