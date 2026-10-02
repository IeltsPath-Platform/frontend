import { ChartNoAxesCombined, GraduationCap, MessageCircle, Target, Trophy } from 'lucide-react'
import { HOME_COMMITMENTS, HOME_IMAGE_URLS } from '../homeData'

export function QualityCommitmentSection() {
  return (
    <section id="home-quality" className="home-quality home-section" aria-labelledby="home-quality-title">
      <div className="home-section-shell">
        <header className="home-display-heading home-quality-heading"><span className="home-heading-icon"><Target aria-hidden="true" /></span><div><h2 id="home-quality-title">LẤY CHẤT LƯỢNG LÀM GIÁ TRỊ CỐT LÕI</h2><p>THE IELTS SPACE CAM KẾT 100% ĐẦU RA</p></div></header>
        <div className="home-quality-grid">
          <div className="home-commitment-list">
            {HOME_COMMITMENTS.map((commitment) => <article data-home-reveal className="home-commitment-card" key={commitment.number}><div className="home-commitment-number"><MessageCircle aria-hidden="true" /><span>{commitment.number}</span></div><div><h3>{commitment.title}</h3><p>{commitment.description}</p></div></article>)}
          </div>
          <div className="home-quality-visual">
            <span className="home-quality-icon home-quality-trophy" aria-hidden="true"><Trophy /></span><span className="home-quality-icon home-quality-cap" aria-hidden="true"><GraduationCap /></span><span className="home-quality-icon home-quality-chart" aria-hidden="true"><ChartNoAxesCombined /></span>
            <img src={HOME_IMAGE_URLS.commitment} alt="Hai học viên đại diện cho cam kết chất lượng đầu ra IELTS" width="669" height="585" loading="lazy" decoding="async" />
          </div>
        </div>
      </div>
    </section>
  )
}
