import { ArrowRight, House, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { HOME_IMAGE_URLS } from '../homeData'

export function HomeIntroductionSection() {
  return (
    <section id="home-intro" className="home-introduction home-section" aria-labelledby="home-title">
      <div className="home-section-shell home-introduction-grid">
        <div className="home-introduction-visual">
          <div className="home-introduction-main-image">
            <img src={HOME_IMAGE_URLS.introductionMain} alt="Giáo viên đồng hành cùng học viên trong không gian học tập IELTS" width="655" height="677" fetchPriority="high" decoding="async" />
          </div>
          <div className="home-introduction-team-image">
            <img src={HOME_IMAGE_URLS.introductionTeam} alt="Đội ngũ The IELTS Space" width="253" height="148" loading="lazy" decoding="async" />
          </div>
        </div>
        <div className="home-introduction-copy">
          <span className="home-inline-label"><House aria-hidden="true" />Giới thiệu <Sparkles aria-hidden="true" /></span>
          <h2 id="home-title"><span>THE IELTS SPACE</span> KHÔNG GIAN HỌC TẬP TÍCH HỢP THẾ HỆ MỚI</h2>
          <p><strong>THE IELTS SPACE</strong> tái thiết cách người học chinh phục tiếng Anh bằng một không gian sinh thái tích hợp – nơi giáo viên dẫn dắt kỹ càng, công nghệ liên tục tinh chỉnh tối ưu, mentor 1-1 đồng hành theo sát và dữ liệu tiến bộ trực quan thực tế. Toàn bộ quá trình từ học trên lớp, luyện tập, chữa bài đến theo dõi kết quả đều được kết nối trong một hệ trải nghiệm thống nhất, đi theo lộ trình cá nhân rõ ràng.</p>
          <p><strong>THE IELTS SPACE</strong> cung cấp các chương trình tiếng Anh từ nền tảng đến nâng cao, tập trung vào IELTS và các chứng chỉ quốc tế. Giáo trình nội bộ được xây dựng theo khung năng lực quốc tế, thiết kế riêng cho từng trình độ.</p>
          <Button asChild className="home-orange-cta"><a href="#home-features">Xem thêm về The IELTS Space <ArrowRight aria-hidden="true" /></a></Button>
        </div>
      </div>
    </section>
  )
}
