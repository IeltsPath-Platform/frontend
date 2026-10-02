import { BrainCircuit, ChartNoAxesCombined, LibraryBig, Rocket, ScanSearch } from 'lucide-react'
import { ClassMascot } from '@/components/ClassMascot'
import { HOME_ORBIT_FEATURES } from '../homeData'

const FEATURE_ICONS = [BrainCircuit, ScanSearch, LibraryBig, ChartNoAxesCombined] as const

export function LearningOrbitSection() {
  return (
    <section id="home-features" className="home-learning home-section" aria-labelledby="home-features-title">
      <div className="home-section-shell">
        <header className="home-display-heading home-learning-heading">
          <span className="home-heading-icon"><Rocket aria-hidden="true" /></span>
          <div><h2 id="home-features-title">TỐI ƯU HÀNH TRÌNH HỌC <span>&amp; LUYỆN THI IELTS</span></h2><p>Một hệ sinh thái học tập được nghiên cứu và thiết kế hoàn toàn mới. Giúp mỗi người học tiến bộ theo cách riêng của mình.</p></div>
        </header>
        <div className="home-orbit-layout">
          <div className="home-orbit-line" aria-hidden="true" />
          <span className="home-orbit-star home-orbit-star-one" aria-hidden="true">✦</span>
          <span className="home-orbit-star home-orbit-star-two" aria-hidden="true">✦</span>
          <span className="home-orbit-star home-orbit-star-three" aria-hidden="true">✦</span>
          <div className="home-orbit-mascot"><ClassMascot size="lg" imageAlt="Khủng long mascot của The IELTS Space" /></div>
          {HOME_ORBIT_FEATURES.map((feature, index) => {
            const Icon = FEATURE_ICONS[index]
            return <article key={feature.id} data-home-reveal className={`home-orbit-card home-orbit-card-${feature.id}`}><header><Icon aria-hidden="true" /><span>{feature.eyebrow}</span></header><div><h3>{feature.title}</h3><p>{feature.description}</p></div></article>
          })}
        </div>
      </div>
    </section>
  )
}
